// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <=0.8.3;

interface IGrantRegistry {
  function createGrant(
    uint8,
    address[] calldata,
    uint256[] calldata
  ) external;
}
