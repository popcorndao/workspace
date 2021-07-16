// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <=0.8.3;

interface IRandomNumberConsumer {
  function randomResult() external returns (uint256);

  function getRandomNumber(uint256) external;
}
