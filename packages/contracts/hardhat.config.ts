import "@popcorn/utils/src/envLoader";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import { utils } from "ethers";

import deploy from "./scripts/deployWithValues";
import deployTestnet from "./scripts/deployWithValuesTestnet";
import { GrantElectionAdapter } from "./scripts/helpers/GrantElectionAdapter";
import SetTokenManager from "./lib/SetToken/SetTokenManager";
import { DefaultConfiguration } from "./lib/SetToken/Configuration";

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("environment").setAction(async (args, hre) => {
  console.log(process.env.ENV);
});

task("dev:deploy").setAction(async (args, hre) => {
  await deploy(hre.ethers);
});

task("dev:deployTestnet").setAction(async (args, hre) => {
  await deployTestnet(hre.ethers);
});

task("elections:getElectionMetadata")
  .addParam("term", "grant term (int)")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const contract = new hre.ethers.Contract(
      process.env.ADDR_GRANT_ELECTION,
      require("./artifacts/contracts/GrantElections.sol/GrantElections.json").abi,
      signer
    );
    console.log(
      await GrantElectionAdapter(contract).getElectionMetadata(
        Number(args.term)
      )
    );
  });

task("elections:refreshElectionState")
  .addParam("term", "grant term (int)")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    console.log(signer.address);
    const contract = new hre.ethers.Contract(
      process.env.ADDR_GRANT_ELECTION,
      require("./artifacts/contracts/GrantElections.sol/GrantElections.json").abi,
      signer
    );
    await contract.refreshElectionState(Number(args.term));
    console.log(
      await GrantElectionAdapter(contract).getElectionMetadata(
        Number(args.term)
      )
    );
  });

task("POP:mint", "mint amount for recipient")
  .addParam("recipient", "address to receive POP")
  .addParam("amount", "amount to receive")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const { recipient, amount } = args;
    const mockPOP = new hre.ethers.Contract(
      process.env.ADDR_POP,
      require("./artifacts/contracts/mocks/MockERC20.sol/MockERC20.json").abi,
      signer
    );
    const result = await mockPOP.mint(recipient, utils.parseEther(amount));
    console.log("Done: ", result);
  });

task("POP:balanceOf", "get balance of POP for address")
  .addParam("address", "amount to receive")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const { address } = args;
    const mockPOP = new hre.ethers.Contract(
      process.env.ADDR_POP,
      require("./artifacts/contracts/mocks/MockERC20.sol/MockERC20.json").abi,
      signer
    );
    const result = await mockPOP.balanceOf(address);
    console.log(
      `Balance of ${address}: `,
      utils.formatEther(result.toString())
    );
  });

task("staking:getVoiceCredits", "get voice credit balance of address")
  .addParam("address", "address to check balance of")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const { address } = args;
    const Staking = new hre.ethers.Contract(
      process.env.ADDR_STAKING,
      require("./artifacts/contracts/Staking.sol/Staking.json").abi,
      signer
    );
    const result = await Staking.getVoiceCredits(address);
    console.log(
      `Voice credits of ${address}: `,
      utils.formatEther(result.toString())
    );
  });

task("elections:finalize", "finalize a grant election")
  .addParam("term", "election term to end")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const { term } = args;
    const GrantElections = new hre.ethers.Contract(
      process.env.ADDR_GRANT_ELECTION,
      require("./artifacts/contracts/GrantElections.sol/GrantElections.json").abi,
      signer
    );
    await GrantElections.finalize(Number(term), { gasLimit: 10000000 });
  });

task("random", "gets a random number")
  .addParam("seed", "the seed")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const { seed } = args;
    const RandomNumberConsumer = new hre.ethers.Contract(
      process.env.ADDR_RANDOM_NUMBER,
      require("./artifacts/contracts/RandomNumberConsumer.sol/RandomNumberConsumer.json").abi,
      signer
    );
    await RandomNumberConsumer.getRandomNumber(Number(seed));
    console.log(`Random number ${await RandomNumberConsumer.randomResult()}`);
  });

task("send-eth", "send eth to address")
  .addPositionalParam("address")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    await signer.sendTransaction({
      to: args.address,
      value: hre.ethers.utils.parseEther("2.0"),
    });
  });

task("hysi:deploy", "deploys set token")
  .addOptionalParam("debug", "display debug information")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const manager = new SetTokenManager(
      { ...DefaultConfiguration, manager: signer },
      hre
    );
    await manager.createSet({ args });
  });

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.3",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
  networks: {
    mainnet: {
      chainId: 1,
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    hardhat: {},
    rinkeby: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY].concat(
        (process.env.BENEFICIARY_PRIVATE_KEYS &&
          process.env.BENEFICIARY_PRIVATE_KEYS.split(",")) ||
          []
      ),
      gas: 10000000,
      gasPrice: 10000000000,
    },
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    enabled: false,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
};
