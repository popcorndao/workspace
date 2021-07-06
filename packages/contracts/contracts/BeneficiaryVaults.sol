// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "./IBeneficiaryVaults.sol";
import "./IBeneficiaryRegistry.sol";
import "./IRegion.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";

contract BeneficiaryVaults is IBeneficiaryVaults, Ownable, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  enum VaultStatus {
    Open,
    Closed
  }

  struct Vault {
    uint256 totalAllocated;
    uint256 currentBalance;
    uint256 unclaimedShare;
    mapping(address => bool) claimed;
    bytes32 merkleRoot;
    VaultStatus status;
  }

  /* ========== STATE VARIABLES ========== */

  IERC20 public immutable pop;
  IBeneficiaryRegistry public beneficiaryRegistry;
  IRegion public region;
  uint256 public totalDistributedBalance = 0;
  mapping(bytes2 => Vault[3]) public vaults;
  mapping(bytes2 => uint256) public regionBalance;

  /* ========== EVENTS ========== */

  event VaultOpened(uint8 vaultId, bytes32 merkleRoot);
  event VaultClosed(uint8 vaultId);
  event RewardsDistributed(uint256 amount);
  event RewardClaimed(
    uint8 vaultId,
    bytes2 region_,
    address beneficiary,
    uint256 amount
  );
  event BeneficiaryRegistryChanged(
    IBeneficiaryRegistry from,
    IBeneficiaryRegistry to
  );

  /* ========== CONSTRUCTOR ========== */

  constructor(
    IERC20 pop_,
    IBeneficiaryRegistry beneficiaryRegistry_,
    IRegion region_
  ) {
    pop = pop_;
    beneficiaryRegistry = beneficiaryRegistry_;
    region = region_;
  }

  /* ========== VIEWS ========== */

  function getVault(uint8 vaultId_, bytes2 region_)
    public
    view
    _vaultExists(vaultId_, region_)
    returns (
      uint256 totalAllocated,
      uint256 currentBalance,
      uint256 unclaimedShare,
      bytes32 merkleRoot,
      VaultStatus status
    )
  {
    Vault storage vault = vaults[region_][vaultId_];
    totalAllocated = vault.totalAllocated;
    currentBalance = vault.currentBalance;
    unclaimedShare = vault.unclaimedShare;
    merkleRoot = vault.merkleRoot;
    status = vault.status;
  }

  function hasClaimed(
    uint8 vaultId_,
    bytes2 region_,
    address beneficiary_
  ) public view _vaultExists(vaultId_, region_) returns (bool) {
    return vaults[region_][vaultId_].claimed[beneficiary_];
  }

  function vaultExists(uint8 vaultId_, bytes2 region_)
    public
    view
    override
    returns (bool)
  {
    return vaultId_ < 3 && vaults[region_][vaultId_].merkleRoot != "";
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  /**
   * @notice Initializes a vault for beneficiary claims
   * @param vaultId_ Vault ID in range 0-2
   * @param merkleRoot_ Merkle root to support claims
   * @dev Vault cannot be initialized if it is currently in an open state, otherwise existing data is reset*
   */
  function openVault(
    uint8 vaultId_,
    bytes2 region_,
    bytes32 merkleRoot_
  ) public override onlyOwner {
    require(vaultId_ < 3, "Invalid vault id");
    require(
      vaults[region_][vaultId_].merkleRoot == "" ||
        vaults[region_][vaultId_].status == VaultStatus.Closed,
      "Vault must not be open"
    );

    delete vaults[region_][vaultId_];
    Vault storage vault = vaults[region_][vaultId_];
    vault.totalAllocated = 0;
    vault.currentBalance = 0;
    vault.unclaimedShare = 100e18;
    vault.merkleRoot = merkleRoot_;
    vault.status = VaultStatus.Open;

    emit VaultOpened(vaultId_, merkleRoot_);
  }

  /**
   * @notice Close an open vault and redirect rewards to other vaults
   * @dev Vault must be in an open state
   * @param vaultId_ Vault ID in range 0-2
   */
  function closeVault(uint8 vaultId_, bytes2 region_)
    public
    override
    onlyOwner
    _vaultExists(vaultId_, region_)
  {
    Vault storage vault = vaults[region_][vaultId_];
    require(vault.status == VaultStatus.Open, "Vault must be open");

    uint256 _remainingBalance = vault.currentBalance;
    vault.currentBalance = 0;
    vault.status = VaultStatus.Closed;

    if (_remainingBalance > 0) {
      regionBalance[region_] = regionBalance[region_].add(_remainingBalance);
      if (_getOpenVaultCount(region_) > 0) {
        allocateRewards(region_);
      }
    }

    emit VaultClosed(vaultId_);
  }

  /**
   * @notice Verifies a valid claim with no cost
   * @param vaultId_ Vault ID in range 0-2
   * @param proof_ Merkle proof of path to leaf element
   * @param beneficiary_ Beneficiary address encoded in leaf element
   * @param share_ Beneficiary expected share encoded in leaf element
   * @return Returns boolean true or false if claim is valid
   */
  function verifyClaim(
    uint8 vaultId_,
    bytes2 region_,
    bytes32[] memory proof_,
    address beneficiary_,
    uint256 share_
  ) public view _vaultExists(vaultId_, region_) returns (bool) {
    require(msg.sender == beneficiary_, "Sender must be beneficiary");
    require(
      vaults[region_][vaultId_].status == VaultStatus.Open,
      "Vault must be open"
    );
    require(
      beneficiaryRegistry.beneficiaryExists(beneficiary_) == true,
      "Beneficiary does not exist"
    );

    return
      MerkleProof.verify(
        proof_,
        vaults[region_][vaultId_].merkleRoot,
        bytes32(keccak256(abi.encodePacked(beneficiary_, share_)))
      );
  }

  /**
   * @notice Transfers POP tokens only once to beneficiary on successful claim
   * @dev Applies any outstanding rewards before processing claim
   * @param vaultId_ Vault ID in range 0-2
   * @param proof_ Merkle proof of path to leaf element
   * @param beneficiary_ Beneficiary address encoded in leaf element
   * @param share_ Beneficiary expected share encoded in leaf element
   */
  function claimReward(
    uint8 vaultId_,
    bytes2 region_,
    bytes32[] memory proof_,
    address beneficiary_,
    uint256 share_
  ) public nonReentrant _vaultExists(vaultId_, region_) {
    require(
      verifyClaim(vaultId_, region_, proof_, beneficiary_, share_) == true,
      "Invalid claim"
    );
    require(
      hasClaimed(vaultId_, region_, beneficiary_) == false,
      "Already claimed"
    );

    Vault storage vault = vaults[region_][vaultId_];

    uint256 _reward = (vault.currentBalance.mul(share_)).div(
      vault.unclaimedShare
    );

    require(_reward > 0, "No reward");

    totalDistributedBalance = totalDistributedBalance.sub(_reward);
    vault.currentBalance = vault.currentBalance.sub(_reward);
    vault.unclaimedShare = vault.unclaimedShare.sub(share_);

    vault.claimed[beneficiary_] = true;

    pop.transfer(beneficiary_, _reward);

    emit RewardClaimed(vaultId_, region_, beneficiary_, _reward);
  }

  /**
   * @notice Distribute unallocated POP token balance to vaults
   * @dev Requires at least one open vault
   */
  function distributeRewards() public override nonReentrant {
    uint256 availableReward = pop.balanceOf(address(this)).sub(
      totalDistributedBalance
    );
    require(availableReward > 0, "no rewards available");
    bytes2[] memory _regions = region.getAllRegions();
    uint256 rewardPerRegion = availableReward.div(_regions.length);
    for (uint256 i; i < _regions.length; i++) {
      regionBalance[_regions[i]] = regionBalance[_regions[i]].add(
        rewardPerRegion
      );
    }
    totalDistributedBalance = totalDistributedBalance.add(availableReward);
    emit RewardsDistributed(availableReward);
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function allocateRewards(bytes2 region_) public nonReentrant {
    require(regionBalance[region_] > 0, "empty region balance");

    uint8 _openVaultCount = _getOpenVaultCount(region_);
    require(_openVaultCount > 0, "no open vaults");

    //@todo handle dust after div
    uint256 _allocation = regionBalance[region_].div(_openVaultCount);

    for (uint8 _vaultId = 0; _vaultId < vaults[region_].length; _vaultId++) {
      if (
        vaults[region_][_vaultId].status == VaultStatus.Open &&
        vaults[region_][_vaultId].merkleRoot != ""
      ) {
        vaults[region_][_vaultId].totalAllocated = vaults[region_][_vaultId]
        .totalAllocated
        .add(_allocation);
        vaults[region_][_vaultId].currentBalance = vaults[region_][_vaultId]
        .currentBalance
        .add(_allocation);
      }
    }
    regionBalance[region_] = 0;
  }

  function _getOpenVaultCount(bytes2 region_) internal view returns (uint8) {
    uint8 _openVaultCount = 0;
    for (uint8 i = 0; i < 3; i++) {
      if (
        vaults[region_][i].merkleRoot != "" &&
        vaults[region_][i].status == VaultStatus.Open
      ) {
        _openVaultCount++;
      }
    }
    return _openVaultCount;
  }

  /* ========== SETTER ========== */

  /**
   * @notice Overrides existing BeneficiaryRegistry contract
   * @param beneficiaryRegistry_ Address of new BeneficiaryRegistry contract
   * @dev Must implement IBeneficiaryRegistry and cannot be same as existing
   */
  function setBeneficiaryRegistry(IBeneficiaryRegistry beneficiaryRegistry_)
    public
    onlyOwner
  {
    require(
      beneficiaryRegistry != beneficiaryRegistry_,
      "Same BeneficiaryRegistry"
    );
    IBeneficiaryRegistry _beneficiaryRegistry = beneficiaryRegistry;
    beneficiaryRegistry = beneficiaryRegistry_;
    emit BeneficiaryRegistryChanged(_beneficiaryRegistry, beneficiaryRegistry);
  }

  /* ========== MODIFIERS ========== */

  modifier _vaultExists(uint8 vaultId_, bytes2 region_) {
    require(vaultExists(vaultId_, region_), "vault must exist");
    _;
  }
}
