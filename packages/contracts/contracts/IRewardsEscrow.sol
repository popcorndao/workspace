// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

interface IRewardsEscrow {
  function lock(address _address, uint256 _amount) external;
}
