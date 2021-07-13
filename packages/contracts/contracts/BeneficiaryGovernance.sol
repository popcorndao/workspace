// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Governed.sol";
import "./IStaking.sol";
import "./IBeneficiaryRegistry.sol";

/**
 * @notice This contract is for submitting beneficiary nomination proposals and beneficiary takedown proposals
 */
contract BeneficiaryGovernance is Governed {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

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
    uint256 yesCount;
    uint256 noCount;
    uint256 voterCount;
    ProposalType proposalType;
    ConfigurationOptions configurationOptions;
  }

  IERC20 public immutable POP;
  IStaking staking;
  IBeneficiaryRegistry beneficiaryRegistry;

  mapping(address => bool) pendingBeneficiaries;

  Proposal[] public proposals;
  uint256[] public nominations;
  uint256[] public takedowns;
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
    address governance
  ) Governed(governance) {
    staking = _staking;
    beneficiaryRegistry = _beneficiaryRegistry;
    POP = _pop;
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
   * @param  _type the proposal type (nomination / takedown)
   * @return proposal id
   */
  function createProposal(
    address _beneficiary,
    bytes memory _applicationCid,
    ProposalType _type
  )
    external
    validAddress(_beneficiary)
    enoughBond(msg.sender)
    returns (uint256)
  {
    _assertProposalPreconditions(_type, _beneficiary);

    POP.safeTransferFrom(
      msg.sender,
      address(this),
      DefaultConfigurations.proposalBond
    );

    uint256 proposalId = proposals.length;
    proposals.push();

    if (_type == ProposalType.BeneficiaryNominationProposal) {
      nominations.push(proposalId);
    } else {
      takedowns.push(proposalId);
    }

    Proposal storage proposal = proposals[proposalId];
    // Create a new proposal
    proposal.status = ProposalStatus.New;
    proposal.beneficiary = _beneficiary;
    proposal.status = ProposalStatus.New;
    proposal.applicationCid = _applicationCid;
    proposal.proposer = msg.sender;
    proposal.startTime = block.timestamp;
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
   * @param  _type the proposal type (nomination / takedown)
   */
  function vote(
    uint256 proposalId,
    ProposalType _type,
    VoteOption _vote
  ) external {
    Proposal storage proposal = _getProposal(proposalId, _type);
    _refreshState(proposal);

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
   * @param  _type the proposal type (nomination / takedown)
   */
  function finalize(uint256 proposalId, ProposalType _type) public {
    Proposal storage proposal = _getProposal(proposalId, _type);
    _refreshState(proposal);

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
   * @param  _type the proposal type (nomination / takedown)
   */
  function claimBond(uint256 proposalId, ProposalType _type) public {
    Proposal storage proposal = _getProposal(proposalId, _type);
    require(
      msg.sender == proposal.proposer,
      "only the proposer may call this function"
    );
    require(
      proposal.status == ProposalStatus.Passed,
      "Proposal failed or is processing!"
    );
    uint256 amount = proposal.configurationOptions.proposalBond;

    POP.approve(address(this), amount);
    POP.safeTransferFrom(address(this), msg.sender, amount);

    emit BondWithdrawn(msg.sender, amount);
  }

  /**
   * @notice updates the state of the proposal
   * @param  proposal passed in proposal
   */
  function _refreshState(Proposal storage proposal) internal {
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
   * @notice returns a proposal depending on the type
   */
  function _getProposal(uint256 _proposalId, ProposalType _type)
    internal
    view
    returns (Proposal storage)
  {
    if (_type == ProposalType.BeneficiaryNominationProposal) {
      return proposals[nominations[_proposalId]];
    }
    return proposals[takedowns[_proposalId]];
  }

  function getProposal(uint256 _proposalId, ProposalType _type)
    external
    view
    returns (
      ProposalStatus status_,
      address beneficiary_,
      bytes memory applicationCid_,
      address proposer_,
      uint256 startTime_,
      uint256 yesCount_,
      uint256 noCount_,
      uint256 voterCount_,
      ProposalType proposalType_,
      ConfigurationOptions memory configurationOptions_
    )
  {
    Proposal storage proposal = _getProposal(_proposalId, _type);

    status_ = proposal.status;
    beneficiary_ = proposal.beneficiary;
    applicationCid_ = proposal.applicationCid;
    proposer_ = proposal.proposer;
    startTime_ = proposal.startTime;
    yesCount_ = proposal.yesCount;
    noCount_ = proposal.noCount;
    voterCount_ = proposal.voterCount;
    proposalType_ = proposal.proposalType;
    configurationOptions_ = proposal.configurationOptions;
  }

  /**
   * @notice returns number of created proposals
   */
  function getNumberOfProposals(ProposalType _type)
    public
    view
    returns (uint256)
  {
    if (_type == ProposalType.BeneficiaryNominationProposal) {
      return nominations.length;
    }
    return takedowns.length;
  }

  /**
   * @notice gets number of votes
   * @param  proposalId id of the proposal
   * @param  _type the proposal type (nomination / takedown)
   * @return number of votes to a proposal
   */
  function getNumberOfVoters(uint256 proposalId, ProposalType _type)
    external
    view
    returns (uint256)
  {
    if (_type == ProposalType.BeneficiaryNominationProposal) {
      return proposals[nominations[proposalId]].voterCount;
    }
    return proposals[takedowns[proposalId]].voterCount;
  }

  /**
   * @notice checks if someone has voted to a specific proposal or not
   * @param  proposalId id of the proposal
   * @param  _type the proposal type (nomination / takedown)
   * @param  voter IPFS content hash
   * @return true or false
   */
  function hasVoted(
    uint256 proposalId,
    ProposalType _type,
    address voter
  ) external view returns (bool) {
    if (_type == ProposalType.BeneficiaryNominationProposal) {
      return proposals[nominations[proposalId]].voters[voter];
    }
    return proposals[takedowns[proposalId]].voters[voter];
  }
}
