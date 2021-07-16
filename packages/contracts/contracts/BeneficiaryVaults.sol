// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "./Interfaces/IBeneficiaryVaults.sol";
import "./Interfaces/IBeneficiaryRegistry.sol";
import "./Owned.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";

contract BeneficiaryVaults is IBeneficiaryVaults, Owned, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  IERC20 public immutable pop;
  IBeneficiaryRegistry public beneficiaryRegistry;
  uint256 public totalVaultedBalance = 0;

  Vault[3] private vaults;

  enum VaultStatus {
    Initialized,
    Open,
    Closed
  }

  struct Vault {
    uint256 totalAllocated;
    uint256 currentBalance;
    uint256 unclaimedShare;
    mapping(address => bool) claimed;
    bytes32 merkleRoot;
    uint256 endTime;
    VaultStatus status;
  }

  event VaultInitialized(uint8 vaultId, bytes32 merkleRoot);
  event VaultOpened(uint8 vaultId);
  event VaultClosed(uint8 vaultId);
  event RewardsDistributed(uint256 amount);
  event RewardAllocated(uint8 vaultId, uint256 amount);
  event RewardClaimed(uint8 vaultId, address beneficiary, uint256 amount);
  event BeneficiaryRegistryChanged(
    IBeneficiaryRegistry from,
    IBeneficiaryRegistry to
  );

  modifier vaultExists(uint8 vaultId_) {
    require(vaultId_ < 3, "Invalid vault id");
    require(vaults[vaultId_].endTime > 0, "Uninitialized vault slot");
    _;
  }

  constructor(IERC20 pop_, IBeneficiaryRegistry beneficiaryRegistry_)
    Owned(msg.sender)
  {
    pop = pop_;
    beneficiaryRegistry = beneficiaryRegistry_;
  }

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

  /**
   * @notice Initializes a vault for beneficiary claims
   * @param vaultId_ Vault ID in range 0-2
   * @param endTime_ Unix timestamp in seconds after which a vault can be closed
   * @param merkleRoot_ Merkle root to support claims
   * @dev Vault cannot be initialized if it is currently in an open state, otherwise existing data is reset*
   */
  function initializeVault(
    uint8 vaultId_,
    uint256 endTime_,
    bytes32 merkleRoot_
  ) public onlyOwner {
    require(vaultId_ < 3, "Invalid vault id");
    require(endTime_ > block.timestamp, "Invalid end block");
    require(
      vaults[vaultId_].status != VaultStatus.Open,
      "Vault must not be open"
    );

    delete vaults[vaultId_];
    Vault storage v = vaults[vaultId_];
    v.totalAllocated = 0;
    v.currentBalance = 0;
    v.unclaimedShare = 100e18;
    v.merkleRoot = merkleRoot_;
    v.endTime = endTime_;
    v.status = VaultStatus.Initialized;

    emit VaultInitialized(vaultId_, merkleRoot_);
  }

  /**
   * @notice Open a vault it can receive rewards and accept claims
   * @dev Vault must be in an initialized state
   * @param vaultId_ Vault ID in range 0-2
   */
  function openVault(uint8 vaultId_) public onlyOwner vaultExists(vaultId_) {
    require(
      vaults[vaultId_].status == VaultStatus.Initialized,
      "Vault must be initialized"
    );

    vaults[vaultId_].status = VaultStatus.Open;

    emit VaultOpened(vaultId_);
  }

  /**
   * @notice Close an open vault and redirect rewards to other vaults
   * @dev Vault must be in an open state
   * @param vaultId_ Vault ID in range 0-2
   */
  function closeVault(uint8 vaultId_) public onlyOwner vaultExists(vaultId_) {
    require(vaults[vaultId_].status == VaultStatus.Open, "Vault must be open");
    require(block.timestamp >= vaults[vaultId_].endTime, "Vault has not ended");

    uint256 _remainingBalance = vaults[vaultId_].currentBalance;
    vaults[vaultId_].currentBalance = 0;
    vaults[vaultId_].status = VaultStatus.Closed;

    if (_remainingBalance > 0) {
      totalVaultedBalance = totalVaultedBalance.sub(_remainingBalance);
      _allocateRewards(_remainingBalance);
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
    bytes32[] memory proof_,
    address beneficiary_,
    uint256 share_
  ) public view vaultExists(vaultId_) returns (bool) {
    require(msg.sender == beneficiary_, "Sender must be beneficiary");
    require(vaults[vaultId_].status == VaultStatus.Open, "Vault must be open");
    require(
      beneficiaryRegistry.beneficiaryExists(beneficiary_) == true,
      "Beneficiary does not exist"
    );

    return
      MerkleProof.verify(
        proof_,
        vaults[vaultId_].merkleRoot,
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
    bytes32[] memory proof_,
    address beneficiary_,
    uint256 share_
  ) public nonReentrant vaultExists(vaultId_) {
    require(
      verifyClaim(vaultId_, proof_, beneficiary_, share_) == true,
      "Invalid claim"
    );
    require(hasClaimed(vaultId_, beneficiary_) == false, "Already claimed");

    uint256 _reward = vaults[vaultId_].currentBalance.mul(share_).div(
      vaults[vaultId_].unclaimedShare
    );

    require(_reward > 0, "No reward");

    totalVaultedBalance = totalVaultedBalance.sub(_reward);
    vaults[vaultId_].currentBalance = vaults[vaultId_].currentBalance.sub(
      _reward
    );
    vaults[vaultId_].unclaimedShare = vaults[vaultId_].unclaimedShare.sub(
      share_
    );

    vaults[vaultId_].claimed[beneficiary_] = true;

    pop.transfer(beneficiary_, _reward);

    emit RewardClaimed(vaultId_, beneficiary_, _reward);
  }

  /**
   * @notice Distribute unallocated POP token balance to vaults
   * @dev Requires at least one open vault
   */
  function distributeRewards() public nonReentrant {
    uint8 _openVaultCount = _getOpenVaultCount();
    require(_openVaultCount > 0, "No open vaults");

    uint256 _availableReward = pop.balanceOf(address(this)).sub(
      totalVaultedBalance
    );
    _allocateRewards(_availableReward);

    emit RewardsDistributed(_availableReward);
  }

  function _allocateRewards(uint256 amount_) internal {
    require(amount_ > 0, "Invalid amount");

    uint8 _openVaultCount = _getOpenVaultCount();
    if (_openVaultCount == 0) return;

    totalVaultedBalance = totalVaultedBalance.add(amount_);
    //@todo handle dust after div
    uint256 _allocation = amount_.div(_openVaultCount);

    for (uint8 _vaultId = 0; _vaultId < vaults.length; _vaultId++) {
      if (vaults[_vaultId].status == VaultStatus.Open) {
        vaults[_vaultId].totalAllocated = vaults[_vaultId].totalAllocated.add(
          _allocation
        );
        vaults[_vaultId].currentBalance = vaults[_vaultId].currentBalance.add(
          _allocation
        );
        emit RewardAllocated(_vaultId, _allocation);
      }
    }
  }

  function getVault(uint8 vaultId_)
    public
    view
    vaultExists(vaultId_)
    returns (
      uint256 totalAllocated,
      uint256 currentBalance,
      uint256 unclaimedShare,
      bytes32 merkleRoot,
      uint256 endTime,
      VaultStatus status
    )
  {
    totalAllocated = vaults[vaultId_].totalAllocated;
    currentBalance = vaults[vaultId_].currentBalance;
    unclaimedShare = vaults[vaultId_].unclaimedShare;
    merkleRoot = vaults[vaultId_].merkleRoot;
    endTime = vaults[vaultId_].endTime;
    status = vaults[vaultId_].status;
  }

  function hasClaimed(uint8 vaultId_, address beneficiary_)
    public
    view
    vaultExists(vaultId_)
    returns (bool)
  {
    return vaults[vaultId_].claimed[beneficiary_];
  }

  function _getOpenVaultCount() internal view returns (uint8) {
    uint8 _openVaultCount = 0;
    for (uint8 i = 0; i < vaults.length; i++) {
      if (vaults[i].status == VaultStatus.Open) {
        _openVaultCount++;
      }
    }
    return _openVaultCount;
  }
}
