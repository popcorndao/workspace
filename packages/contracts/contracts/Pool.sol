// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./lib/AffiliateToken.sol";
import "./Defended.sol";

interface IERC20Metadata is IERC20 {
  function name() external view returns (string memory);

  function symbol() external view returns (string memory);

  function decimals() external view returns (uint8);
}

contract Pool is AffiliateToken, Ownable, ReentrancyGuard, Pausable, Defended {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  address public rewardsManager;

  uint256 constant BPS_DENOMINATOR = 10_000;
  uint256 constant SECONDS_PER_YEAR = 31_556_952;

  uint256 public withdrawalFee = 50;
  uint256 public managementFee = 200;
  uint256 public performanceFee = 2000;
  uint256 public poolTokenHWM = 1e18;
  uint256 public feesUpdatedAt;

  mapping(address => uint256) public blockLocks;

  event Deposit(address indexed from, uint256 deposit, uint256 poolTokens);
  event Withdrawal(address indexed to, uint256 amount);
  event WithdrawalFee(address indexed to, uint256 amount);
  event PerformanceFee(uint256 amount);
  event ManagementFee(uint256 amount);
  event WithdrawalFeeChanged(uint256 previousBps, uint256 newBps);
  event ManagementFeeChanged(uint256 previousBps, uint256 newBps);
  event PerformanceFeeChanged(uint256 previousBps, uint256 newBps);

  constructor(
    address token_,
    address yearnRegistry_,
    address rewardsManager_
  )
    public
    AffiliateToken(
      token_,
      yearnRegistry_,
      string(
        abi.encodePacked("Popcorn ", IERC20Metadata(token_).name(), " Pool")
      ),
      string(abi.encodePacked("pop", IERC20Metadata(token_).symbol()))
    )
  {
    require(address(yearnRegistry_) != address(0));
    require(address(token_) != address(0));
    require(rewardsManager_ != address(0));

    rewardsManager = rewardsManager_;
    feesUpdatedAt = block.timestamp;
  }

  modifier blockLocked() {
    require(blockLocks[msg.sender] < block.number, "Locked until next block");
    _;
  }

  function deposit(uint256 amount)
    public
    override
    defend
    nonReentrant
    whenNotPaused
    blockLocked
    returns (uint256)
  {
    require(amount <= token.balanceOf(msg.sender), "Insufficient balance");
    _lockForBlock(msg.sender);
    _takeFees();

    uint256 sharesBefore = balanceOf(msg.sender);
    super.deposit(amount);
    uint256 sharesAfter = balanceOf(msg.sender);
    uint256 shares = sharesAfter.sub(sharesBefore);

    emit Deposit(msg.sender, amount, shares);
    _reportPoolTokenHWM();
    return shares;
  }

  function depositFor(uint256 amount, address recipient)
    public
    defend
    nonReentrant
    whenNotPaused
    blockLocked
    returns (uint256)
  {
    require(amount <= token.balanceOf(msg.sender), "Insufficient balance");
    _lockForBlock(msg.sender);
    _takeFees();

    uint256 deposited = _deposit(msg.sender, address(this), amount, true);
    uint256 shares = _sharesForValue(deposited);
    _mint(recipient, shares);

    emit Deposit(recipient, amount, shares);
    _reportPoolTokenHWM();
    return shares;
  }

  function withdraw(uint256 amount)
    public
    override
    nonReentrant
    blockLocked
    returns (uint256)
  {
    require(amount <= balanceOf(msg.sender), "Insufficient pool token balance");

    _lockForBlock(msg.sender);
    _takeFees();

    uint256 feeShares = _calculateWithdrawalFee(amount);
    uint256 withdrawalShares = amount.sub(feeShares);
    uint256 fee = valueFor(feeShares);
    uint256 withdrawal = valueFor(withdrawalShares);

    _burn(msg.sender, amount);
    _withdraw(address(this), msg.sender, withdrawal, true);
    _withdraw(address(this), rewardsManager, fee, true);

    emit WithdrawalFee(rewardsManager, fee);
    emit Withdrawal(msg.sender, withdrawal);

    _reportPoolTokenHWM();

    return withdrawal;
  }

  function takeFees() external nonReentrant {
    _takeFees();
    _reportPoolTokenHWM();
  }

  function setWithdrawalFee(uint256 withdrawalFee_) external onlyOwner {
    require(withdrawalFee != withdrawalFee_, "Same withdrawalFee");
    uint256 _previousWithdrawalFee = withdrawalFee;
    withdrawalFee = withdrawalFee_;
    emit WithdrawalFeeChanged(_previousWithdrawalFee, withdrawalFee);
  }

  function setManagementFee(uint256 managementFee_) external onlyOwner {
    require(managementFee != managementFee_, "Same managementFee");
    uint256 _previousManagementFee = managementFee;
    managementFee = managementFee_;
    emit ManagementFeeChanged(_previousManagementFee, managementFee);
  }

  function setPerformanceFee(uint256 performanceFee_) external onlyOwner {
    require(performanceFee != performanceFee_, "Same performanceFee");
    uint256 _previousPerformanceFee = performanceFee;
    performanceFee = performanceFee_;
    emit PerformanceFeeChanged(_previousPerformanceFee, performanceFee);
  }

  function withdrawAccruedFees() external onlyOwner {
    uint256 balance = balanceOf(address(this));
    _burn(address(this), balance);
    _withdraw(address(this), rewardsManager, valueFor(balance), true);
  }

  function pricePerPoolToken() public view returns (uint256) {
    return valueFor(1e18);
  }

  function totalValue() public view returns (uint256) {
    return totalVaultBalance(address(this));
  }

  function valueFor(uint256 poolTokens) public view returns (uint256) {
    return _shareValue(poolTokens);
  }

  function _reportPoolTokenHWM() internal {
    if (pricePerPoolToken() > poolTokenHWM) {
      poolTokenHWM = pricePerPoolToken();
    }
  }

  function _issuePoolTokensForAmount(address to, uint256 amount)
    internal
    returns (uint256)
  {
    uint256 tokens = _sharesForValue(amount);
    return _issuePoolTokens(to, tokens);
  }

  function _takeManagementFee() internal {
    uint256 period = block.timestamp.sub(feesUpdatedAt);
    uint256 fee = (managementFee.mul(totalValue()).mul(period)).div(
      SECONDS_PER_YEAR.mul(BPS_DENOMINATOR)
    );
    if (fee > 0) {
      _issuePoolTokensForAmount(address(this), fee);
      emit ManagementFee(fee);
    }
  }

  function _takePerformanceFee() internal {
    if (pricePerPoolToken() > poolTokenHWM) {
      uint256 changeInPricePerToken = pricePerPoolToken().sub(poolTokenHWM);
      uint256 fee = performanceFee
      .mul(changeInPricePerToken)
      .mul(totalSupply())
      .div(BPS_DENOMINATOR)
      .div(1e18);
      _issuePoolTokensForAmount(address(this), fee);
      emit PerformanceFee(fee);
    }
  }

  function _takeFees() internal {
    _takeManagementFee();
    _takePerformanceFee();
    feesUpdatedAt = block.timestamp;
  }

  function _calculateWithdrawalFee(uint256 withdrawalAmount)
    internal
    view
    returns (uint256)
  {
    return withdrawalAmount.mul(withdrawalFee).div(BPS_DENOMINATOR);
  }

  function _issuePoolTokens(address to, uint256 amount)
    internal
    returns (uint256)
  {
    _mint(to, amount);
    return amount;
  }

  function pauseContract() external onlyOwner {
    _pause();
  }

  function unpauseContract() external onlyOwner {
    _unpause();
  }

  function _lockForBlock(address account) internal {
    blockLocks[account] = block.number;
  }

  function transfer(address recipient, uint256 amount)
    public
    override
    blockLocked
    returns (bool)
  {
    return super.transfer(recipient, amount);
  }

  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) public override blockLocked returns (bool) {
    return super.transferFrom(sender, recipient, amount);
  }
}
