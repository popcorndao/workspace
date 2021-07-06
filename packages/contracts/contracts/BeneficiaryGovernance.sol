// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Governed.sol";
import "./IStaking.sol";
import "./IBeneficiaryRegistry.sol";
import "./IRegion.sol";

/**
 * @notice This contract is for submitting beneficiary nomination proposals and beneficiary takedown proposals
 */
contract BeneficiaryGovernance is Governed {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  IERC20 public immutable POP;
  IRegion internal region;
  IStaking internal staking;
  IBeneficiaryRegistry internal beneficiaryRegistry;

  mapping(address => bool) pendingBeneficiaries;
  /**
   * BNP for Beneficiary Nomination Proposal
   * BTP for Beneficiary Takedown Proposal
   */
  enum ProposalType {
    BeneficiaryNominationProposal,
    BeneficiaryTakedownProposal
  }

  enum ProposalStatus {
    New,
    ChallengePeriod,
    PendingFinalization,
    Passed,
    Failed
  }

  enum VoteOption {
    Yes,
    No
  }

  struct ConfigurationOptions {
    uint256 votingPeriod;
    uint256 vetoPeriod;
    uint256 proposalBond;
  }

  struct Proposal {
    ProposalStatus status;
    address beneficiary;
    mapping(address => bool) voters;
    bytes applicationCid;
    address proposer;
    uint256 startTime;
    bytes2 region;
    uint256 yesCount;
    uint256 noCount;
    uint256 voterCount;
    ProposalType proposalType;
    ConfigurationOptions configurationOptions;
  }

  Proposal[] public proposals;

  ConfigurationOptions public DefaultConfigurations;

  event ProposalCreated(
    uint256 indexed proposalId,
    address indexed proposer,
    address indexed beneficiary,
    bytes applicationCid
  );

  event Vote(
    uint256 indexed proposalId,
    address indexed voter,
    uint256 indexed weight
  );

  event Finalize(uint256 indexed proposalId);
  event BondWithdrawn(address _address, uint256 amount);

  modifier onlyProposer(uint256 proposalId) {
    require(
      msg.sender == proposals[proposalId].proposer,
      "only the proposer may call this function"
    );
    _;
  }
  modifier validAddress(address _address) {
    require(_address == address(_address), "invalid address");
    _;
  }
  modifier enoughBond(address _address) {
    require(
      POP.balanceOf(_address) >= DefaultConfigurations.proposalBond,
      "proposal bond is not enough"
    );
    _;
  }

  constructor(
    IStaking _staking,
    IBeneficiaryRegistry _beneficiaryRegistry,
    IERC20 _pop,
    IRegion _region,
    address governance
  ) Governed(governance) {
    staking = _staking;
    beneficiaryRegistry = _beneficiaryRegistry;
    POP = _pop;
    region = _region;
    _setDefaults();
  }

  function _setDefaults() internal {
    DefaultConfigurations.votingPeriod = 2 days;
    DefaultConfigurations.vetoPeriod = 2 days;
    DefaultConfigurations.proposalBond = 2000e18;
  }

  function setConfiguration(
    uint256 _votingPeriod,
    uint256 _vetoPeriod,
    uint256 _proposalBond
  ) public onlyGovernance {
    DefaultConfigurations.votingPeriod = _votingPeriod;
    DefaultConfigurations.vetoPeriod = _vetoPeriod;
    DefaultConfigurations.proposalBond = _proposalBond;
  }

  /**
   * @notice creates a beneficiary nomination proposal or a beneficiary takedown proposal
   * @param  _beneficiary address of the beneficiary
   * @param  _applicationCid IPFS content hash
   * @return proposal id
   */
  function createProposal(
    address _beneficiary,
    bytes2 _region,
    bytes calldata _applicationCid,
    ProposalType _type
  )
    external
    validAddress(_beneficiary)
    enoughBond(msg.sender)
    returns (uint256)
  {
    //require(region.regionExists(_region), "region doesnt exist");
    _assertProposalPreconditions(_type, _beneficiary);

    POP.safeTransferFrom(
      msg.sender,
      address(this),
      DefaultConfigurations.proposalBond
    );

    uint256 proposalId = proposals.length;

    // Create a new proposal
    proposals.push();
    Proposal storage proposal = proposals[proposalId];
    proposal.status = ProposalStatus.New;
    proposal.beneficiary = _beneficiary;
    proposal.status = ProposalStatus.New;
    proposal.applicationCid = _applicationCid;
    proposal.proposer = msg.sender;
    proposal.startTime = block.timestamp;
    proposal.region = _region;
    proposal.proposalType = _type;
    proposal.configurationOptions = DefaultConfigurations;

    pendingBeneficiaries[_beneficiary] = true;

    emit ProposalCreated(proposalId, msg.sender, _beneficiary, _applicationCid);

    return proposalId;
  }

  /**
   * @notice checks beneficiary exists or doesn't exist before creating beneficiary nomination proposal or takedown proposal
   */
  function _assertProposalPreconditions(
    ProposalType _type,
    address _beneficiary
  ) internal view {
    if (ProposalType.BeneficiaryTakedownProposal == _type) {
      require(
        beneficiaryRegistry.beneficiaryExists(_beneficiary),
        "Beneficiary doesnt exist!"
      );
    }
    if (ProposalType.BeneficiaryNominationProposal == _type) {
      require(
        !pendingBeneficiaries[_beneficiary] &&
          !beneficiaryRegistry.beneficiaryExists(_beneficiary),
        "Beneficiary proposal is pending or already exists!"
      );
    }
  }

  /**
   * @notice votes to a specific proposal during the initial voting process
   * @param  proposalId id of the proposal which you are going to vote
   */
  function vote(uint256 proposalId, VoteOption _vote) external {
    _refreshState(proposalId);
    Proposal storage proposal = proposals[proposalId];

    require(
      proposal.status == ProposalStatus.New ||
        proposal.status == ProposalStatus.ChallengePeriod,
      "Proposal is no longer in voting period"
    );
    require(
      !proposal.voters[msg.sender],
      "address already voted for the proposal"
    );

    uint256 _voiceCredits = getVoiceCredits(msg.sender);

    proposal.voters[msg.sender] = true;
    proposal.voterCount = proposal.voterCount.add(1);

    if (_vote == VoteOption.Yes) {
      require(
        proposal.status == ProposalStatus.New,
        "Initial voting period has already finished!"
      );
      proposal.yesCount = proposal.yesCount.add(_voiceCredits);
    }

    if (_vote == VoteOption.No) {
      proposal.noCount = proposal.noCount.add(_voiceCredits);
    }

    emit Vote(proposalId, msg.sender, _voiceCredits);
  }

  /**
   * @notice gets the voice credits of an address using the staking contract
   * @param  _address address of the voter
   * @return _voiceCredits
   */
  function getVoiceCredits(address _address)
    internal
    view
    returns (uint256 _voiceCredits)
  {
    _voiceCredits = staking.getVoiceCredits(_address);

    require(_voiceCredits > 0, "must have voice credits from staking");
    return _voiceCredits;
  }

  /**
   * @notice finalizes the voting process
   * @param  proposalId id of the proposal
   */
  function finalize(uint256 proposalId) public {
    _refreshState(proposalId);
    Proposal storage proposal = proposals[proposalId];

    require(
      proposal.status == ProposalStatus.PendingFinalization,
      "Finalization not allowed"
    );

    if (proposal.yesCount <= proposal.noCount) {
      proposal.status = ProposalStatus.Failed;
    }

    if (proposal.yesCount > proposal.noCount) {
      proposal.status = ProposalStatus.Passed;

      _handleSuccessfulProposal(proposal);
    }

    _resetBeneficiaryPendingState(proposal.beneficiary);

    emit Finalize(proposalId);
  }

  function _resetBeneficiaryPendingState(address _beneficiary) internal {
    pendingBeneficiaries[_beneficiary] = false;
  }

  function _handleSuccessfulProposal(Proposal storage proposal) internal {
    if (proposal.proposalType == ProposalType.BeneficiaryNominationProposal) {
      beneficiaryRegistry.addBeneficiary(
        proposal.beneficiary,
        proposal.region,
        proposal.applicationCid
      );
    }

    if (proposal.proposalType == ProposalType.BeneficiaryTakedownProposal) {
      beneficiaryRegistry.revokeBeneficiary(proposal.beneficiary);
    }
  }

  /**
   * @notice claims bond after a successful proposal voting
   * @param  proposalId id of the proposal
   */
  function claimBond(uint256 proposalId) public onlyProposer(proposalId) {
    require(
      proposals[proposalId].status == ProposalStatus.Passed,
      "Proposal failed or is processing!"
    );
    uint256 amount = proposals[proposalId].configurationOptions.proposalBond;

    POP.approve(address(this), amount);
    POP.safeTransferFrom(address(this), msg.sender, amount);

    emit BondWithdrawn(msg.sender, amount);
  }

  /**
   * @notice updates the state of the proposal
   * @param  proposalId id of the proposal
   */
  function _refreshState(uint256 proposalId) internal {
    Proposal storage proposal = proposals[proposalId];
    if (
      proposal.status == ProposalStatus.Failed ||
      proposal.status == ProposalStatus.Passed
    ) return;

    uint256 votingPeriod = proposal.configurationOptions.votingPeriod;
    uint256 vetoPeriod = proposal.configurationOptions.vetoPeriod;
    uint256 totalVotingPeriod = votingPeriod + vetoPeriod;

    if (
      block.timestamp >= proposal.startTime.add(votingPeriod) &&
      block.timestamp < proposal.startTime.add(totalVotingPeriod)
    ) {
      if (proposal.status != ProposalStatus.ChallengePeriod) {
        if (proposal.yesCount < proposal.noCount) {
          proposal.status = ProposalStatus.PendingFinalization;

          return;
        }

        proposal.status = ProposalStatus.ChallengePeriod;
      }
    }

    if (block.timestamp >= proposal.startTime.add(totalVotingPeriod)) {
      proposal.status = ProposalStatus.PendingFinalization;
    }
  }

  /**
   * @notice returns number of created proposals
   */
  function getNumberOfProposals() public view returns (uint256) {
    return proposals.length;
  }

  /**
   * @notice gets number of votes
   * @param  proposalId id of the proposal
   * @return number of votes to a proposal
   */
  function getNumberOfVoters(uint256 proposalId)
    external
    view
    returns (uint256)
  {
    return proposals[proposalId].voterCount;
  }

  /**
   * @notice checks if someone has voted to a specific proposal or not
   * @param  proposalId id of the proposal
   * @param  voter IPFS content hash
   * @return true or false
   */
  function hasVoted(uint256 proposalId, address voter)
    external
    view
    returns (bool)
  {
    return proposals[proposalId].voters[voter];
  }
}
