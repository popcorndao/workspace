pragma solidity >=0.7.0 <0.8.0;

interface IRegion {
  function defaultRegion() external view returns (bytes2);

  function regionExists(bytes2 region) external view returns (bool);

  function getAllRegions() external view returns (bytes2[] memory);

  function addRegion(bytes2 region) external;
}
