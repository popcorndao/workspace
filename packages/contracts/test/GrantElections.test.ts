import { MockContract } from "@ethereum-waffle/mock-contract";
import { parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { GrantElectionAdapter } from "../scripts/helpers/GrantElectionAdapter";
import { GrantElections, MockERC20 } from "../typechain";

interface Contracts {
  mockPop: MockERC20;
  mockStaking: MockContract;
  mockBeneficiaryRegistry: MockContract;
  mockGrantRegistry: MockContract;
  mockRandomNumberConsumer: MockContract;
  grantElections: GrantElections;
}

let owner: SignerWithAddress,
  nonOwner: SignerWithAddress,
  beneficiary: SignerWithAddress,
  beneficiary2: SignerWithAddress,
  beneficiary3: SignerWithAddress,
  beneficiary4: SignerWithAddress,
  beneficiary5: SignerWithAddress,
  voter1: SignerWithAddress,
  voter2: SignerWithAddress,
  voter3: SignerWithAddress,
  voter4: SignerWithAddress,
  voter5: SignerWithAddress,
  voter6: SignerWithAddress,
  governance: SignerWithAddress;

let contracts: Contracts;

const GRANT_TERM = { MONTH: 0, QUARTER: 1, YEAR: 2 };
const ONE_DAY = 86400;
const ElectionState = { Registration: 0, Voting: 1, Closed: 2 };
const registrationBondMonth = parseEther("50");
const registrationBondQuarter = parseEther("100");

async function deployContracts(): Promise<Contracts> {
  const mockPop = await (
    await (
      await ethers.getContractFactory("MockERC20")
    ).deploy("TestPOP", "TPOP", 18)
  ).deployed();
  await mockPop.mint(owner.address, parseEther("2500"));
  await mockPop.mint(beneficiary.address, parseEther("500"));
  await mockPop.mint(beneficiary2.address, parseEther("500"));
  await mockPop.mint(beneficiary3.address, parseEther("500"));
  await mockPop.mint(beneficiary4.address, parseEther("500"));
  await mockPop.mint(beneficiary5.address, parseEther("500"));

  const stakingFactory = await ethers.getContractFactory("Staking");
  const mockStaking = await waffle.deployMockContract(
    owner,
    stakingFactory.interface.format() as any[]
  );

  const beneficiaryRegistryFactory = await ethers.getContractFactory(
    "BeneficiaryRegistry"
  );
  const mockBeneficiaryRegistry = await waffle.deployMockContract(
    owner,
    beneficiaryRegistryFactory.interface.format() as any[]
  );

  const GrantRegistryFactory = await ethers.getContractFactory("GrantRegistry");
  const mockGrantRegistry = await waffle.deployMockContract(
    owner,
    GrantRegistryFactory.interface.format() as any[]
  );

  const randomNumberConsumerFactory = await ethers.getContractFactory(
    "RandomNumberConsumer"
  );
  const mockRandomNumberConsumer = await waffle.deployMockContract(
    owner,
    randomNumberConsumerFactory.interface.format() as any[]
  );

  const grantElections = (await (
    await (
      await ethers.getContractFactory("GrantElections")
    ).deploy(
      mockStaking.address,
      mockBeneficiaryRegistry.address,
      mockGrantRegistry.address,
      mockRandomNumberConsumer.address,
      mockPop.address,
      governance.address
    )
  ).deployed()) as GrantElections;
  await mockPop
    .connect(owner)
    .approve(grantElections.address, parseEther("100000"));
  await grantElections.connect(owner).contributeReward(parseEther("2000"));
  await grantElections.initialize(GRANT_TERM.MONTH);
  return {
    mockPop,
    mockStaking,
    mockBeneficiaryRegistry,
    mockGrantRegistry,
    mockRandomNumberConsumer,
    grantElections,
  };
}

describe("GrantElections", function () {
  beforeEach(async function () {
    [
      owner,
      nonOwner,
      beneficiary,
      beneficiary2,
      beneficiary3,
      beneficiary4,
      beneficiary5,
      voter1,
      voter2,
      voter3,
      voter4,
      voter5,
      voter6,
      governance,
    ] = await ethers.getSigners();
    contracts = await deployContracts();
  });

  describe("defaults", function () {
    it("should set correct monthly defaults", async function () {
      const monthly = await GrantElectionAdapter(
        contracts.grantElections
      ).electionDefaults(GRANT_TERM.MONTH);
      expect(monthly).to.deep.contains({
        registrationBondRequired: true,
        registrationBond: parseEther("50"),
        useChainLinkVRF: true,
        ranking: 3,
        awardees: 1,
        registrationPeriod: 7 * ONE_DAY,
        votingPeriod: 7 * ONE_DAY,
        cooldownPeriod: 21 * ONE_DAY,
      });
    });

    it("should set correct quarterly defaults", async function () {
      const quarterly = await GrantElectionAdapter(
        contracts.grantElections
      ).electionDefaults(GRANT_TERM.QUARTER);
      expect(quarterly).to.deep.contains({
        registrationBondRequired: true,
        registrationBond: parseEther("100"),
        useChainLinkVRF: true,
        ranking: 5,
        awardees: 2,
        registrationPeriod: 14 * ONE_DAY,
        votingPeriod: 14 * ONE_DAY,
        cooldownPeriod: 83 * ONE_DAY,
      });
    });
    it("should set correct yearly defaults", async function () {
      const yearly = await GrantElectionAdapter(
        contracts.grantElections
      ).electionDefaults(GRANT_TERM.YEAR);
      expect(yearly).to.deep.contains({
        registrationBondRequired: true,
        registrationBond: parseEther("1000"),
        useChainLinkVRF: true,
        ranking: 7,
        awardees: 3,
        registrationPeriod: 30 * ONE_DAY,
        votingPeriod: 30 * ONE_DAY,
        cooldownPeriod: 358 * ONE_DAY,
      });
    });

    it("should set configuration for grant elections", async function () {
      await contracts.grantElections
        .connect(governance)
        .setConfiguration(
          GRANT_TERM.QUARTER,
          10,
          15,
          false,
          false,
          0,
          100,
          100,
          100
        );
      const quarter = await GrantElectionAdapter(
        contracts.grantElections
      ).electionDefaults(GRANT_TERM.QUARTER);
      expect(quarter).to.deep.contains({
        useChainLinkVRF: false,
        ranking: 15,
        awardees: 10,
        registrationBond: parseEther("0"),
        registrationBondRequired: false,
        registrationPeriod: 100,
        votingPeriod: 100,
        cooldownPeriod: 100,
      });
    });
  });

  describe("setters", function () {
    it("should prevent non-governance address from updating governance address", async function () {
      await expect(
        contracts.grantElections
          .connect(nonOwner)
          .nominateNewGovernance(nonOwner.address)
      ).to.be.revertedWith(
        "Only the contract governance may perform this action"
      );
    });

    it("should allow governance to set new governance address", async function () {
      await expect(
        contracts.grantElections
          .connect(governance)
          .nominateNewGovernance(nonOwner.address)
      )
        .to.emit(contracts.grantElections, "GovernanceNominated")
        .withArgs(nonOwner.address);
    });
  });

  describe("registration", function () {
    it("should allow beneficiary to register for election with no bond when bond disabled", async function () {
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.grantElections
        .connect(governance)
        .toggleRegistrationBondRequirement(GRANT_TERM.YEAR);
      await contracts.grantElections.initialize(GRANT_TERM.YEAR);
      await contracts.grantElections.registerForElection(
        beneficiary.address,
        GRANT_TERM.YEAR
      );
      const metadata = await GrantElectionAdapter(
        contracts.grantElections
      ).getElectionMetadata(GRANT_TERM.YEAR);
      expect(metadata).to.deep.contains({
        registeredBeneficiaries: [beneficiary.address],
      });
    });

    it("should prevent beneficiary to register for election without a bond", async function () {
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.grantElections.initialize(GRANT_TERM.YEAR);
      await expect(
        contracts.grantElections.registerForElection(
          beneficiary.address,
          GRANT_TERM.YEAR
        )
      ).to.be.revertedWith("insufficient registration bond balance");
    });

    it("should allow beneficiary to register for election with a bond", async function () {
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.grantElections.initialize(GRANT_TERM.YEAR);
      await contracts.mockPop.mint(beneficiary2.address, parseEther("1000"));
      await contracts.mockPop
        .connect(beneficiary2)
        .approve(contracts.grantElections.address, parseEther("1000"));

      await contracts.grantElections
        .connect(beneficiary2)
        .registerForElection(beneficiary2.address, GRANT_TERM.YEAR);

      const metadata = await GrantElectionAdapter(
        contracts.grantElections
      ).getElectionMetadata(GRANT_TERM.YEAR);

      expect(metadata).to.deep.contains({
        registeredBeneficiaries: [beneficiary2.address],
      });

      const bennies = await contracts.grantElections.getRegisteredBeneficiaries(
        GRANT_TERM.YEAR
      );
      expect(bennies).to.deep.equal([beneficiary2.address]);
    });

    it("should transfer POP to election contract on registration", async function () {
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.grantElections.initialize(GRANT_TERM.YEAR);
      await contracts.mockPop.mint(beneficiary2.address, parseEther("1000"));
      await contracts.mockPop
        .connect(beneficiary2)
        .approve(contracts.grantElections.address, parseEther("1000"));

      await contracts.grantElections
        .connect(beneficiary2)
        .registerForElection(beneficiary2.address, GRANT_TERM.YEAR);

      const popBalanceForElection = await contracts.mockPop.balanceOf(
        contracts.grantElections.address
      );
      expect(popBalanceForElection).to.equal(parseEther("3000"));
    });
  });

  describe("initialization", function () {
    it("should successfully initialize an election if one hasn't already been created", async function () {
      const currentBlock = await waffle.provider.getBlock("latest");
      const result = await contracts.grantElections.initialize(
        GRANT_TERM.QUARTER
      );
      expect(result)
        .to.emit(contracts.grantElections, "ElectionInitialized")
        .withArgs(GRANT_TERM.QUARTER, currentBlock.timestamp + 1);
      expect(result)
        .to.emit(contracts.grantElections, "VaultInitialized")
        .withArgs(
          ethers.utils.solidityKeccak256(
            ["uint8", "uint256"],
            [GRANT_TERM.QUARTER, currentBlock.timestamp + 1]
          )
        );
    });

    it("should set correct election metadata", async function () {
      await contracts.grantElections.initialize(GRANT_TERM.QUARTER);
      const metadata = await GrantElectionAdapter(
        contracts.grantElections
      ).getElectionMetadata(GRANT_TERM.QUARTER);
      expect(metadata).to.deep.equal({
        votes: [],
        electionTerm: GRANT_TERM.QUARTER,
        registeredBeneficiaries: [],
        electionState: ElectionState.Registration,
        registrationBond: parseEther("100"),
        registrationBondRequired: true,
        configuration: {
          awardees: 2,
          ranking: 5,
        },
        useChainlinkVRF: true,
        periods: {
          cooldownPeriod: 83 * ONE_DAY, // 83 days
          registrationPeriod: 14 * ONE_DAY, // 14 days
          votingPeriod: 14 * ONE_DAY, // 14 days
        },
        //startTime varies to much as that it could be accurately defined
        startTime: metadata.startTime,
      });
    });

    it("should prevent an election from initializing if it isn't closed", async function () {
      await contracts.grantElections.initialize(GRANT_TERM.QUARTER);
      await expect(
        contracts.grantElections.initialize(GRANT_TERM.QUARTER)
      ).to.be.revertedWith("election not yet closed");
    });
    it("should not initialize a vault even the neede budget is larger than rewardBudget", async function () {
      await contracts.grantElections
        .connect(governance)
        .setRewardsBudget(parseEther("3000"));
      const currentBlock = await waffle.provider.getBlock("latest");
      const result = await contracts.grantElections.initialize(
        GRANT_TERM.QUARTER
      );
      expect(result)
        .to.emit(contracts.grantElections, "ElectionInitialized")
        .withArgs(GRANT_TERM.QUARTER, currentBlock.timestamp + 1);
      expect(result).to.not.emit(contracts.grantElections, "VaultInitialized");
      const election = await contracts.grantElections.elections(
        GRANT_TERM.QUARTER
      );
      expect(election.vaultId).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  });

  describe("voting", function () {
    it("should require voice credits", async function () {
      await expect(
        contracts.grantElections.vote([], [], GRANT_TERM.MONTH)
      ).to.be.revertedWith("Voice credits are required");
    });

    it("should require beneficiaries", async function () {
      await expect(
        contracts.grantElections.vote([], [1], GRANT_TERM.MONTH)
      ).to.be.revertedWith("Beneficiaries are required");
    });

    it("should require election open for voting", async function () {
      await expect(
        contracts.grantElections.vote(
          [beneficiary.address],
          [1],
          GRANT_TERM.MONTH
        )
      ).to.be.revertedWith("Election not open for voting");
    });

    it("should require staked voice credits", async function () {
      ethers.provider.send("evm_increaseTime", [7 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.mockStaking.mock.getVoiceCredits.returns(0);
      await expect(
        contracts.grantElections.vote(
          [beneficiary.address],
          [1],
          GRANT_TERM.MONTH
        )
      ).to.be.revertedWith("must have voice credits from staking");
    });

    it("should require eligible beneficiary", async function () {
      ethers.provider.send("evm_increaseTime", [7 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.mockStaking.mock.getVoiceCredits.returns(10);
      await expect(
        contracts.grantElections.vote(
          [beneficiary.address],
          [1],
          GRANT_TERM.MONTH
        )
      ).to.be.revertedWith("ineligible beneficiary");
    });

    it("should vote successfully", async function () {
      ethers.provider.send("evm_increaseTime", [7 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      await contracts.mockPop
        .connect(beneficiary)
        .approve(contracts.grantElections.address, registrationBondMonth);

      await contracts.mockStaking.mock.getVoiceCredits.returns(10);
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.grantElections
        .connect(beneficiary)
        .registerForElection(beneficiary.address, GRANT_TERM.MONTH);
      await contracts.grantElections.vote(
        [beneficiary.address],
        [5],
        GRANT_TERM.MONTH
      );
      const metadata = await GrantElectionAdapter(
        contracts.grantElections
      ).getElectionMetadata(GRANT_TERM.MONTH);
      expect(metadata["votes"]).to.deep.eq([
        {
          voter: owner.address,
          beneficiary: beneficiary.address,
          weight: Math.round(Math.sqrt(5)),
        },
      ]);
    });

    it("should not allow to vote twice for same address and grant term", async function () {
      ethers.provider.send("evm_increaseTime", [7 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.mockPop
        .connect(beneficiary)
        .approve(contracts.grantElections.address, registrationBondMonth);
      await contracts.mockStaking.mock.getVoiceCredits.returns(10);
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.grantElections
        .connect(beneficiary)
        .registerForElection(beneficiary.address, GRANT_TERM.MONTH);
      await contracts.grantElections.vote(
        [beneficiary.address],
        [5],
        GRANT_TERM.MONTH
      );
      await expect(
        contracts.grantElections.vote(
          [beneficiary.address],
          [1],
          GRANT_TERM.MONTH
        )
      ).to.be.revertedWith("address already voted for election term");
    });
  });

  describe("getCurrentRanking", function () {
    it("return current ranking", async function () {
      ethers.provider.send("evm_increaseTime", [7 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.mockPop
        .connect(beneficiary)
        .approve(contracts.grantElections.address, registrationBondMonth);
      await contracts.grantElections
        .connect(beneficiary)
        .registerForElection(beneficiary.address, GRANT_TERM.MONTH);
      await contracts.mockPop
        .connect(beneficiary2)
        .approve(contracts.grantElections.address, registrationBondMonth);
      await contracts.grantElections
        .connect(beneficiary2)
        .registerForElection(beneficiary2.address, GRANT_TERM.MONTH);
      await contracts.mockPop
        .connect(beneficiary3)
        .approve(contracts.grantElections.address, registrationBondMonth);
      await contracts.grantElections
        .connect(beneficiary3)
        .registerForElection(beneficiary3.address, GRANT_TERM.MONTH);
      await contracts.mockPop
        .connect(beneficiary4)
        .approve(contracts.grantElections.address, registrationBondMonth);
      await contracts.grantElections
        .connect(beneficiary4)
        .registerForElection(beneficiary4.address, GRANT_TERM.MONTH);
      await contracts.mockPop
        .connect(beneficiary5)
        .approve(contracts.grantElections.address, registrationBondMonth);
      await contracts.grantElections
        .connect(beneficiary5)
        .registerForElection(beneficiary5.address, GRANT_TERM.MONTH);
      await contracts.mockStaking.mock.getVoiceCredits.returns(1000);
      await contracts.grantElections
        .connect(voter1)
        .vote([beneficiary.address], [50], GRANT_TERM.MONTH);
      expect(
        await contracts.grantElections.getCurrentRanking(GRANT_TERM.MONTH)
      ).to.deep.eq([
        beneficiary.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
      ]);
      await contracts.grantElections
        .connect(voter2)
        .vote([beneficiary2.address], [100], GRANT_TERM.MONTH);
      expect(
        await contracts.grantElections.getCurrentRanking(GRANT_TERM.MONTH)
      ).to.deep.eq([
        beneficiary2.address,
        beneficiary.address,
        "0x0000000000000000000000000000000000000000",
      ]);
      await contracts.grantElections
        .connect(voter3)
        .vote([beneficiary3.address], [70], GRANT_TERM.MONTH);
      expect(
        await contracts.grantElections.getCurrentRanking(GRANT_TERM.MONTH)
      ).to.deep.eq([
        beneficiary2.address,
        beneficiary3.address,
        beneficiary.address,
      ]);
      await contracts.grantElections
        .connect(voter4)
        .vote([beneficiary4.address], [100], GRANT_TERM.MONTH);
      expect(
        await contracts.grantElections.getCurrentRanking(GRANT_TERM.MONTH)
      ).to.deep.eq([
        beneficiary2.address,
        beneficiary4.address,
        beneficiary3.address,
      ]);
      await contracts.grantElections
        .connect(voter5)
        .vote([beneficiary5.address], [10], GRANT_TERM.MONTH);
      expect(
        await contracts.grantElections.getCurrentRanking(GRANT_TERM.MONTH)
      ).to.deep.eq([
        beneficiary2.address,
        beneficiary4.address,
        beneficiary3.address,
      ]);
      await contracts.grantElections
        .connect(voter6)
        .vote(
          [beneficiary4.address, beneficiary5.address, beneficiary3.address],
          [10, 200, 20],
          GRANT_TERM.MONTH
        );
      expect(
        await contracts.grantElections.getCurrentRanking(GRANT_TERM.MONTH)
      ).to.deep.eq([
        beneficiary5.address,
        beneficiary4.address,
        beneficiary2.address,
      ]);
    });
  });

  describe("finalization", function () {
    it("require election closed", async function () {
      await expect(
        contracts.grantElections.finalize(GRANT_TERM.MONTH)
      ).to.be.revertedWith("election not yet closed");
    });

    it("require not finalized", async function () {
      ethers.provider.send("evm_increaseTime", [30 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);

      await contracts.grantElections.refreshElectionState(GRANT_TERM.MONTH);
      await contracts.mockGrantRegistry.mock.createGrant.returns();
      await contracts.mockRandomNumberConsumer.mock.getRandomNumber.returns();
      await contracts.mockRandomNumberConsumer.mock.randomResult.returns(2893);

      await contracts.grantElections.finalize(GRANT_TERM.MONTH);
      await contracts.mockGrantRegistry.mock.createGrant.returns();
      await contracts.mockRandomNumberConsumer.mock.getRandomNumber.returns();
      await contracts.mockRandomNumberConsumer.mock.randomResult.returns(2893);
      await expect(
        contracts.grantElections.finalize(GRANT_TERM.MONTH)
      ).to.be.revertedWith("election already finalized");
    });

    it("finalizes an election with randomization", async function () {
      await contracts.grantElections.initialize(GRANT_TERM.QUARTER);
      // voting
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.mockPop
        .connect(beneficiary)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary)
        .registerForElection(beneficiary.address, GRANT_TERM.QUARTER);
      await contracts.mockPop
        .connect(beneficiary2)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary2)
        .registerForElection(beneficiary2.address, GRANT_TERM.QUARTER);
      await contracts.mockPop
        .connect(beneficiary3)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary3)
        .registerForElection(beneficiary3.address, GRANT_TERM.QUARTER);
      await contracts.mockPop
        .connect(beneficiary4)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary4)
        .registerForElection(beneficiary4.address, GRANT_TERM.QUARTER);
      await contracts.mockPop
        .connect(beneficiary5)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary5)
        .registerForElection(beneficiary5.address, GRANT_TERM.QUARTER);
      await contracts.mockStaking.mock.getVoiceCredits.returns(1000);
      ethers.provider.send("evm_increaseTime", [14 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.grantElections
        .connect(voter1)
        .vote([beneficiary.address], [10], GRANT_TERM.QUARTER);
      await contracts.grantElections
        .connect(voter2)
        .vote([beneficiary2.address], [20], GRANT_TERM.QUARTER);
      await contracts.grantElections
        .connect(voter3)
        .vote([beneficiary3.address], [30], GRANT_TERM.QUARTER);
      await contracts.grantElections
        .connect(voter4)
        .vote([beneficiary4.address], [40], GRANT_TERM.QUARTER);
      await contracts.grantElections
        .connect(voter5)
        .vote([beneficiary5.address], [50], GRANT_TERM.QUARTER);
      // finalization
      ethers.provider.send("evm_increaseTime", [30 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.grantElections.refreshElectionState(GRANT_TERM.QUARTER);
      await contracts.mockGrantRegistry.mock.createGrant.returns();
      await contracts.mockRandomNumberConsumer.mock.getRandomNumber.returns();
      await contracts.mockRandomNumberConsumer.mock.randomResult.returns(2893);
      expect(await contracts.grantElections.finalize(GRANT_TERM.QUARTER))
        .to.emit(contracts.grantElections, "GrantCreated")
        .withArgs(
          GRANT_TERM.QUARTER,
          [beneficiary2.address, beneficiary3.address],
          [parseEther("50"), parseEther("50")]
        );
    });

    it("finalizes an election without randomization", async function () {
      await contracts.grantElections
        .connect(governance)
        .setConfiguration(
          GRANT_TERM.QUARTER,
          4,
          5,
          false,
          false,
          0,
          14 * ONE_DAY,
          14 * ONE_DAY,
          83 * ONE_DAY
        );
      await contracts.grantElections.initialize(GRANT_TERM.QUARTER);
      // voting
      await contracts.mockBeneficiaryRegistry.mock.beneficiaryExists.returns(
        true
      );
      await contracts.mockPop
        .connect(beneficiary)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary)
        .registerForElection(beneficiary.address, GRANT_TERM.QUARTER);
      await contracts.mockPop
        .connect(beneficiary2)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary2)
        .registerForElection(beneficiary2.address, GRANT_TERM.QUARTER);
      await contracts.mockPop
        .connect(beneficiary3)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary3)
        .registerForElection(beneficiary3.address, GRANT_TERM.QUARTER);
      await contracts.mockPop
        .connect(beneficiary4)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary4)
        .registerForElection(beneficiary4.address, GRANT_TERM.QUARTER);
      await contracts.mockPop
        .connect(beneficiary5)
        .approve(contracts.grantElections.address, registrationBondQuarter);
      await contracts.grantElections
        .connect(beneficiary5)
        .registerForElection(beneficiary5.address, GRANT_TERM.QUARTER);
      await contracts.mockStaking.mock.getVoiceCredits.returns(1000);
      ethers.provider.send("evm_increaseTime", [14 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.grantElections
        .connect(voter1)
        .vote([beneficiary.address], [5], GRANT_TERM.QUARTER);
      await contracts.grantElections
        .connect(voter2)
        .vote([beneficiary2.address], [40], GRANT_TERM.QUARTER);
      await contracts.grantElections
        .connect(voter3)
        .vote([beneficiary3.address], [30], GRANT_TERM.QUARTER);
      await contracts.grantElections
        .connect(voter4)
        .vote([beneficiary4.address], [50], GRANT_TERM.QUARTER);
      await contracts.grantElections
        .connect(voter5)
        .vote([beneficiary5.address], [10], GRANT_TERM.QUARTER);
      // finalization
      ethers.provider.send("evm_increaseTime", [30 * ONE_DAY]);
      ethers.provider.send("evm_mine", []);
      await contracts.grantElections.refreshElectionState(GRANT_TERM.QUARTER);
      await contracts.mockGrantRegistry.mock.createGrant.returns();
      expect(await contracts.grantElections.finalize(GRANT_TERM.QUARTER))
        .to.emit(contracts.grantElections, "GrantCreated")
        .withArgs(
          GRANT_TERM.QUARTER,
          [
            beneficiary4.address,
            beneficiary2.address,
            beneficiary3.address,
            beneficiary5.address,
          ],
          [
            parseEther("25"),
            parseEther("25"),
            parseEther("25"),
            parseEther("25"),
          ]
        );
    });
  });
});
