pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Governed.sol";

contract KeeperIncentive is Governed {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  struct Incentive {
    uint256 targetDate; //timestamp
    uint256 incentiveWindow; //time in seconds
    uint256 interval; //time in seconds
    uint256 reward; //pop reward for calling the function
    bool enabled;
    bool openToEveryone; //can everyone call the function to get the reward or only whitelisted?
  }

  /* ========== STATE VARIABLES ========== */

  IERC20 public immutable POP;
  Incentive[] public incentives;
  uint256 public incentiveBudget;
  mapping(address => bool) public whitelisted;

  /* ========== EVENTS ========== */

  event IncentiveCreated(uint256 incentiveId);
  event IncentiveChanged(uint256 incentiveId);
  event IncentiveFunded(uint256 amount);
  event Whitelisted(address account);
  event RemovedWhitelisting(address account);
  event WhitelistingToggled(uint256 incentiveId, bool openToEveryone);
  event IncentiveToggled(uint256 incentiveId, bool enabled);
  event TargetDateChanged(uint256 incentiveId, uint256 targetDate);

  /* ========== CONSTRUCTOR ========== */

  constructor(address _governance, IERC20 _pop) public Governed(_governance) {
    POP = _pop;
  }

  /* ========== SETTER ========== */

  function createIncentive(
    uint256 _targetDate,
    uint256 _incentiveWindow,
    uint256 _interval,
    uint256 _reward,
    bool _enabled,
    bool _openToEveryone
  ) public onlyGovernance returns (uint256) {
    require(_targetDate >= block.timestamp, "must be in the future");
    incentives.push(
      Incentive({
        targetDate: _targetDate,
        incentiveWindow: _incentiveWindow,
        interval: _interval,
        reward: _reward,
        enabled: _enabled,
        openToEveryone: _openToEveryone
      })
    );
    emit IncentiveCreated(incentives.length);
    return incentives.length;
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function updateIncentive(
    uint256 _incentiveId,
    uint256 _targetDate,
    uint256 _incentiveWindow,
    uint256 _interval,
    uint256 _reward,
    bool _enabled,
    bool _openToEveryone
  ) external onlyGovernance {
    require(_targetDate >= block.timestamp, "must be in the future");
    incentives[_incentiveId] = Incentive({
      targetDate: _targetDate,
      incentiveWindow: _incentiveWindow,
      interval: _interval,
      reward: _reward,
      enabled: _enabled,
      openToEveryone: _openToEveryone
    });
    emit IncentiveChanged(_incentiveId);
  }

  function whitelistAccount(address _account) external onlyGovernance {
    whitelisted[_account] = true;
    emit Whitelisted(_account);
  }

  function removeWhitelisting(address _account) external onlyGovernance {
    whitelisted[_account] = false;
    emit RemovedWhitelisting(_account);
  }

  function toggleWhitelisting(uint256 _incentiveId) external onlyGovernance {
    incentives[_incentiveId].openToEveryone = !incentives[_incentiveId]
    .openToEveryone;
    emit WhitelistingToggled(
      _incentiveId,
      incentives[_incentiveId].openToEveryone
    );
  }

  function changeTargetDate(uint256 _incentiveId, uint256 _targetDate)
    external
    onlyGovernance
  {
    _changeTargetDate(_incentiveId, _targetDate);
  }

  function _changeTargetDate(uint256 _incentiveId, uint256 _targetDate)
    internal
  {
    require(_targetDate >= block.timestamp, "must be in the future");
    incentives[_incentiveId].targetDate = _targetDate;
    emit TargetDateChanged(_incentiveId, _targetDate);
  }

  function toggleIncentive(uint256 _incentiveId) external onlyGovernance {
    incentives[_incentiveId].enabled = !incentives[_incentiveId].enabled;
    emit IncentiveToggled(_incentiveId, incentives[_incentiveId].enabled);
  }

  function fundIncentive(uint256 _amount) external {
    POP.safeTransferFrom(msg.sender, address(this), _amount);
    incentiveBudget = incentiveBudget.add(_amount);
    emit IncentiveFunded(_amount);
  }

  /* ========== MODIFIER ========== */

  modifier keeperIncentive(uint256 _incentiveId) {
    if (_incentiveId < incentives.length) {
      Incentive storage incentive = incentives[_incentiveId];

      if (!incentive.openToEveryone) {
        require(
          whitelisted[msg.sender] || msg.sender == governance,
          "you are not whitelisted"
        );
      }
      uint256 deadline = incentive.targetDate.add(incentive.incentiveWindow);
      if (
        block.timestamp >= incentive.targetDate && block.timestamp <= deadline
      ) {
        uint256 newTargetDate = incentive.targetDate.add(incentive.interval);
        _changeTargetDate(_incentiveId, newTargetDate);

        if (incentive.reward <= incentiveBudget) {
          incentiveBudget = incentiveBudget.sub(incentive.reward);
          POP.approve(address(this), incentive.reward);
          POP.safeTransferFrom(address(this), msg.sender, incentive.reward);
        }
      }
    }
    _;
  }
}
