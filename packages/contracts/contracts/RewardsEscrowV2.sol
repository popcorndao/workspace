pragma solidity >=0.7.0 <0.8.0;

import "./IStaking.sol";
import "./IRewardsEscrow.sol";
import "./Owned.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title Popcorn Rewards Escrow
 * @notice Vests Token from the Staking contract.
 */
contract RewardsEscrow is IRewardsEscrow, Owned, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */

  struct Escrow {
    uint256 start;
    uint256 end;
    uint256 amount;
  }

  IERC20 public immutable POP;
  IStaking public Staking;
  mapping(address => Escrow[2]) public escrowedBalances;
  mapping(address => uint256) public vested;
  uint256 public escrowDuration = 90 days;
  uint256 public vestingCliff = 90 days;

  /* ========== EVENTS ========== */

  event Claimed(address _address, uint256 claimable);
  event Locked(address _address, uint256 claimable);
  event StakingChanged(IStaking _staking);
  event EscrowDurationChanged(uint256 _escrowDuration);
  event VestingCliffChanged(uint256 _vestingCliff);

  /* ========== CONSTRUCTOR ========== */

  constructor(IERC20 _pop) Owned(msg.sender) {
    POP = _pop;
  }

  /* ========== VIEWS ========== */

  function getLocked(address _address) external view returns (uint256) {
    return escrowedBalances[_address][0].amount;
  }

  function getVested(address _address) public view returns (uint256) {
    uint256 _now = block.timestamp;
    uint256 locked = escrowedBalances[_address][0].amount;
    uint256 start = escrowedBalances[_address][0].start;
    uint256 end = escrowedBalances[_address][0].end;
    if (_now < start) {
      return 0;
    }
    if (start == 0 || end == 0) {
      return 0;
    }
    return Math.min((locked.mul(_now.sub(start))).div(end.sub(start)), locked);
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  function lock(address _address, uint256 _amount)
    external
    override
    nonReentrant
    updateVested(_address)
  {
    require(msg.sender == address(Staking), "you cant call this function");
    require(_amount > 0, "amount must be greater than 0");
    require(POP.balanceOf(msg.sender) >= _amount, "insufficient balance");

    POP.safeTransferFrom(msg.sender, address(this), _amount);

    _lock(_address, _amount);
  }

  function claim() public nonReentrant updateVested(msg.sender) {
    _claimFor(msg.sender);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function _lock(address _address, uint256 _amount) internal {
    uint256 _now = block.timestamp;

    if (
      _now > escrowedBalances[_address][0].end &&
      escrowedBalances[_address][1].end != 0
    ) {
      escrowedBalances[_address][0] = escrowedBalances[_address][1];
      delete escrowedBalances[_address][1];
    }

    uint256 _start = _now.add(vestingCliff);
    uint256 _end = _start.add(escrowDuration);

    if (
      _start > escrowedBalances[_address][0].end &&
      escrowedBalances[_address][0].end != 0
    ) {
      if (_end < escrowedBalances[_address][1].end) {
        _end = escrowedBalances[_address][1].end;
      }
      if (
        _start > escrowedBalances[_address][1].start &&
        escrowedBalances[_address][0].start != 0
      ) {
        _start = escrowedBalances[_address][1].start;
      }
      escrowedBalances[_address][1] = Escrow({
        start: _start,
        end: _end,
        amount: _amount.add(escrowedBalances[_address][1].amount)
      });
      return;
    }

    if (
      _end > escrowedBalances[_address][1].start &&
      escrowedBalances[_address][1].start != 0
    ) {
      _amount = _amount.add(escrowedBalances[_address][1].amount);
      delete escrowedBalances[_address][1];
    }

    if (_start < escrowedBalances[_address][0].end) {
      _start = escrowedBalances[_address][0].start;
    }

    escrowedBalances[_address][0] = Escrow({
      start: _start,
      end: _end,
      amount: _amount.add(escrowedBalances[_address][0].amount)
    });

    emit Locked(_address, _amount);
  }

  function _claimFor(address _address) internal {
    uint256 claimable = vested[_address];
    require(claimable > 0, "nothing to claim");
    if (claimable == escrowedBalances[_address][0].amount) {
      delete vested[_address];
      delete escrowedBalances[_address][0];
    } else {
      vested[_address] = 0;
      escrowedBalances[_address][0].amount = escrowedBalances[_address][0]
      .amount
      .sub(claimable);
    }
    POP.safeTransfer(_address, claimable);
    emit Claimed(_address, claimable);
  }

  function setStaking(IStaking _staking) external onlyOwner {
    require(Staking != _staking, "Same Staking");
    Staking = _staking;
    emit StakingChanged(_staking);
  }

  function updateEscrowDuration(uint256 _escrowDuration) external onlyOwner {
    escrowDuration = _escrowDuration;
    emit EscrowDurationChanged(_escrowDuration);
  }

  function updateCliff(uint256 _vestingCliff) external onlyOwner {
    vestingCliff = _vestingCliff;
    emit VestingCliffChanged(_vestingCliff);
  }

  /* ========== MODIFIERS ========== */

  modifier updateVested(address _address) {
    vested[_address] = vested[_address].add(getVested(_address));
    _;
  }
}
