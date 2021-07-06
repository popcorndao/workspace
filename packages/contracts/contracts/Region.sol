pragma solidity >=0.7.0 <0.8.0;

import "./Governed.sol";
import "./IRegion.sol";

contract Region is IRegion, Governed {
  bytes2 public immutable override defaultRegion = 0x5757; //"WW" in bytes2
  bytes2[] public regions;
  mapping(bytes2 => bool) public override regionExists;

  event RegionAdded(bytes2 region);

  constructor() public Governed(msg.sender) {
    regions.push(0x5757);
    regionExists[0x5757] = true;
  }

  function getAllRegions() public view override returns (bytes2[] memory) {
    return regions;
  }

  function addRegion(bytes2 region) external override onlyGovernance {
    require(regionExists[region] == false, "region already exists");
    regions.push(region);
    regionExists[region] = true;
    emit RegionAdded(region);
  }
}
