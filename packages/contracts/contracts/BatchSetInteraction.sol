// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Owned.sol";
import "./Interfaces/Integrations/YearnVault.sol";
import "./Interfaces/Integrations/CurveContracts.sol";
import "./Interfaces/Integrations/BasicIssuanceModule.sol";
import "./Interfaces/Integrations/ISetToken.sol";

contract BatchSetInteraction is Owned {
  using SafeMath for uint256;
  using SafeERC20 for ThreeCrv;
  using SafeERC20 for CrvLPToken;
  using SafeERC20 for YearnVault;
  using SafeERC20 for IERC20;

  struct UnderlyingToken {
    IERC20 crvToken;
    uint256 allocation;
    YearnVault yToken;
    CurveMetapool curveMetaPool;
  }

  struct MintBatch {
    uint256 unclaimedShares;
    uint256 suppliedToken;
    uint256 claimableToken;
    mapping(address => uint256) shareBalance;
    uint8 claimable; //either 0 | 1
  }

  struct RedeemBatch {
    uint256 unclaimedShares;
    uint256 suppliedToken;
    uint256[] claimableToken;
    mapping(address => uint256) shareBalance;
    uint8 claimable;
  }

  /* ========== STATE VARIABLES ========== */

  ThreeCrv public threeCrv;
  CurveAddressProvider public curveAddressProvider;
  BasicIssuanceModule public setBasicIssuanceModule;
  ISetToken public setToken;
  UnderlyingToken[] public underlyingToken;

  mapping(address => bytes32[]) public batchesOfAccount;
  mapping(bytes32 => MintBatch) public mintBatches;
  mapping(bytes32 => RedeemBatch) public redeemBatches;

  uint256 public lastMintedAt;
  uint256 public lastRedeemedAt;
  bytes32 public currentMintBatchId;
  bytes32 public currentRedeemBatchId;
  uint256 public batchCooldown;
  uint256 public mintThreshold;
  uint256 public redeemThreshold;

  /* ========== EVENTS ========== */

  event Deposit(address indexed from, uint256 deposit);
  event Withdrawal(address indexed to, uint256 amount);
  event BatchMinted(uint256 amount);
  event BatchRedeemed(uint256 amount);
  event Claimed(address account, uint256 amount);
  event TokenSetAdded(ISetToken setToken);

  /* ========== CONSTRUCTOR ========== */

  constructor(
    ThreeCrv threeCrv_,
    ISetToken setToken_,
    BasicIssuanceModule basicIssuanceModule_,
    uint256 batchCooldown_,
    uint256 mintThreshold_,
    uint256 redeemThreshold_
  ) Owned(msg.sender) {
    require(address(threeCrv_) != address(0));
    require(address(setToken_) != address(0));
    require(address(basicIssuanceModule_) != address(0));
    threeCrv = threeCrv_;
    setToken = setToken_;
    setBasicIssuanceModule = basicIssuanceModule_;
    batchCooldown = batchCooldown_;
    currentMintBatchId = _generateNextBatchId(bytes32(0));
    currentRedeemBatchId = _generateNextBatchId(bytes32(0));
    mintThreshold = mintThreshold_;
    redeemThreshold = redeemThreshold_;
    lastMintedAt = block.timestamp;
    lastRedeemedAt = block.timestamp;
  }

  /* ========== VIEWS ========== */

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice deposits funds for batch set minting
   * @param  amount_ amount of 3crv to use for minting
   */
  //TODO should it be possible to make multiple yearn tokenSets?
  function depositForMint(uint256 amount_) external {
    require(threeCrv.balanceOf(msg.sender) > 0, "insufficent balance");
    threeCrv.transferFrom(msg.sender, address(this), amount_);
    _deposit(amount_, currentMintBatchId, 0);
  }

  /**
   * @notice deposits funds for batch reedeming of a set
   * @param  amount_ amount of setToken to be redeemed
   */
  function depositForRedeem(uint256 amount_) external {
    require(setToken.balanceOf(msg.sender) > 0, "insufficient balance");
    setToken.transferFrom(msg.sender, address(this), amount_);
    _deposit(amount_, currentRedeemBatchId, 1);
  }

  /**
   * @notice claims funds from batch
   * @param  batchId_ id of batch to claim from
   */
  function claimMinted(bytes32 batchId_) external {
    MintBatch storage batch = mintBatches[batchId_];
    require(batch.claimable == 1, "not minted yet");
    uint256 shares = batch.shareBalance[msg.sender];
    require(shares <= batch.unclaimedShares, "claiming too many shares");

    uint256 claimedToken = _claim(
      shares,
      batch.unclaimedShares,
      batch.claimableToken,
      setToken
    );

    batch.claimableToken = batch.claimableToken.sub(claimedToken);
    batch.unclaimedShares = batch.unclaimedShares.sub(shares);
    batch.shareBalance[msg.sender] = 0;

    emit Claimed(msg.sender, shares);
  }

  /**
   * @notice claims funds from batch
   * @param  batchId_ id of batch to claim from
   */
  function claimRedeemed(bytes32 batchId_) external {
    RedeemBatch storage batch = redeemBatches[batchId_];
    require(batch.claimable == 1, "not redeemed yet");
    uint256 shares = batch.shareBalance[msg.sender];
    require(shares <= batch.unclaimedShares, "claiming too many shares");

    for (uint256 i; i < batch.claimableToken.length; i++) {
      uint256 claimedToken = _claim(
        shares,
        batch.unclaimedShares,
        batch.claimableToken[i],
        underlyingToken[i].yToken
      );
      batch.claimableToken[i] = batch.claimableToken[i].sub(claimedToken);
    }

    batch.unclaimedShares = batch.unclaimedShares.sub(shares);
    batch.shareBalance[msg.sender] = 0;

    emit Claimed(msg.sender, shares);
  }

  function batchMint(uint256 amount_) external {
    MintBatch storage batch = mintBatches[currentMintBatchId];
    require(
      (block.timestamp.sub(lastMintedAt) >= batchCooldown) ||
        (batch.suppliedToken >= mintThreshold),
      "can not execute batch action yet"
    );
    require(batch.claimable == 0, "already minted");
    require(
      threeCrv.balanceOf(address(this)) >= batch.suppliedToken,
      "insufficient balance"
    );

    for (uint256 i; i < underlyingToken.length; i++) {
      uint256 allocation = batch
      .suppliedToken
      .mul(underlyingToken[i].allocation)
      .div(100e18);
      uint256 crvLPTokenAmount = _sendToCurve(
        allocation,
        underlyingToken[i].curveMetaPool
      );
      _sendToYearn(
        underlyingToken[i].crvToken.balanceOf(address(this)),
        underlyingToken[i].crvToken,
        underlyingToken[i].yToken
      );
      underlyingToken[i].yToken.approve(
        address(setBasicIssuanceModule),
        underlyingToken[i].yToken.balanceOf(address(this))
      );
    }
    uint256 oldBalance = setToken.balanceOf(address(this));
    setBasicIssuanceModule.issue(setToken, amount_, address(this));
    batch.claimableToken = setToken.balanceOf(address(this)).sub(oldBalance);
    batch.suppliedToken = 0;
    batch.claimable = 1;

    lastMintedAt = block.timestamp;
    currentMintBatchId = _generateNextBatchId(currentMintBatchId);

    emit BatchMinted(amount_);
  }

  function batchRedeem() external {
    RedeemBatch storage batch = redeemBatches[currentRedeemBatchId];
    require(
      (block.timestamp.sub(lastMintedAt) >= batchCooldown) ||
        (batch.suppliedToken >= redeemThreshold),
      "can not execute batch action yet"
    );
    require(batch.claimable == 0, "already minted");
    require(
      setToken.balanceOf(address(this)) >= batch.suppliedToken,
      "insufficient balance"
    );

    setToken.approve(address(setBasicIssuanceModule), batch.suppliedToken);

    for (uint256 i; i < underlyingToken.length; i++) {
      batch.claimableToken.push(
        underlyingToken[i].yToken.balanceOf(address(this))
      );
    }
    setBasicIssuanceModule.redeem(setToken, batch.suppliedToken, address(this));

    for (uint256 i; i < underlyingToken.length; i++) {
      batch.claimableToken[i] = underlyingToken[i]
      .yToken
      .balanceOf(address(this))
      .sub(batch.claimableToken[i]);
    }

    emit BatchRedeemed(batch.suppliedToken);

    batch.suppliedToken = 0;
    batch.claimable = 1;

    lastRedeemedAt = block.timestamp;
    currentRedeemBatchId = _generateNextBatchId(currentRedeemBatchId);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function _deposit(
    uint256 amount_,
    bytes32 currentBatchId,
    uint8 batchType
  ) internal {
    if (batchType == 0) {
      MintBatch storage batch = mintBatches[currentBatchId];
      batch.suppliedToken = batch.suppliedToken.add(amount_);
      batch.unclaimedShares = batch.unclaimedShares.add(amount_);
      batch.shareBalance[msg.sender] = batch.shareBalance[msg.sender].add(
        amount_
      );
    } else {
      RedeemBatch storage batch = redeemBatches[currentBatchId];
      batch.suppliedToken = batch.suppliedToken.add(amount_);
      batch.unclaimedShares = batch.unclaimedShares.add(amount_);
      batch.shareBalance[msg.sender] = batch.shareBalance[msg.sender].add(
        amount_
      );
    }
    batchesOfAccount[msg.sender].push(currentBatchId);
    emit Deposit(msg.sender, amount_);
  }

  function _claim(
    uint256 shares_,
    uint256 unclaimedShares_,
    uint256 batchBalance_,
    IERC20 token_
  ) internal returns (uint256) {
    uint256 claimableToken = batchBalance_.mul(shares_).div(unclaimedShares_);
    token_.approve(address(this), claimableToken);
    token_.safeTransferFrom(address(this), msg.sender, claimableToken);
    return claimableToken;
  }

  function _sendToCurve(uint256 amount_, CurveMetapool curveMetapool_)
    internal
    returns (uint256)
  {
    threeCrv.approve(address(curveMetapool_), amount_);
    uint256[2] memory curveDepositAmounts = [
      0, // USDX
      amount_ // 3Crv
    ];
    return curveMetapool_.add_liquidity(curveDepositAmounts, 0);
  }

  function _sendToYearn(
    uint256 amount_,
    IERC20 yToken_,
    YearnVault yearnVault_
  ) internal returns (uint256) {
    yToken_.safeIncreaseAllowance(address(yearnVault_), amount_);
    yearnVault_.deposit(amount_);
    return amount_;
  }

  function _generateNextBatchId(bytes32 currentBatchId_)
    internal
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(block.timestamp, currentBatchId_));
  }

  /* ========== SETTER ========== */

  function setUnderylingToken(UnderlyingToken[] calldata underlyingToken_)
    external
    onlyOwner
  {
    for (uint256 i; i < underlyingToken_.length; i++) {
      underlyingToken.push(underlyingToken_[i]);
    }
  }

  function setBatchCooldown(uint256 cooldown_) external onlyOwner {
    batchCooldown = cooldown_;
  }

  function setMintThreshold(uint256 threshold_) external onlyOwner {
    mintThreshold = threshold_;
  }

  function setRedeemThreshold(uint256 threshold_) external onlyOwner {
    redeemThreshold = threshold_;
  }

  /* ========== MODIFIER ========== */
}
