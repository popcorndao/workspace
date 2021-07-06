import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Signer } from "crypto";
import { MockContract } from "ethereum-waffle";
import { parseEther } from "ethers/lib/utils";
import { waffle, ethers } from "hardhat";
import {
  BeneficiaryGovernance,
  BeneficiaryRegistry,
  MockERC20,
  Region,
} from "../typechain";

interface Contracts {
  mockPop: MockERC20;
  mockStaking: MockContract;
  mockBeneficiaryRegistry: MockContract;
  region: Region;
  beneficiaryGovernance: BeneficiaryGovernance;
  beneficiaryRegistry?: BeneficiaryRegistry;
}

let owner: SignerWithAddress,
  governance: SignerWithAddress,
  nonOwner: SignerWithAddress,
  proposer1: SignerWithAddress,
  proposer2: SignerWithAddress,
  proposer3: SignerWithAddress,
  beneficiary: SignerWithAddress,
  beneficiary2: SignerWithAddress,
  voter1: SignerWithAddress,
  voter2: SignerWithAddress,
  voter3: SignerWithAddress,
  voter4: SignerWithAddress,
  voter5: SignerWithAddress;
let contracts: Contracts;

const ProposalType = { BNP: 0, BTP: 1 };
const Vote = { Yes: 0, No: 1 };
const ProposalStatus = {
  New: 0,
  ChallengePeriod: 1,
  PendingFinalization: 2,
  Passed: 3,
  Failed: 4,
};
const ONE_DAY = 86400;
const DEFAULT_REGION = "0x5757";

async function deployContracts(): Promise<Contracts> {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockPop = await MockERC20.deploy("TestPOP", "TPOP", 18);
  await mockPop.mint(owner.address, parseEther("50"));
  await mockPop.mint(nonOwner.address, parseEther("50"));
  await mockPop.mint(beneficiary.address, parseEther("50"));
  await mockPop.mint(beneficiary2.address, parseEther("50"));
  await mockPop.mint(proposer1.address, parseEther("1500"));
  await mockPop.mint(proposer2.address, parseEther("3000"));
  await mockPop.mint(proposer3.address, parseEther("3000"));

  const Staking = await ethers.getContractFactory("Staking");
  const mockStaking = await waffle.deployMockContract(
    owner,
    Staking.interface.format() as any
  );
  const BeneficiaryRegistry = await ethers.getContractFactory(
    "BeneficiaryRegistry"
  );
  const mockBeneficiaryRegistry = await waffle.deployMockContract(
    owner,
    BeneficiaryRegistry.interface.format() as any
  );

  const BeneficiaryGovernance = await ethers.getContractFactory(
    "BeneficiaryGovernance"
  );

  const region = await (
    await (await ethers.getContractFactory("Region")).deploy()
  ).deployed();

  const beneficiaryGovernance = await BeneficiaryGovernance.deploy(
    mockStaking.address,
    mockBeneficiaryRegistry.address,
    mockPop.address,
    region.address,
    owner.address
  );

  return {
    mockPop,
    mockStaking,
    mockBeneficiaryRegistry,
    region,
    beneficiaryGovernance,
  };
}

