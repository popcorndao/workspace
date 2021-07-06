// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

interface IBeneficiaryVaults {
  function vaultExists(uint8 vaultId_, bytes2 region_)
    external
    view
    returns (bool);

  function openVault(
    uint8 vaultId_,
    bytes2 region_,
    bytes32 merkleRoot_
  ) external;

  function closeVault(uint8 vaultId_, bytes2 region_) external;

  function distributeRewards() external;
}
