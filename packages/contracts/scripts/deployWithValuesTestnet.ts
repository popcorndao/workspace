import { parseEther } from "ethers/lib/utils";
import { GrantElectionAdapter } from "./helpers/GrantElectionAdapter";
import bluebird from "bluebird";
import { BigNumber, Contract, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
/*import BeneficiaryRegistryAbi from "../artifacts/contracts/BeneficiaryRegistry.sol/BeneficiaryRegistry.json";
import GrantRegistryAbi from "../artifacts/contracts/GrantRegistry.sol/GrantRegistry.json";
import MockERC20Abi from "../artifacts/contracts/mocks/MockERC20.sol/MockERC20.json";
import StakingAbi from "../artifacts/contracts/Staking.sol/Staking.json";
import RandomNumberConsumerAbi from "../artifacts/contracts/RandomNumberConsumer.sol/RandomNumberConsumer.json";
import GrantElectionsAbi from "../artifacts/contracts/GrantElections.sol/GrantElections.json";
import TreasuryAbi from "../artifacts/contracts/mocks/MockTreasury.sol/MockTreasury.json";
import BeneficiaryVaultsAbi from "../artifacts/contracts/BeneficiaryVaults.sol/BeneficiaryVaults.json";
import InsuranceAbi from "../artifacts/contracts/mocks/MockInsurance.sol/MockInsurance.json";
import RewardsManagerAbi from "../artifacts/contracts/RewardsManager.sol/RewardsManager.json";*/

// This script creates two beneficiaries and one quarterly grant that they are both eligible for. Run this
// Run this instead of the normal deploy.js script

interface Contracts {
  beneficiaryRegistry: Contract;
  grantRegistry: Contract;
  mockPop: Contract;
  staking: Contract;
  randomNumberConsumer: Contract;
  grantElections: Contract;
  beneficiaryVaults:Contract,
  treasury:Contract,
  insurance:Contract,
  rewardsManager:Contract;
}

export default async function deployTestnet(ethers): Promise<void> {
  const GrantTerm = { Month: 0, Quarter: 1, Year: 2 };
  const GrantTermMap = { 0: "Monthly", 1: "Quarterly", 2: "Yearly" };
  let accounts: SignerWithAddress[];
  let bennies;
  let contracts: Contracts;

  const setSigners = async (): Promise<void> => {
    accounts = await ethers.getSigners();
    bennies = accounts.slice(1, 20);
  };

  const deployContracts = async (): Promise<void> => {
    console.log("deploying contracts ...");

    const beneficiaryRegistry = await (
      await ethers.getContractFactory("BeneficiaryRegistry")
    ).deploy();
    await beneficiaryRegistry.deployTransaction.wait(2);

    const grantRegistry = await (
      await ethers.getContractFactory("GrantRegistry")
    ).deploy(beneficiaryRegistry.address);
    await grantRegistry.deployTransaction.wait(2);

    const mockPop = (await (
      await ethers.getContractFactory("MockERC20")
    ).deploy("TestPOP", "TPOP"));
    await mockPop.deployTransaction.wait(2);

    const staking = await (
      await ethers.getContractFactory("Staking")
    ).deploy(mockPop.address);
    await staking.deployTransaction.wait(2);

    const randomNumberConsumer = await (
      await ethers.getContractFactory("RandomNumberConsumer")
    ).deploy(
      process.env.ADDR_CHAINLINK_VRF_COORDINATOR,
      process.env.ADDR_CHAINLINK_LINK_TOKEN,
      process.env.ADDR_CHAINLINK_KEY_HASH
    );
    await randomNumberConsumer.deployTransaction.wait(2);

    const grantElections = await (
      await ethers.getContractFactory("GrantElections")
    ).deploy(
      staking.address,
      beneficiaryRegistry.address,
      grantRegistry.address,
      randomNumberConsumer.address,
      mockPop.address,
      accounts[0].address
    );
    await grantElections.deployTransaction.wait(2);

    console.log("uniswapRouter");
    const uniswapRouter = new ethers.Contract(
      process.env.ADDR_UNISWAP_ROUTER,
      IUniswapV2Router02.abi,
      ethers.provider
    );
    console.log("uniswapRouter address", uniswapRouter.address);

    console.log("beneficiaryVaults");
    const beneficiaryVaults = await (
      await ethers.getContractFactory("BeneficiaryVaults")
    ).deploy(mockPop.address, beneficiaryRegistry.address);
    console.log("beneficiaryVaults address", beneficiaryVaults.address);
    await beneficiaryVaults.deployTransaction.wait(2)

    console.log("treasury");
    const treasury = await (
      await ethers.getContractFactory("MockTreasury")
    ).deploy();
    console.log("treasury address", treasury.address);
    await treasury.deployTransaction.wait(2)


    console.log("insurance");
    const insurance = await (
      await ethers.getContractFactory("MockInsurance")
    ).deploy();
    console.log("insurance address", insurance.address);
    await insurance.deployTransaction.wait(2)

    console.log("rewardsManager");
    const rewardsManager = await (
      await ethers.getContractFactory("RewardsManager")
    ).deploy(
      mockPop.address,
      staking.address,
      treasury.address,
      insurance.address,
      beneficiaryVaults.address,
      uniswapRouter.address
    );
    console.log("rewardsManager address", rewardsManager.address);
    await rewardsManager.deployTransaction.wait(2)
    logResults();

    contracts = {
      beneficiaryRegistry,
      grantRegistry,
      mockPop,
      staking,
      randomNumberConsumer,
      grantElections,
      beneficiaryVaults,
      treasury,
      insurance,
      rewardsManager
    };
    logResults();
  };

  /*const connectToContracts = async ():Promise<void> => {
    console.log("connect to contracts ...");

    const mockPop = new ethers.Contract(
      process.env.ADDR_TESTNET_POP,
      MockERC20Abi.abi,
      ethers.provider
    );
    console.log("mockPop address", mockPop.address);

    console.log("beneficiaryRegistry");
    const beneficiaryRegistry = new ethers.Contract(
      process.env.ADDR_TESTNET_BENEFICIARY_REGISTRY,
      BeneficiaryRegistryAbi.abi,
      ethers.provider
    );
    console.log(
      "beneficiaryRegistry address",
      beneficiaryRegistry.address
    );

    console.log("grantRegistry");
    const grantRegistry = new ethers.Contract(
      process.env.ADDR_TESTNET_GRANT_REGISTRY,
      GrantRegistryAbi.abi,
      ethers.provider
    );
    console.log("grantRegistry address", grantRegistry.address);

    console.log("staking");
    const staking = new ethers.Contract(
      process.env.ADDR_TESTNET_STAKING,
      StakingAbi.abi,
      ethers.provider
    );
    console.log("staking address", staking.address);

    console.log("randomNumberConsumer");
    const randomNumberConsumer = new ethers.Contract(
      process.env.ADDR_TESTNET_RANDOM_NUMBER,
      RandomNumberConsumerAbi.abi,
      ethers.provider
    );
    console.log(
      "randomNumberConsumer address",
      randomNumberConsumer.address
    );

    console.log("grantElections");
    const grantElections = new ethers.Contract(
      "0x71EaBAFbc969c8Eb8E37c7664204B69fA4144712",
      GrantElectionsAbi.abi,
      ethers.provider
    );
    console.log("grantElections address", grantElections.address);

    console.log("beneficiaryVaults");
    const beneficiaryVaults = new ethers.Contract(
      process.env.ADDR_TESTNET_BENEFICIARY_VAULT,
      BeneficiaryVaultsAbi.abi,
      ethers.provider
    );
    console.log("beneficiaryVaults address", beneficiaryVaults.address);

    console.log("treasury");
    const treasury = new ethers.Contract(
      process.env.ADDR_TESTNET_TREASURY,
      TreasuryAbi.abi,
      ethers.provider
    );
    console.log("treasury address", treasury.address);

    console.log("insurance");
    const insurance = new ethers.Contract(
      process.env.ADDR_TESTNET_INSURANCE,
      InsuranceAbi.abi,
      ethers.provider
    );
    console.log("insurance address", insurance.address);

    console.log("rewardsManager");
    const rewardsManager = new ethers.Contract(
      process.env.ADDR_TESTNET_REWARDS_MANAGER,
      RewardsManagerAbi.abi,
      ethers.provider
    );
    console.log("rewardsManager address", rewardsManager.address);
    contracts = {
      beneficiaryRegistry,
      grantRegistry,
      mockPop,
      staking,
      randomNumberConsumer,
      grantElections,
      beneficiaryVaults,
      treasury,
      insurance,
      rewardsManager
    };
    logResults();
  };*/

  const giveBeneficiariesETH = async (): Promise<void> => {
    console.log("giving ETH to beneficiaries ...");
    await bluebird.map(
      bennies,
      async (beneficiary: SignerWithAddress) => {
        const balance = await ethers.provider.getBalance(beneficiary.address);
        if (balance.lt(parseEther(".01"))) {
          return accounts[0].sendTransaction({
            to: beneficiary.address,
            value: utils.parseEther(".02"),
          });
        }
      },
      { concurrency: 1 }
    );
  };

  const addBeneficiariesToRegistry = async (): Promise<void> => {
    console.log("adding beneficiaries to registry ...");
    await bluebird.map(
      bennies,
      async (beneficiary: SignerWithAddress) => {
        return contracts.beneficiaryRegistry.addBeneficiary(
          beneficiary.address,
          ethers.utils.formatBytes32String("1234"),
          { gasLimit: 3000000 }
        );
      },
      { concurrency: 1 }
    );
  };

  const mintPOP = async (): Promise<void> => {
    console.log("giving everyone POP (yay!) ...");
    await bluebird.map(
      accounts,
      async (account) => {
        return contracts.mockPop.mint(account.address, parseEther("10000"));
      },
      { concurrency: 1 }
    );
    await bluebird.map(
      accounts,
      async (account) => {
        return contracts.mockPop
          .connect(account)
          .approve(contracts.grantElections.address, parseEther("10000"));
      },
      { concurrency: 1 }
    );
  };

  const initializeElectionWithFastVotingEnabled = async (
    grantTerm: number
  ): Promise<void> => {
    console.log(
      `initializing ${GrantTermMap[grantTerm]} election with fast voting enabled ...`
    );
    await contracts.grantElections.setConfiguration(
      grantTerm,
      10,
      10,
      true,
      false,
      0,
      86400 * 30,
      10,
      100
    );

    await contracts.grantElections.initialize(grantTerm);
    console.log(
      await GrantElectionAdapter(contracts.grantElections).electionDefaults(
        grantTerm
      )
    );
  };

  const registerBeneficiariesForElection = async (
    grantTerm,
    bennies
  ): Promise<void> => {
    console.log(
      `registering beneficiaries for election (${GrantTermMap[grantTerm]}) ...`
    );
    await bluebird.map(
      bennies,
      async (beneficiary: SignerWithAddress) => {
        console.log(`registering ${beneficiary.address}`);
        return contracts.grantElections.registerForElection(
          beneficiary.address,
          grantTerm,
          { gasLimit: 3000000 }
        );
      },
      { concurrency: 1 }
    );
  };

  const displayElectionMetadata = async (grantTerm): Promise<void> => {
    console.log(
      `${GrantTermMap[grantTerm]} metadata: `,
      await GrantElectionAdapter(contracts.grantElections).getElectionMetadata(
        grantTerm
      )
    );
  };

  // voting active
  const initializeMonthlyElection = async (): Promise<void> => {
    await initializeElectionWithFastVotingEnabled(GrantTerm.Month);
    await registerBeneficiariesForElection(
      GrantTerm.Month,
      bennies.slice(0, 6)
    );
    await displayElectionMetadata(GrantTerm.Month);
  };

  const stakePOP = async (voters): Promise<void> => {
    console.log("voters are staking POP ...");
    await bluebird.map(voters, async (voter: SignerWithAddress) => {
      return contracts.staking
        .connect(voter)
        .stake(utils.parseEther("1000"), 604800 * 52 * 4);
    });
  };

  const voteForElection = async (
    term,
    voters,
    beneficiaries
  ): Promise<void> => {
    await stakePOP(voters);

    while (
      (await contracts.staking.getVoiceCredits(
        voters[voters.length - 1].address
      )) === BigNumber.from("0")
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      console.log("waiting for vote credits to be ready ...");
    }

    console.log(`${voters.length} voting for ${beneficiaries.length} bennies`);
    console.log("voters are voting in election ...");
    await voters.forEach(async (voter) =>
      console.log(
        await (
          await contracts.staking.getVoiceCredits(voter.address)
        ).toString()
      )
    );
    await bluebird.map(
      voters,
      async (voter: SignerWithAddress) => {
        return contracts.grantElections.connect(voter).vote(
          beneficiaries.map((benny) => benny.address),
          [
            utils.parseEther("100"),
            utils.parseEther("200"),
            utils.parseEther("300"),
            utils.parseEther("350"),
          ],
          term
        );
      },
      { concurrency: 1 }
    );
  };

  // voting completed: to be finalized
  const initializeQuarterlyElection = async (): Promise<void> => {
    // set configuration for fast registration & voting
    // register
    // stake POP to vote
    // add some votes
    // refresh election state
    console.log(
      "initializing quarterly election with fast forwarding to closed state ..."
    );
    await contracts.grantElections.setConfiguration(
      GrantTerm.Quarter,
      1, // 1 awardee
      3, // 3 qualifying
      true,
      false,
      0,
      120, // secs for voting period
      1, // secs for registration period
      100
    );
    await contracts.grantElections.initialize(GrantTerm.Quarter);
    console.log(
      await GrantElectionAdapter(contracts.grantElections).electionDefaults(
        GrantTerm.Quarter
      )
    );
    await registerBeneficiariesForElection(
      GrantTerm.Quarter,
      bennies.slice(7, 14)
    );

    let electionMetadata = await GrantElectionAdapter(
      contracts.grantElections
    ).getElectionMetadata(GrantTerm.Quarter);

    console.log("refreshing election state");
    while (electionMetadata.electionState != 1) {
      await new Promise((r) => setTimeout(r, 1000));
      await contracts.grantElections.refreshElectionState(GrantTerm.Quarter);
      electionMetadata = await GrantElectionAdapter(
        contracts.grantElections
      ).getElectionMetadata(GrantTerm.Quarter);
      console.log("waiting for election to be ready for voting...");
    }

    await voteForElection(
      GrantTerm.Quarter,
      accounts.slice(5, 8),
      bennies.slice(7, 11)
    );

    while (electionMetadata.votes.length < 4) {
      await new Promise((r) => setTimeout(r, 1000));
      electionMetadata = await GrantElectionAdapter(
        contracts.grantElections
      ).getElectionMetadata(GrantTerm.Quarter);
      console.log("waiting for votes to confirm ...");
    }

    console.log("refreshing election state");
    while (electionMetadata.electionState != 2) {
      await contracts.grantElections.refreshElectionState(GrantTerm.Quarter);
      electionMetadata = await GrantElectionAdapter(
        contracts.grantElections
      ).getElectionMetadata(GrantTerm.Quarter);
      await new Promise((r) => setTimeout(r, 1000));
      console.log("waiting for election to close...");
    }

    await displayElectionMetadata(GrantTerm.Quarter);
  };

  // registration period
  const initializeYearlyElection = async (): Promise<void> => {
    console.log("initializing yearly election ...");
    await contracts.grantElections.initialize(GrantTerm.Year);
    await new Promise((r) => setTimeout(r, 20000));
    await registerBeneficiariesForElection(
      GrantTerm.Year,
      bennies.slice(14, 18)
    );
    await displayElectionMetadata(GrantTerm.Year);
  };

  const approveForStaking = async (): Promise<void> => {
    console.log("approving all accounts for staking ...");
    await bluebird.map(
      accounts,
      async (account) => {
        return contracts.mockPop
          .connect(account)
          .approve(contracts.staking.address, utils.parseEther("100000000"));
      },
      { concurrency: 1 }
    );
  };

  const logResults = async (): Promise<void> => {
    console.log({
      eligibleButNotRegistered: bennies.slice(18, 20).map((bn) => bn.address),
      contracts: {
        beneficiaryRegistry: contracts.beneficiaryRegistry.address,
        mockPop: contracts.mockPop.address,
        staking: contracts.staking.address,
        randomNumberConsumer: contracts.randomNumberConsumer.address,
        grantElections: contracts.grantElections.address,
      },
    });
    console.log(`
Paste this into your .env file:

ADDR_TESTNET_BENEFICIARY_REGISTRY=${contracts.beneficiaryRegistry.address}
ADDR_TESTNET_POP=${contracts.mockPop.address}
ADDR_TESTNET_STAKING=${contracts.staking.address}
ADDR_TESTNET_RANDOM_NUMBER=${contracts.randomNumberConsumer.address}
ADDR_TESTNET_GOVERNANCE=${accounts[0].address}
ADDR_TESTNET_TREASURY=${contracts.treasury.address}
ADDR_TESTNET_INSURANCE=${contracts.insurance.address}
ADDR_TESTNET_BENEFICIARY_VAULT=${contracts.beneficiaryVaults.address}
ADDR_TESTNET_REWARDS_MANAGER=${contracts.rewardsManager.address}
ADDR_TESTNET_GRANT_ELECTION=${contracts.grantElections.address}
    `);
  };

  await setSigners();
  await giveBeneficiariesETH();
  await deployContracts();
  //await connectToContracts();
  await addBeneficiariesToRegistry();
  await mintPOP();
  await approveForStaking();
  await initializeMonthlyElection();
  await initializeQuarterlyElection();
  await initializeYearlyElection();
  await logResults();
}
