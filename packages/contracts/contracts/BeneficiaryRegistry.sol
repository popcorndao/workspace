// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <=0.8.3;

import "./Governed.sol";
import "./CouncilControlled.sol";
import "./IBeneficiaryRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BeneficiaryRegistry is
  IBeneficiaryRegistry,
  Ownable,
  CouncilControlled
{
  struct Beneficiary {
    bytes applicationCid; // ipfs address of application
    uint256 listPointer;
  }

  event BeneficiaryAdded(
    address indexed _address,
    bytes indexed _applicationCid
  );
  event BeneficiaryRevoked(address indexed _address);

  mapping(address => Beneficiary) private beneficiariesMap;
  address[] private beneficiariesList;

  modifier validAddress(address _address) {
    require(_address == address(_address), "invalid address");
    _;
  }
  modifier onlyOwnerOrCouncil(address _address) {
    require(
      msg.sender == owner() || msg.sender == getCouncil(),
      "Only the owner or council may perform this action"
    );
    _;
  }

  constructor() Ownable() CouncilControlled(msg.sender) {}

  /**
   * @notice add a beneficiary with their IPFS cid to the registry
   * TODO: allow only election contract to modify beneficiary
   */
  function addBeneficiary(address _address, bytes calldata applicationCid)
    external
    override
    onlyOwner
  {
    require(_address == address(_address), "invalid address");
    require(applicationCid.length > 0, "!application");
    require(!beneficiaryExists(_address), "exists");

    beneficiariesList.push(_address);
    beneficiariesMap[_address] = Beneficiary({
      applicationCid: applicationCid,
      listPointer: beneficiariesList.length - 1
    });

    emit BeneficiaryAdded(_address, applicationCid);
  }

  /**
   * @notice remove a beneficiary from the registry. (callable only by council)
   */
  function revokeBeneficiary(address _address)
    external
    override
    onlyOwnerOrCouncil(msg.sender)
  {
    require(beneficiaryExists(_address), "exists");
    delete beneficiariesList[beneficiariesMap[_address].listPointer];
    delete beneficiariesMap[_address];
    emit BeneficiaryRevoked(_address);
  }

  /**
   * @notice check if beneficiary exists in the registry
   */
  function beneficiaryExists(address _address)
    public
    view
    override
    returns (bool)
  {
    if (beneficiariesList.length == 0) return false;
    return
      beneficiariesList[beneficiariesMap[_address].listPointer] == _address;
  }

  /**
   * @notice get beneficiary's application cid from registry. this cid is the address to the beneficiary application that is included in the beneficiary nomination proposal.
   */
  function getBeneficiary(address _address) public view returns (bytes memory) {
    return beneficiariesMap[_address].applicationCid;
  }

  function getBeneficiaryList() public view returns (address[] memory) {
    return beneficiariesList;
  }
}
