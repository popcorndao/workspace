pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../KeeperIncentive.sol";

contract KeeperIncentiveHelper is KeeperIncentive {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  event FunctionCalled(address account);

  constructor(IERC20 pop_) public KeeperIncentive(msg.sender, pop_) {
    createIncentive(block.timestamp, 1 days, 30 days, 10e18, true, false);
  }

  function defaultIncentivisedFunction() public keeperIncentive(0) {
    emit FunctionCalled(msg.sender);
  }

  function incentivisedFunction() public keeperIncentive(1) {
    emit FunctionCalled(msg.sender);
  }
}
