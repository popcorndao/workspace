pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface PopcornPool is IERC20 {
  function deposit(uint256 amount) external returns (uint256);

  function withdraw(uint256 amount) external returns (uint256);
}

contract BlockLockHelper {
  PopcornPool pool;
  IERC20 baseToken;

  constructor(address _poolAddress, address _baseToken) {
    pool = PopcornPool(_poolAddress);
    baseToken = IERC20(_baseToken);
  }

  function deposit() public {
    baseToken.approve(address(pool), 1000 ether);
    pool.deposit(1000 ether);
  }

  function depositThenWithdraw() public {
    baseToken.approve(address(pool), 1000 ether);
    uint256 poolShares = pool.deposit(1000 ether);
    pool.withdraw(poolShares);
  }

  function withdrawThenDeposit() public {
    uint256 poolShares = pool.balanceOf(address(this));
    pool.withdraw(poolShares);
    baseToken.approve(address(pool), 500 ether);
    pool.deposit(500 ether);
  }

  function depositThenTransfer() public {
    baseToken.approve(address(pool), 1000 ether);
    uint256 poolShares = pool.deposit(1000 ether);
    pool.approve(address(pool), poolShares);
    pool.transfer(address(0x1), poolShares);
  }

  function depositThenTransferFrom() public {
    baseToken.approve(address(pool), 1000 ether);
    uint256 poolShares = pool.deposit(1000 ether);
    pool.approve(address(this), poolShares);
    pool.transferFrom(address(this), address(0x1), poolShares);
  }
}
