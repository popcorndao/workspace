// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

contract MockYearnRegistry {
  address mockYearnVault;

  constructor(address mockYearnVault_) {
    mockYearnVault = mockYearnVault_;
  }

  function latestVault(address token) external view returns (address) {
    return mockYearnVault;
  }

  function numVaults(address token) external view returns (uint256) {
    return 1;
  }

  function vaults(address token, uint256 deploymentId)
    external
    view
    returns (address)
  {
    return mockYearnVault;
  }
}
