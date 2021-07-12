// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;


interface Uniswap {
  function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
  external
  payable
  returns (uint[] memory amounts);

  function WETH() external pure returns (address);
}

contract Faucet {

  Uniswap public uniswap;

  constructor(address _uniswap) {
    uniswap = Uniswap(_uniswap);
  }

  function sendTokens(address token, address recipient) public {
    address[] memory path = new address[](2);
    path[0] = uniswap.WETH();
    path[1] = token;
    uniswap.swapExactETHForTokens{value: 10 ether}(0, path, recipient, block.timestamp);
  }

}
