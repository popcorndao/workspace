import { parseEther } from "ethers/lib/utils";
import { GrantElectionAdapter } from "./helpers/GrantElectionAdapter";
import bluebird from "bluebird";
import { BigNumber, Contract, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getBytes32FromIpfsHash } from "@popcorn/utils/src/ipfsHashManipulation";
// This script creates two beneficiaries and one quarterly grant that they are both eligible for. Run this
// Run this instead of the normal deploy.js script

interface Contracts {
  beneficiaryRegistry: Contract;
  grantRegistry: Contract;
  mockPop: Contract;
  staking: Contract;
  randomNumberConsumer: Contract;
  grantElections: Contract;
  beneficiaryGovernance: Contract;
}

export default async function deploy(ethers): Promise<void> {
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
      await (await ethers.getContractFactory("BeneficiaryRegistry")).deploy()
    ).deployed();

    const grantRegistry = await (
      await (
        await ethers.getContractFactory("GrantRegistry")
      ).deploy(beneficiaryRegistry.address)
    ).deployed();

    const mockPop = await (
      await (
        await ethers.getContractFactory("MockERC20")
      ).deploy("TestPOP", "TPOP", 18)
    ).deployed();

    const staking = await (
      await (await ethers.getContractFactory("Staking")).deploy(mockPop.address)
    ).deployed();

    const randomNumberConsumer = await (
      await (
        await ethers.getContractFactory("RandomNumberConsumer")
      ).deploy(
        process.env.ADDR_CHAINLINK_VRF_COORDINATOR,
        process.env.ADDR_CHAINLINK_LINK_TOKEN,
        process.env.ADDR_CHAINLINK_KEY_HASH
      )
    ).deployed();

    const grantElections = await (
      await (
        await ethers.getContractFactory("GrantElections")
      ).deploy(
        staking.address,
        beneficiaryRegistry.address,
        grantRegistry.address,
        randomNumberConsumer.address,
        mockPop.address,
        accounts[0].address
      )
    ).deployed();

    const beneficiaryGovernance = await (
      await (
        await ethers.getContractFactory("BeneficiaryGovernance")
      ).deploy(
        staking.address,
        beneficiaryRegistry.address,
        mockPop.address,
        accounts[0].address
      )
    ).deployed();

    contracts = {
      beneficiaryRegistry,
      grantRegistry,
      mockPop,
      staking,
      randomNumberConsumer,
      grantElections,
      beneficiaryGovernance,
    };
    logResults();
  };

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

  const addBeneficiaryProposals = async (): Promise<void> => {
    console.log("adding beneficiaries proposals...");
    await bluebird.map(
      bennies.slice(0, 3),
      async (beneficiary) => {
        return contracts.beneficiaryGovernance
          .connect(beneficiary)
          .createProposal(
            beneficiary.address,
            getBytes32FromIpfsHash(
              "QmVwWKBqPcfBmpj5fhq24H2zysPotJdi4k8zPcbhVz4uDy"
            ),
            0,
            { gasLimit: 3000000 }
          );
      },
      { concurrency: 1 }
    );
    console.log("reducing voting period to 0");
    await contracts.beneficiaryGovernance
      .connect(accounts[0])
      .setConfiguration(0, 2 * 86400, parseEther("2000"));
    console.log("adding proposals in veto period");
    await bluebird.map(
      bennies.slice(3, 6),
      async (beneficiary) => {
        return contracts.beneficiaryGovernance
          .connect(beneficiary)
          .createProposal(
            beneficiary.address,
            getBytes32FromIpfsHash(
              "QmVwWKBqPcfBmpj5fhq24H2zysPotJdi4k8zPcbhVz4uDy"
            ),
            0,
            { gasLimit: 3000000 }
          );
      },
      { concurrency: 1 }
    );

    console.log("reducing veto period to 0");
    await contracts.beneficiaryGovernance
      .connect(accounts[0])
      .setConfiguration(0, 0, parseEther("2000"));

    console.log("adding proposals in finalization period");
    await bluebird.map(
      bennies.slice(6, 10),
      async (beneficiary) => {
        return contracts.beneficiaryGovernance
          .connect(beneficiary)
          .createProposal(
            beneficiary.address,
            getBytes32FromIpfsHash(
              "QmVwWKBqPcfBmpj5fhq24H2zysPotJdi4k8zPcbhVz4uDy"
            ),
            0,
            { gasLimit: 3000000 }
          );
      },
      { concurrency: 1 }
    );
  };

  const addBeneficiaryTakedownProposals = async (): Promise<void> => {
    console.log("reducing voting period to 0");
    await contracts.beneficiaryGovernance
      .connect(accounts[0])
      .setConfiguration(2 * 60 * 60, 2 * 60 * 60, parseEther("2000"));
    console.log("adding beneficiary takedown proposals...");

    await bluebird.map(
      bennies.slice(11),
      async (beneficiary) => {
        return contracts.beneficiaryGovernance
          .connect(beneficiary)
          .createProposal(
            beneficiary.address,
            getBytes32FromIpfsHash(
              "QmVwWKBqPcfBmpj5fhq24H2zysPotJdi4k8zPcbhVz4uDy"
            ),
            1,
            { gasLimit: 3000000 }
          );
      },
      { concurrency: 1 }
    );
  };

  const voteOnProposals = async (): Promise<void> => {
    console.log("vote on beneficiary proposals ...");
    await contracts.beneficiaryGovernance.connect(bennies[0]).vote(0, 0);
    await contracts.beneficiaryGovernance.connect(bennies[0]).vote(1, 1);
    await contracts.beneficiaryGovernance.connect(bennies[0]).vote(2, 1);
    await contracts.beneficiaryGovernance.connect(bennies[1]).vote(2, 0);

    await contracts.beneficiaryGovernance.connect(bennies[0]).vote(4, 1);
    await contracts.beneficiaryGovernance.connect(bennies[0]).vote(5, 1);

    await contracts.beneficiaryGovernance.connect(accounts[0]).finalize(6);
    await contracts.beneficiaryGovernance.connect(accounts[0]).finalize(7);
    await contracts.beneficiaryGovernance.connect(accounts[0]).finalize(8);
  };

  const voteOnTakedownProposals = async (): Promise<void> => {
    console.log("vote on beneficiary takedown proposals ...");
    await contracts.beneficiaryGovernance.connect(bennies[0]).vote(12, 0);
    await contracts.beneficiaryGovernance.connect(bennies[0]).vote(11, 1);
    await contracts.beneficiaryGovernance.connect(bennies[1]).vote(11, 1);
    await contracts.beneficiaryGovernance.connect(bennies[2]).vote(14, 0);

    // await contracts.beneficiaryGovernance.connect(bennies[4]).finalize(11)
    // await contracts.beneficiaryGovernance.connect(bennies[5]).finalize(12)
  };

  const addBeneficiariesToRegistry = async (): Promise<void> => {
    console.log("adding beneficiaries to registry ...");
    await bluebird.map(
      bennies.slice(11),
      async (beneficiary: SignerWithAddress) => {
        return contracts.beneficiaryRegistry.addBeneficiary(
          beneficiary.address,
          getBytes32FromIpfsHash(
            "QmVwWKBqPcfBmpj5fhq24H2zysPotJdi4k8zPcbhVz4uDy"
          ),
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
    await bluebird.map(
      accounts,
      async (account) => {
        return contracts.mockPop
          .connect(account)
          .approve(
            contracts.beneficiaryGovernance.address,
            parseEther("10000")
          );
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
      bennies.slice(11, 14)
    );
    await displayElectionMetadata(GrantTerm.Month);
  };

  const stakePOP = async (): Promise<void> => {
    console.log("voters are staking POP ...");
    await bluebird.map(accounts, async (voter: SignerWithAddress) => {
      return contracts.staking
        .connect(voter)
        .stake(utils.parseEther("1000"), 86400 * 365 * 4);
    });
  };

  const voteForElection = async (
    term,
    voters,
    beneficiaries
  ): Promise<void> => {
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
      bennies.slice(14, 17)
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
      bennies.slice(14, 17)
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
    await registerBeneficiariesForElection(GrantTerm.Year, bennies.slice(18));
    await displayElectionMetadata(GrantTerm.Year);
  };

  const setElectionContractAsGovernanceForGrantRegistry =
    async (): Promise<void> => {
      await contracts.grantRegistry.nominateNewGovernance(accounts[0].address);
      await contracts.grantRegistry.connect(accounts[0]).acceptGovernance();
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
        grantRegistry: contracts.grantRegistry.address,
        mockPop: contracts.mockPop.address,
        staking: contracts.staking.address,
        randomNumberConsumer: contracts.randomNumberConsumer.address,
        grantElections: contracts.grantElections.address,
      },
    });
    console.log(`
Paste this into your .env file:

ADDR_BENEFICIARY_REGISTRY=${contracts.beneficiaryRegistry.address}
ADDR_GRANT_REGISTRY=${contracts.grantRegistry.address}
ADDR_POP=${contracts.mockPop.address}
ADDR_STAKING=${contracts.staking.address}
ADDR_RANDOM_NUMBER=${contracts.randomNumberConsumer.address}
ADDR_BENEFICIARY_GOVERNANCE=${contracts.beneficiaryGovernance.address}
ADDR_GOVERNANCE=${accounts[0].address}
ADDR_GRANT_ELECTION=${contracts.grantElections.address}
    `);
  };

  await setSigners();
  await giveBeneficiariesETH();
  await deployContracts();
  await addBeneficiariesToRegistry();
  await mintPOP();
  await addBeneficiaryProposals();
  await addBeneficiaryTakedownProposals();
  await approveForStaking();
  await stakePOP();
  await voteOnProposals();
  await voteOnTakedownProposals();
  await initializeMonthlyElection();
  await initializeQuarterlyElection();
  await initializeYearlyElection();
  await setElectionContractAsGovernanceForGrantRegistry();
  await logResults();
}