describe("BeneficiaryGovernance", function () {
  const PROPOSALID = 0;
  const PROPOSALID_BTP = 1;
  before(async function () {
    [
      owner,
      governance,
      nonOwner,
      proposer1,
      proposer2,
      proposer3,
      beneficiary,
      beneficiary2,
      voter1,
      voter2,
      voter3,
      voter4,
      voter5,
    ] = await ethers.getSigners();
    contracts = await deployContracts();
  });
  describe("defaults", function () {
    it("should set correct proposal defaults", async function () {
      const defConfig =
        await contracts.beneficiaryGovernance.DefaultConfigurations();

      expect(defConfig.votingPeriod).to.equal(2 * ONE_DAY);
      expect(defConfig.vetoPeriod).to.equal(2 * ONE_DAY);
      expect(defConfig.proposalBond).to.equal(parseEther("2000"));
    });
    it("should set configuration for proposals", async function () {
      await contracts.beneficiaryGovernance
        .connect(owner)
        .setConfiguration(10 * ONE_DAY, 10 * ONE_DAY, parseEther("3000"));
      const defConfig =
        await contracts.beneficiaryGovernance.DefaultConfigurations();

      expect(defConfig.votingPeriod).to.equal(10 * ONE_DAY);
      expect(defConfig.vetoPeriod).to.equal(10 * ONE_DAY);
      expect(defConfig.proposalBond).to.equal(parseEther("3000"));
    });
  });

  describe("proposals", function () {
    it("should create BNP proposal with specified attributes", async function () {
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        false
      );

      await contracts.mockPop
        .connect(proposer2)
        .approve(contracts.beneficiaryGovernance.address, parseEther("3000"));
      await contracts.beneficiaryGovernance
        .connect(proposer2)
        .createProposal(
          beneficiary.address,
          DEFAULT_REGION,
          ethers.utils.formatBytes32String("testCid"),
          ProposalType.BNP
        );
      const proposal = await contracts.beneficiaryGovernance.proposals(
        PROPOSALID
      );

      expect(proposal.beneficiary).to.equal(beneficiary.address);
      expect(proposal.applicationCid).to.equal(
        ethers.utils.formatBytes32String("testCid")
      );
      expect(proposal.proposer).to.equal(proposer2.address);
      expect(proposal.proposalType).to.equal(ProposalType.BNP);
      expect(proposal.voterCount).to.equal(0);
      expect(proposal.status).to.equal(ProposalStatus.New);
      expect(
        await contracts.beneficiaryGovernance.getNumberOfProposals()
      ).to.equal(1);
    });
    it("should prevent to create proposal with not enough bond", async function () {
      await contracts.mockPop
        .connect(proposer1)
        .approve(contracts.beneficiaryGovernance.address, parseEther("1500"));
      await expect(
        contracts.beneficiaryGovernance
          .connect(proposer1)
          .createProposal(
            beneficiary.address,
            DEFAULT_REGION,
            ethers.utils.formatBytes32String("testCid"),
            ProposalType.BNP
          )
      ).to.be.revertedWith("proposal bond is not enough");
    });
    it("should prevent to create a BNP proposal for a pending beneficiary proposal", async function () {
      await contracts.mockPop
        .connect(proposer3)
        .approve(contracts.beneficiaryGovernance.address, parseEther("3000"));
      await expect(
        contracts.beneficiaryGovernance
          .connect(proposer3)
          .createProposal(
            beneficiary.address,
            DEFAULT_REGION,
            ethers.utils.formatBytes32String("testCid"),
            ProposalType.BNP
          )
      ).to.be.revertedWith(
        "Beneficiary proposal is pending or already exists!"
      );
    });
    it("should prevent to create a BTP proposal for an address which hasn't been registered before", async function () {
      await contracts.mockPop
        .connect(proposer3)
        .approve(contracts.beneficiaryGovernance.address, parseEther("3000"));
      await expect(
        contracts.beneficiaryGovernance
          .connect(proposer3)
          .createProposal(
            beneficiary2.address,
            DEFAULT_REGION,
            ethers.utils.formatBytes32String("testCid"),
            ProposalType.BTP
          )
      ).to.be.revertedWith("Beneficiary doesnt exist!");
    });
    it("should prevent to create a BNP proposal for an address which has been registered before", async function () {
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.mockPop
        .connect(proposer3)
        .approve(contracts.beneficiaryGovernance.address, parseEther("3000"));
      await expect(
        contracts.beneficiaryGovernance
          .connect(proposer3)
          .createProposal(
            beneficiary2.address,
            DEFAULT_REGION,
            ethers.utils.formatBytes32String("testCid"),
            ProposalType.BNP
          )
      ).to.be.revertedWith(
        "Beneficiary proposal is pending or already exists!"
      );
    });
  });
  describe("voting", function () {
    beforeEach(async function () {
      const Staking = await ethers.getContractFactory("Staking");
      contracts.mockStaking = await waffle.deployMockContract(
        owner,
        Staking.interface.format() as any
      );

      const BeneficiaryRegistry = await ethers.getContractFactory(
        "BeneficiaryRegistry"
      );
      contracts.mockBeneficiaryRegistry = await waffle.deployMockContract(
        owner,
        BeneficiaryRegistry.interface.format() as any
      );

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      contracts.mockPop = await MockERC20.deploy("TestPOP", "TPOP", 18);
      await contracts.mockPop.mint(beneficiary.address, parseEther("50"));
      await contracts.mockPop.mint(proposer1.address, parseEther("2000"));
      await contracts.mockPop.mint(proposer2.address, parseEther("2000"));
      await contracts.mockPop.mint(voter1.address, parseEther("50"));
      const BeneficiaryNomination = await ethers.getContractFactory(
        "BeneficiaryGovernance"
      );
      contracts.beneficiaryGovernance = await BeneficiaryNomination.deploy(
        contracts.mockStaking.address,
        contracts.mockBeneficiaryRegistry.address,
        contracts.mockPop.address,
        contracts.region.address,
        owner.address
      );
      await contracts.beneficiaryGovernance.deployed();
      // create a BNP proposal
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        false
      );
      await contracts.mockPop
        .connect(proposer1)
        .approve(contracts.beneficiaryGovernance.address, parseEther("2000"));
      await contracts.beneficiaryGovernance
        .connect(proposer1)
        .createProposal(
          beneficiary.address,
          DEFAULT_REGION,
          ethers.utils.formatBytes32String("testCid"),
          ProposalType.BNP
        );
      // create a BTP
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.mockPop
        .connect(proposer2)
        .approve(contracts.beneficiaryGovernance.address, parseEther("2000"));
      await contracts.beneficiaryGovernance
        .connect(proposer2)
        .createProposal(
          beneficiary.address,
          DEFAULT_REGION,
          ethers.utils.formatBytes32String("testCid"),
          ProposalType.BTP
        );
    });
    it("should prevent voting without voiceCredits", async function () {
      await contracts.mockStaking.mock.getVoiceCredits.returns(0);
      await expect(
        contracts.beneficiaryGovernance
          .connect(voter1)
          .vote(PROPOSALID, Vote.Yes)
      ).to.be.revertedWith("must have voice credits from staking");
    });
    it("should vote yes to a newly created proposal", async function () {
      const voiceCredits = 100;
      await contracts.mockPop.mint(voter1.address, parseEther("50"));
      await contracts.mockStaking.mock.getVoiceCredits.returns(voiceCredits);

      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);
      const proposal = await contracts.beneficiaryGovernance.proposals(
        PROPOSALID
      );

      expect(proposal.noCount).to.equal(0);
      expect(proposal.voterCount).to.equal(1);
      expect(proposal.yesCount).to.equal(voiceCredits);
      expect(
        await contracts.beneficiaryGovernance.hasVoted(
          PROPOSALID,
          voter1.address
        )
      ).to.equal(true);
    });
    it("should prevent an address to vote more than one time to a proposal", async function () {
      await contracts.mockStaking.mock.getVoiceCredits.returns(50);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);
      await expect(
        contracts.beneficiaryGovernance
          .connect(voter1)
          .vote(PROPOSALID, Vote.Yes)
      ).to.be.revertedWith("address already voted for the proposal");
    });
    it("should prevent to vote yes during veto period", async function () {
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await expect(
        contracts.beneficiaryGovernance
          .connect(voter1)
          .vote(PROPOSALID, Vote.Yes)
      ).to.be.revertedWith("Initial voting period has already finished!");
    });
    it("should prevent to vote after the end of the total voting period", async function () {
      ethers.provider.send("evm_increaseTime", [2 * 2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await expect(
        contracts.beneficiaryGovernance
          .connect(voter1)
          .vote(PROPOSALID, Vote.No)
      ).to.be.revertedWith("Proposal is no longer in voting period");
    });
    it("should update proposal correctly", async function () {
      //two yes votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);

      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.Yes);

      //three no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(50);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(60);
      await contracts.beneficiaryGovernance
        .connect(voter5)
        .vote(PROPOSALID, Vote.No);

      //get proposal info
      const proposal = await contracts.beneficiaryGovernance.proposals(
        PROPOSALID
      );

      const noCount = 40 + 50 + 60;
      const yesCount = 20 + 30;
      const voterCount = 5;
      expect(proposal.noCount).to.equal(noCount);
      expect(proposal.voterCount).to.equal(voterCount);
      expect(proposal.yesCount).to.equal(yesCount);
    });
    it("should finalize voting if at the end of the voting perid novotes be more than yesvotes", async function () {
      //one yes vote
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);

      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(50);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.No);

      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      await contracts.mockStaking.mock.getVoiceCredits.returns(60);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .finalize(PROPOSALID);

      //get proposal info
      const proposal = await contracts.beneficiaryGovernance.proposals(
        PROPOSALID
      );

      expect(proposal.status).to.equal(ProposalStatus.Failed);
    });
    it("should prevent voting if the voting is finalized", async function () {
      //one yes vote
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);

      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(50);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.No);

      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      await contracts.mockStaking.mock.getVoiceCredits.returns(60);
      await expect(
        contracts.beneficiaryGovernance
          .connect(voter5)
          .vote(PROPOSALID, Vote.No)
      ).to.be.revertedWith("Proposal is no longer in voting period");
    });
    it("should countinue voting if at the end of the initial voting yesvotes are more than novotes", async function () {
      //three yes votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.Yes);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter5)
        .vote(PROPOSALID, Vote.No);

      //get proposal info
      const proposal = await contracts.beneficiaryGovernance.proposals(
        PROPOSALID
      );
      expect(proposal.status).to.equal(ProposalStatus.ChallengePeriod);
      expect(proposal.voterCount).to.equal(5);
    });
  });
  describe("finalize", function () {
    beforeEach(async function () {
      const Staking = await ethers.getContractFactory("Staking");
      contracts.mockStaking = await waffle.deployMockContract(
        governance,
        Staking.interface.format() as any
      );

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      contracts.mockPop = await MockERC20.deploy("TestPOP", "TPOP", 18);
      await contracts.mockPop.mint(beneficiary.address, parseEther("50"));
      await contracts.mockPop.mint(governance.address, parseEther("50"));
      await contracts.mockPop.mint(beneficiary2.address, parseEther("50"));
      await contracts.mockPop.mint(proposer1.address, parseEther("2000"));
      await contracts.mockPop.mint(proposer2.address, parseEther("2000"));

      const BeneficiaryRegistry = await ethers.getContractFactory(
        "BeneficiaryRegistry"
      );
      contracts.beneficiaryRegistry = await (
        await BeneficiaryRegistry.deploy(contracts.region.address)
      ).deployed();

      const BeneficiaryNomination = await ethers.getContractFactory(
        "BeneficiaryGovernance"
      );
      contracts.beneficiaryGovernance = await (
        await BeneficiaryNomination.deploy(
          contracts.mockStaking.address,
          contracts.beneficiaryRegistry.address,
          contracts.mockPop.address,
          contracts.region.address,
          governance.address
        )
      ).deployed();

      // pass the Beneficiary governance contract address as the governance address for the beneficiary registry contract

      // create a BNP proposal
      await contracts.mockPop
        .connect(proposer1)
        .approve(contracts.beneficiaryGovernance.address, parseEther("2000"));
      await contracts.beneficiaryGovernance
        .connect(proposer1)
        .createProposal(
          beneficiary.address,
          DEFAULT_REGION,
          ethers.utils.formatBytes32String("testCid"),
          ProposalType.BNP
        );
    });
    it("should finalize a voting during challenge period if novotes are more than yes votes", async function () {
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(10);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.Yes);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      await contracts.beneficiaryGovernance.connect(owner).finalize(PROPOSALID);
      //get proposal info
      const proposal = await contracts.beneficiaryGovernance.proposals(
        PROPOSALID
      );
      expect(proposal.status).to.equal(ProposalStatus.Failed);
    });
    it("should prevent finalizing  a finalized voting", async function () {
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(10);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.Yes);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      await contracts.beneficiaryGovernance.connect(owner).finalize(PROPOSALID);
      await expect(
        contracts.beneficiaryGovernance.connect(owner).finalize(PROPOSALID)
      ).to.be.revertedWith("Finalization not allowed");
    });

    it("should prevent finalizing  when the veto perid has not ended yet and novotes is more than novotes", async function () {
      //three yes votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.Yes);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter5)
        .vote(PROPOSALID, Vote.No);

      await expect(
        contracts.beneficiaryGovernance.connect(owner).finalize(PROPOSALID)
      ).to.be.revertedWith("Finalization not allowed");
    });
    it("should prevent finalizing  before the initial voting is over yet and novotes is more than novotes", async function () {
      //three yes votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.No);

      await expect(
        contracts.beneficiaryGovernance.connect(owner).finalize(PROPOSALID)
      ).to.be.revertedWith("Finalization not allowed");
    });
    it("should register the beneficiary after a successful BNP voting", async function () {
      await contracts.beneficiaryRegistry.transferOwnership(
        contracts.beneficiaryGovernance.address
      );

      //three yes votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.Yes);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter5)
        .vote(PROPOSALID, Vote.No);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      //finalize
      await contracts.beneficiaryGovernance
        .connect(governance)
        .finalize(PROPOSALID);

      expect(
        await contracts.beneficiaryRegistry.beneficiaryExists(
          beneficiary.address
        )
      ).to.equal(true);
    });
    it("should remove beneficiary after a successful BTP voting", async function () {
      await contracts.beneficiaryRegistry.transferOwnership(
        contracts.beneficiaryGovernance.address
      );
      // register beneficiary:
      //three yes votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(80);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.Yes);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .vote(PROPOSALID, Vote.No);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      //finalize
      await contracts.beneficiaryGovernance
        .connect(governance)
        .finalize(PROPOSALID);

      //await contracts.beneficiaryRegistryContract.approveOwner(contracts.beneficiaryGovernance.address);

      //create takedown proposal
      await contracts.mockPop
        .connect(proposer2)
        .approve(contracts.beneficiaryGovernance.address, parseEther("2000"));
      await contracts.beneficiaryGovernance
        .connect(proposer2)
        .createProposal(
          beneficiary.address,
          DEFAULT_REGION,
          ethers.utils.formatBytes32String("testCid"),
          ProposalType.BTP
        );

      //three yes votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID_BTP, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID_BTP, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID_BTP, Vote.Yes);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .vote(PROPOSALID_BTP, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter5)
        .vote(PROPOSALID_BTP, Vote.No);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      //finalize
      await contracts.beneficiaryGovernance
        .connect(governance)
        .finalize(PROPOSALID_BTP);

      expect(
        await contracts.beneficiaryRegistry.beneficiaryExists(
          beneficiary.address
        )
      ).to.equal(false);
    });
  });

  describe("claimBond", function () {
    beforeEach(async function () {
      const Staking = await ethers.getContractFactory("Staking");
      contracts.mockStaking = await waffle.deployMockContract(
        governance,
        Staking.interface.format() as any
      );

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      contracts.mockPop = await MockERC20.deploy("TestPOP", "TPOP", 18);
      await contracts.mockPop.mint(beneficiary.address, parseEther("50"));
      await contracts.mockPop.mint(governance.address, parseEther("50"));
      await contracts.mockPop.mint(beneficiary2.address, parseEther("50"));
      await contracts.mockPop.mint(proposer1.address, parseEther("2000"));
      await contracts.mockPop.mint(proposer2.address, parseEther("2000"));

      const BeneficiaryRegistry = await ethers.getContractFactory(
        "BeneficiaryRegistry"
      );
      contracts.beneficiaryRegistry = await (
        await BeneficiaryRegistry.deploy(contracts.region.address)
      ).deployed();

      const BeneficiaryNomination = await ethers.getContractFactory(
        "BeneficiaryGovernance"
      );
      contracts.beneficiaryGovernance = await (
        await BeneficiaryNomination.deploy(
          contracts.mockStaking.address,
          contracts.beneficiaryRegistry.address,
          contracts.mockPop.address,
          contracts.region.address,
          governance.address
        )
      ).deployed();

      // pass the Beneficiary governance contract address as the governance address for the beneficiary registry contract

      // create a BNP proposal
      await contracts.mockPop
        .connect(proposer1)
        .approve(contracts.beneficiaryGovernance.address, parseEther("2000"));
      await contracts.beneficiaryGovernance
        .connect(proposer1)
        .createProposal(
          beneficiary.address,
          DEFAULT_REGION,
          ethers.utils.formatBytes32String("testCid"),
          ProposalType.BNP
        );
    });
    it("should prevent claiming bond whith address other than the proposer address", async function () {
      await expect(
        contracts.beneficiaryGovernance.connect(owner).claimBond(PROPOSALID)
      ).to.be.revertedWith("only the proposer may call this function");
    });
    it("should prevent claiming bond for a proposal which has not passed.", async function () {
      //one yes vote
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);

      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(50);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.No);

      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      await contracts.mockStaking.mock.getVoiceCredits.returns(60);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .finalize(PROPOSALID);

      await expect(
        contracts.beneficiaryGovernance.connect(proposer1).claimBond(PROPOSALID)
      ).to.be.revertedWith("Proposal failed or is processing!");
    });
    it("should be able to claim bond after a proposal passed.", async function () {
      await contracts.beneficiaryRegistry.transferOwnership(
        contracts.beneficiaryGovernance.address
      );

      //three yes votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter1)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter2)
        .vote(PROPOSALID, Vote.Yes);
      await contracts.mockStaking.mock.getVoiceCredits.returns(40);
      await contracts.beneficiaryGovernance
        .connect(voter3)
        .vote(PROPOSALID, Vote.Yes);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      //two no votes
      await contracts.mockStaking.mock.getVoiceCredits.returns(30);
      await contracts.beneficiaryGovernance
        .connect(voter4)
        .vote(PROPOSALID, Vote.No);
      await contracts.mockStaking.mock.getVoiceCredits.returns(20);
      await contracts.beneficiaryGovernance
        .connect(voter5)
        .vote(PROPOSALID, Vote.No);
      ethers.provider.send("evm_increaseTime", [2 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      //finalize
      await contracts.beneficiaryGovernance
        .connect(governance)
        .finalize(PROPOSALID);

      //claim bond
      const amount = parseEther("2000");

      expect(
        await contracts.beneficiaryGovernance
          .connect(proposer1)
          .claimBond(PROPOSALID)
      )
        .to.emit(contracts.beneficiaryGovernance, "BondWithdrawn")
        .withArgs(proposer1.address, amount);

      expect(
        await contracts.mockPop.connect(proposer1).balanceOf(proposer1.address)
      ).to.equal(parseEther("2000"));
    });
  });
});
