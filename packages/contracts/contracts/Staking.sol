// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Interfaces/IStaking.sol";
import "./Owned.sol";
import "./Interfaces/IRewardsManager.sol";
import "./Defended.sol";

contract Staking is IStaking, Owned, ReentrancyGuard, Defended {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */

  struct LockedBalance {
    uint256 _balance;
    uint256 _duration;
    uint256 _end;
  }

  IERC20 public immutable POP;
  address public RewardsManager;
  uint256 public periodFinish = 0;
  uint256 public rewardRate = 0;
  uint256 public rewardsDuration = 7 days;
  uint256 public lastUpdateTime;
  uint256 public rewardPerTokenStored;
  uint256 public totalLocked;
  mapping(address => uint256) public voiceCredits;
  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;
  mapping(address => LockedBalance) public lockedBalances;

  /* ========== EVENTS ========== */

  event StakingDeposited(address _address, uint256 amount);
  event StakingWithdrawn(address _address, uint256 amount);
  event RewardPaid(address _address, uint256 reward);
  event RewardAdded(uint256 reward);
  event RewardsManagerChanged(address _rewardsManager);

  /* ========== CONSTRUCTOR ========== */

  constructor(IERC20 _pop) Owned(msg.sender) {
    POP = _pop;
  }

  /* ========== VIEWS ========== */

  function getVoiceCredits(address _address)
    public
    view
    override
    returns (uint256)
  {
    uint256 _currentTime = block.timestamp;
    if (
      lockedBalances[_address]._end == 0 ||
      lockedBalances[_address]._end < _currentTime
    ) {
      return 0;
    }
    uint256 timeTillEnd = (
      (lockedBalances[_address]._end.sub(_currentTime)).div(1 hours)
    )
    .mul(1 hours);
    uint256 slope = voiceCredits[_address].div(
      lockedBalances[_address]._duration
    );
    return timeTillEnd.mul(slope);
  }

  function getWithdrawableBalance(address _address)
    public
    view
    override
    returns (uint256)
  {
    uint256 _withdrawable = 0;
    uint256 _currentTime = block.timestamp;
    if (lockedBalances[_address]._end <= _currentTime) {
      _withdrawable = lockedBalances[_address]._balance;
    }
    return _withdrawable;
  }

  function balanceOf(address _address) external view returns (uint256) {
    return lockedBalances[_address]._balance;
  }

  function lastTimeRewardApplicable() public view returns (uint256) {
    return Math.min(block.timestamp, periodFinish);
  }

  function rewardPerToken() public view returns (uint256) {
    if (totalLocked == 0) {
      return rewardPerTokenStored;
    }
    return
      rewardPerTokenStored.add(
        lastTimeRewardApplicable()
          .sub(lastUpdateTime)
          .mul(rewardRate)
          .mul(1e18)
          .div(totalLocked)
      );
  }

  function earned(address account) public view returns (uint256) {
    return
      lockedBalances[account]
        ._balance
        .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(rewards[account]);
  }

  function getRewardForDuration() external view returns (uint256) {
    return rewardRate.mul(rewardsDuration);
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  function stake(uint256 amount, uint256 lengthOfTime)
    external
    override
    nonReentrant
    defend
    updateReward(msg.sender)
  {
    uint256 _currentTime = block.timestamp;
    require(amount > 0, "amount must be greater than 0");
    require(lengthOfTime >= 7 days, "must lock tokens for at least 1 week");
    require(
      lengthOfTime <= 365 * 4 days,
      "must lock tokens for less than/equal to  4 year"
    );
    require(POP.balanceOf(msg.sender) >= amount, "insufficient balance");
    require(lockedBalances[msg.sender]._balance == 0, "withdraw balance first");

    POP.safeTransferFrom(msg.sender, address(this), amount);

    totalLocked = totalLocked.add(amount);
    _lockTokens(amount, lengthOfTime);
    _recalculateVoiceCredits();
    emit StakingDeposited(msg.sender, amount);
  }

  function increaseLock(uint256 lengthOfTime) external {
    uint256 _currentTime = block.timestamp;
    require(lengthOfTime >= 7 days, "must lock tokens for at least 1 week");
    require(
      lengthOfTime <= 365 * 4 days,
      "must lock tokens for less than/equal to  4 year"
    );
    require(lockedBalances[msg.sender]._balance > 0, "no lockedBalance exists");
    require(
      lockedBalances[msg.sender]._end > _currentTime,
      "withdraw balance first"
    );
    lockedBalances[msg.sender]._duration = lockedBalances[msg.sender]
    ._duration
    .add(lengthOfTime);
    lockedBalances[msg.sender]._end = lockedBalances[msg.sender]._end.add(
      lengthOfTime
    );
  }

  function increaseStake(uint256 amount) external {
    uint256 _currentTime = block.timestamp;
    require(amount > 0, "amount must be greater than 0");
    require(POP.balanceOf(msg.sender) >= amount, "insufficient balance");
    require(lockedBalances[msg.sender]._balance > 0, "no lockedBalance exists");
    require(
      lockedBalances[msg.sender]._end > _currentTime,
      "withdraw balance first"
    );
    POP.safeTransferFrom(msg.sender, address(this), amount);
    totalLocked = totalLocked.add(amount);
    lockedBalances[msg.sender]._balance = lockedBalances[msg.sender]
    ._balance
    .add(amount);
    _recalculateVoiceCredits();
  }

  function withdraw(uint256 amount)
    public
    override
    nonReentrant
    updateReward(msg.sender)
  {
    require(amount > 0, "amount must be greater than 0");
    require(lockedBalances[msg.sender]._balance > 0, "insufficient balance");
    require(amount <= getWithdrawableBalance(msg.sender));

    POP.approve(address(this), amount);
    POP.safeTransferFrom(address(this), msg.sender, amount);

    totalLocked = totalLocked.sub(amount);
    _clearWithdrawnFromLocked(amount);
    _recalculateVoiceCredits();
    emit StakingWithdrawn(msg.sender, amount);
  }

  function getReward() public nonReentrant updateReward(msg.sender) {
    uint256 reward = rewards[msg.sender];
    if (reward > 0) {
      rewards[msg.sender] = 0;
      POP.safeTransfer(msg.sender, reward);
      emit RewardPaid(msg.sender, reward);
    }
  }

  function exit(uint256 amount) external {
    withdraw(amount);
    getReward();
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  // todo: multiply voice credits by 10000 to deal with exponent math
  function _recalculateVoiceCredits() internal {
    voiceCredits[msg.sender] = lockedBalances[msg.sender]
    ._balance
    .mul(lockedBalances[msg.sender]._duration)
    .div(365 days * 4);
  }

  function _lockTokens(uint256 amount, uint256 lengthOfTime) internal {
    uint256 _currentTime = block.timestamp;
    if (_currentTime > lockedBalances[msg.sender]._end) {
      lockedBalances[msg.sender] = LockedBalance({
        _balance: lockedBalances[msg.sender]._balance.add(amount),
        _duration: lengthOfTime,
        _end: _currentTime.add(lengthOfTime)
      });
    } else {
      lockedBalances[msg.sender] = LockedBalance({
        _balance: lockedBalances[msg.sender]._balance.add(amount),
        _duration: lockedBalances[msg.sender]._duration.add(lengthOfTime),
        _end: lockedBalances[msg.sender]._end.add(lengthOfTime)
      });
    }
  }

  function _clearWithdrawnFromLocked(uint256 _amount) internal {
    uint256 _currentTime = block.timestamp;
    if (lockedBalances[msg.sender]._end <= _currentTime) {
      if (_amount == lockedBalances[msg.sender]._balance) {
        delete lockedBalances[msg.sender];
      }
      if (_amount < lockedBalances[msg.sender]._balance) {
        lockedBalances[msg.sender]._balance = lockedBalances[msg.sender]
        ._balance
        .sub(_amount);
      }
    }
  }

  function setRewardsManager(address _rewardsManager) external onlyOwner {
    RewardsManager = _rewardsManager;
    emit RewardsManagerChanged(_rewardsManager);
  }

  function notifyRewardAmount(uint256 reward)
    external
    override
    updateReward(address(0))
  {
    require(msg.sender == RewardsManager || msg.sender == owner, "Not allowed");
    if (block.timestamp >= periodFinish) {
      rewardRate = reward.div(rewardsDuration);
    } else {
      uint256 remaining = periodFinish.sub(block.timestamp);
      uint256 leftover = remaining.mul(rewardRate);
      rewardRate = reward.add(leftover).div(rewardsDuration);
    }

    // Ensure the provided reward amount is not more than the balance in the contract.
    // This keeps the reward rate in the right range, preventing overflows due to
    // very high values of rewardRate in the earned and rewardsPerToken functions;
    // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
    uint256 balance = POP.balanceOf(address(this));
    require(
      rewardRate <= balance.div(rewardsDuration),
      "Provided reward too high"
    );

    lastUpdateTime = block.timestamp;
    periodFinish = block.timestamp.add(rewardsDuration);
    emit RewardAdded(reward);
  }

  // End rewards emission earlier
  function updatePeriodFinish(uint256 timestamp)
    external
    onlyOwner
    updateReward(address(0))
  {
    require(timestamp > block.timestamp, "timestamp cant be in the past");
    periodFinish = timestamp;
  }

  /* ========== MODIFIERS ========== */

  modifier updateReward(address account) {
    rewardPerTokenStored = rewardPerToken();
    lastUpdateTime = lastTimeRewardApplicable();
    if (account != address(0)) {
      rewards[account] = earned(account);
      userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }
    _;
  }
}
