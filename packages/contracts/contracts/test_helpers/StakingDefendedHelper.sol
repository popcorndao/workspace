pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../Staking.sol";

contract StakingDefendedHelper {
  using SafeERC20 for IERC20;

  IERC20 public token;
  Staking public staking;

  constructor(IERC20 _token, Staking _staking) public {
    token = _token;
    staking = _staking;
  }

  function stake(uint256 amount) public {
    token.approve(address(staking), amount);
    staking.stake(amount, 604800);
  }
}
