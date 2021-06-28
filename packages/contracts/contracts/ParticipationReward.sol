pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Governed.sol";

contract ParticipationReward is Governed, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */
  enum VaultStatus {
    Init,
    Open
  }

  struct Vault {
    VaultStatus status;
    uint256 endTime;
    uint256 shares;
    uint256 tokenBalance;
    mapping(address => uint256) shareBalances;
  }

  IERC20 public immutable POP;
  uint256 public rewardBudget;
  uint256 public rewardBalance;
  uint256 public totalVaultsBudget;
  mapping(bytes32 => Vault) public vaults;
  mapping(address => bytes32[]) public userVaults; 

  /* ========== EVENTS ========== */
  event RewardBudgetChanged(uint256 amount);
  event VaultInitialized(bytes32 vaultId);
  event VaultOpened(bytes32 vaultId);
  event VaultClosed(bytes32 vaultId);
  event RewardClaimed(bytes32 vaultId, address account_, uint256 amount);
  event RewardsClaimed(address account_, uint256 amount);
  event SharesAdded(bytes32 vaultId_, address account_, uint256 shares_);
  event RewardBalanceIncreased(address account, uint256 amount);

  /* ========== CONSTRUCTOR ========== */

  constructor(IERC20 _pop, address _governance) Governed(_governance) {
    POP = _pop;
  }

  /* ========== VIEWS ========== */

  function hasClaim(bytes32 vaultId_, address beneficiary_)
    public
    view
    vaultExists(vaultId_)
    returns (bool)
  {
    return vaults[vaultId_].shareBalances[beneficiary_] > 0;
  }

  function getVaultStatus(bytes32 vaultId_)
    external
    view
    returns (VaultStatus)
  {
    return vaults[vaultId_].status;
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice Initializes a vault for voting claims
   * @param vaultId_ Bytes32
   * @param endTime_ Unix timestamp in seconds after which a vault can be closed
   * @dev There must be enough funds in this contract to support opening another vault
   */
  function _initializeVault(bytes32 vaultId_, uint256 endTime_)
    internal
    returns (bytes32)
  {
    require(vaults[vaultId_].endTime == 0, "Vault must not exist");
    require(endTime_ > block.timestamp, "end must be in the future");

    uint256 expectedVaultBudget = totalVaultsBudget.add(rewardBudget);
    if (expectedVaultBudget > rewardBalance || rewardBalance == 0) {
      return "";
    }

    totalVaultsBudget = expectedVaultBudget;

    Vault storage vault = vaults[vaultId_];
    vault.endTime = endTime_;
    vault.tokenBalance = rewardBudget;

    emit VaultInitialized(vaultId_);
    return vaultId_;
  }

  /**
   * @notice Open a vault it can receive rewards and accept claims
   * @dev Vault must be in an initialized state
   * @param vaultId_ Vault ID in bytes32
   */
  function _openVault(bytes32 vaultId_) internal vaultExists(vaultId_) {
    require(
      vaults[vaultId_].status == VaultStatus.Init,
      "Vault must be initialized"
    );
    require(
      vaults[vaultId_].endTime <= block.timestamp,
      "wait till endTime is over"
    );

    vaults[vaultId_].status = VaultStatus.Open;

    emit VaultOpened(vaultId_);
  }

  function _addShares(
    bytes32 vaultId_,
    address account_,
    uint256 shares_
  ) internal vaultExists(vaultId_) {
    require(
      vaults[vaultId_].status == VaultStatus.Init,
      "Vault must be initialized"
    );
    vaults[vaultId_].shares = vaults[vaultId_].shares.add(shares_);
    vaults[vaultId_].shareBalances[account_] = shares_;

    userVaults[account_].push(vaultId_);

    emit SharesAdded(vaultId_, account_, shares_);
  }

  //TODO delete all flag?
  function claimReward(uint256 index_)
    external
    nonReentrant
    vaultExists(vaultId_)
  {
    //TODO add implementation with only index
    require(vaults[vaultId_].status == VaultStatus.Open, "vault is not open");
    uint256 reward = _claimVaultReward(index_, msg.sender);
    require(reward <= rewardBalance, "not enough funds for payout");

    totalVaultsBudget = totalVaultsBudget.sub(reward);
    rewardBalance = rewardBalance.sub(reward);

    POP.safeTransfer(msg.sender, reward);

    emit RewardsClaimed(msg.sender, reward);
  }

  //TODO delete all flag?
  function claimRewards(
    bytes32[] calldata vaultIds_,
    uint256[] calldata indices_,
    uint8 deleteArray,
  ) external nonReentrant {
    require(
      vaultIds_.length < 20 || indices_.length < 20,
      "claiming too many vaults"
    );
    require(
      vaultIds_.length == indices_.length,
      "vaults and indices must match"
    );
    uint256 total;

    for (uint256 i = 0; i < vaultIds_.length; i++) {
      if (vaults[vaultIds_[i]].status == VaultStatus.Open) {
        total = total.add(
          _claimVaultReward(vaultIds_[i], indices_[i], msg.sender)
        );
      }
    }

    require(total > 0, "no rewards");
    require(total <= rewardBalance, "not enough funds for payout");

    totalVaultsBudget = totalVaultsBudget.sub(total);
    rewardBalance = rewardBalance.sub(total);

    POP.safeTransfer(msg.sender, total);

    emit RewardsClaimed(msg.sender, total);
  }

  function _userVaultLength(address account_) internal view returns (uint256) {
    if (userVaults[account_][0] == "") {
      return 0;
    }
    return userVaults[account_].length;
  }

  function _claimVaultReward(
    bytes32 vaultId_,
    uint256 index_,
    address account
  ) internal returns (uint256) {
    uint256 userShares = vaults[vaultId_].shareBalances[account];
    if (userShares > 0) {
      uint256 reward = vaults[vaultId_].tokenBalance.mul(userShares).div(
        vaults[vaultId_].shares
      );
      vaults[vaultId_].tokenBalance = vaults[vaultId_].tokenBalance.sub(reward);
      delete userVaults[account][index_];
      return reward;
    }
    return 0;
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function setRewardsBudget(uint256 amount) external onlyGovernance {
    require(amount > 0, "must be larger 0");
    rewardBudget = amount;
    emit RewardBudgetChanged(amount);
  }

  function contributeReward(uint256 amount) external {
    require(amount > 0, "must be larger 0");
    POP.safeTransferFrom(msg.sender, address(this), amount);
    rewardBalance = rewardBalance.add(amount);
    emit RewardBalanceIncreased(msg.sender, amount);
  }

  /* ========== MODIFIERS ========== */

  modifier vaultExists(bytes32 vaultId_) {
    require(vaults[vaultId_].endTime > 0, "Uninitialized vault slot");
    _;
  }
}