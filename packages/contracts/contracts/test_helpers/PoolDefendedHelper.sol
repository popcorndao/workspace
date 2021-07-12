pragma solidity >=0.6.0 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../Pool.sol";

contract PoolDefendedHelper {
  using SafeERC20 for IERC20;

  IERC20 public token;
  Pool public pool;

  constructor(IERC20 _token, Pool _pool) public {
    token = _token;
    pool = _pool;
  }

  function deposit(uint256 amount) public {
    token.approve(address(pool), amount);
    pool.deposit(amount);
  }
}
