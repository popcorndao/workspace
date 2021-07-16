pragma solidity >=0.7.0 <0.8.0;

interface CurveAddressProvider {
  function get_registry() external view returns (address);
}
