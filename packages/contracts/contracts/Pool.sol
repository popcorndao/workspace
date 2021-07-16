// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Defended.sol";
import "./Interfaces/Integrations/YearnVault.sol";
import "./Interfaces/Integrations/CurveContracts.sol";

contract Pool is ERC20, Ownable, ReentrancyGuard, Pausable, Defended {
  using SafeMath for uint256;
  using SafeERC20 for ThreeCrv;
  using SafeERC20 for CrvLPToken;
  using SafeERC20 for YearnVault;

  ThreeCrv public threeCrv;
  CrvLPToken public crvLPToken;
  YearnVault public yearnVault;
  CurveAddressProvider public curveAddressProvider;
  CurveRegistry public curveRegistry;
  CurveMetapool public curveMetapool;
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
    address threeCrv_,
    address yearnVault_,
    address curveAddressProvider_,
    address rewardsManager_
  ) ERC20("Popcorn 3Crv Pool", "pop3Crv") {
    require(address(threeCrv_) != address(0));
    require(address(yearnVault_) != address(0));
    require(address(curveAddressProvider_) != address(0));
    require(rewardsManager_ != address(0));

    threeCrv = ThreeCrv(threeCrv_);
    yearnVault = YearnVault(yearnVault_);
    crvLPToken = CrvLPToken(yearnVault.token());
    curveAddressProvider = CurveAddressProvider(curveAddressProvider_);
    curveRegistry = CurveRegistry(curveAddressProvider.get_registry());
    curveMetapool = CurveMetapool(
      curveRegistry.get_pool_from_lp_token(address(crvLPToken))
    );
    rewardsManager = rewardsManager_;
    feesUpdatedAt = block.timestamp;
  }

  modifier blockLocked() {
    require(blockLocks[msg.sender] < block.number, "Locked until next block");
    _;
  }

  function deposit(uint256 amount)
    external
    defend
    nonReentrant
    whenNotPaused
    blockLocked
    returns (uint256)
  {
    require(amount <= threeCrv.balanceOf(msg.sender), "Insufficient balance");
    _lockForBlock(msg.sender);
    _takeFees();

    uint256 poolTokens = _issuePoolTokensForAmount(msg.sender, amount);
    emit Deposit(msg.sender, amount, poolTokens);

    threeCrv.safeTransferFrom(msg.sender, address(this), amount);
    uint256 crvLPTokenAmount = _sendToCurve(amount);
    _sendToYearn(crvLPTokenAmount);

    _reportPoolTokenHWM();
    return balanceOf(msg.sender);
  }

  function withdraw(uint256 amount)
    external
    nonReentrant
    blockLocked
    returns (uint256, uint256)
  {
    require(amount <= balanceOf(msg.sender), "Insufficient pool token balance");

    _lockForBlock(msg.sender);
    _takeFees();

    uint256 threeCrvAmount = _withdrawPoolTokens(msg.sender, amount);
    uint256 fee = _calculateWithdrawalFee(threeCrvAmount);
    uint256 withdrawal = threeCrvAmount.sub(fee);

    _transferWithdrawalFee(fee);
    _transferWithdrawal(withdrawal);

    _reportPoolTokenHWM();

    return (withdrawal, fee);
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
    uint256 tokenBalance = balanceOf(address(this));
    uint256 threeCrvAmount = _withdrawPoolTokens(address(this), tokenBalance);
    _transferThreeCrv(rewardsManager, threeCrvAmount);
  }

  function pricePerPoolToken() public view returns (uint256) {
    return valueFor(1e18);
  }

  function totalValue() public view returns (uint256) {
    return _totalValue();
  }

  function valueFor(uint256 poolTokens) public view returns (uint256) {
    uint256 yvShares = _yearnSharesFor(poolTokens);
    uint256 shareValue = _yearnShareValue(yvShares);
    return shareValue;
  }

  function _totalValue() internal view returns (uint256) {
    uint256 yvShareBalance = yearnVault.balanceOf(address(this));
    return _yearnShareValue(yvShareBalance);
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
    uint256 tokens = 0;
    if (totalSupply() > 0) {
      tokens = amount.mul(1e18).div(pricePerPoolToken());
    } else {
      tokens = amount;
    }
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

  function _transferWithdrawalFee(uint256 fee) internal {
    _transferThreeCrv(rewardsManager, fee);
    emit WithdrawalFee(rewardsManager, fee);
  }

  function _transferWithdrawal(uint256 withdrawal) internal {
    _transferThreeCrv(msg.sender, withdrawal);
    emit Withdrawal(msg.sender, withdrawal);
  }

  function _transferThreeCrv(address to, uint256 amount) internal {
    threeCrv.safeIncreaseAllowance(address(this), amount);
    threeCrv.safeTransferFrom(address(this), to, amount);
  }

  function _poolShareFor(uint256 poolTokenAmount)
    internal
    view
    returns (uint256)
  {
    if (totalSupply() == 0) {
      return 1e18;
    }
    return poolTokenAmount.mul(1e18).div(totalSupply());
  }

  function _issuePoolTokens(address to, uint256 amount)
    internal
    returns (uint256)
  {
    _mint(to, amount);
    return amount;
  }

  function _burnPoolTokens(address from, uint256 amount)
    internal
    returns (uint256)
  {
    _burn(from, amount);
    return amount;
  }

  function _withdrawPoolTokens(address fromAddress, uint256 amount)
    internal
    returns (uint256)
  {
    uint256 yvShareWithdrawal = _yearnSharesFor(amount);
    _burnPoolTokens(fromAddress, amount);
    uint256 crvLPTokenAmount = _withdrawFromYearn(yvShareWithdrawal);
    return _withdrawFromCurve(crvLPTokenAmount);
  }

  function _sendToCurve(uint256 amount) internal returns (uint256) {
    threeCrv.safeIncreaseAllowance(address(curveMetapool), amount);
    uint256[2] memory curveDepositAmounts = [
      0, // USDX
      amount // 3Crv
    ];
    return curveMetapool.add_liquidity(curveDepositAmounts, 0);
  }

  function _crvBalance() internal view returns (uint256) {
    return crvLPToken.balanceOf(address(this));
  }

  function _withdrawFromCurve(uint256 crvLPTokenAmount)
    internal
    returns (uint256)
  {
    crvLPToken.safeIncreaseAllowance(address(curveMetapool), crvLPTokenAmount);
    return curveMetapool.remove_liquidity_one_coin(crvLPTokenAmount, 1, 0);
  }

  function _sendToYearn(uint256 amount) internal returns (uint256) {
    crvLPToken.safeIncreaseAllowance(address(yearnVault), amount);
    uint256 yearnBalanceBefore = _yearnBalance();
    yearnVault.deposit(amount);
    uint256 yearnBalanceAfter = _yearnBalance();
    return yearnBalanceAfter.sub(yearnBalanceBefore);
  }

  function _yearnBalance() internal view returns (uint256) {
    return yearnVault.balanceOf(address(this));
  }

  function _yearnSharesFor(uint256 poolTokenAmount)
    internal
    view
    returns (uint256)
  {
    return _yearnBalance().mul(_poolShareFor(poolTokenAmount)).div(1e18);
  }

  function _withdrawFromYearn(uint256 yvShares) internal returns (uint256) {
    uint256 crvBalanceBefore = _crvBalance();
    yearnVault.withdraw(yvShares);
    uint256 crvBalanceAfter = _crvBalance();
    return crvBalanceAfter.sub(crvBalanceBefore);
  }

  function _yearnShareValue(uint256 yvShares) internal view returns (uint256) {
    uint256 crvLPTokens = yearnVault.getPricePerFullShare().mul(yvShares).div(
      1e18
    );
    uint256 virtualPrice = curveMetapool.get_virtual_price();
    return crvLPTokens.mul(virtualPrice).div(1e18);
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
