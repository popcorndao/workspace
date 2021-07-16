pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../ParticipationReward.sol";

contract ParticipationRewardHelper is ParticipationReward {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  constructor(IERC20 _pop, address _governance)
    ParticipationReward(_pop, _governance)
  {}

  function initializeVault(bytes32 vaultId_, uint256 endTime_) external {
    _initializeVault(vaultId_, endTime_);
  }

  function openVault(bytes32 vaultId_) external {
    _openVault(vaultId_);
  }

  function addShares(
    bytes32 vaultId_,
    address account_,
    uint256 shares_
  ) external {
    _addShares(vaultId_, account_, shares_);
  }
}
