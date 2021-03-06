require("dotenv").config({ path: "../../.env" });
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import '@typechain/hardhat'
const { utils } = require("ethers");

const { deploy } = require("./scripts/deployWithValues");
const {
  GrantElectionAdapter,
} = require("./scripts/helpers/GrantElectionAdapter");

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("dev:deploy").setAction(async (args, hre) => {
  await deploy(hre.ethers);
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
    await GrantElections.finalize(term, {gasLimit: 9500000});
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

module.exports = {
  solidity: "0.7.3",
  networks: {
    hardhat: {
      chainId: +process.env.CHAIN_ID,
    },
    rinkeby: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY].concat(
        (process.env.BENEFICIARY_PRIVATE_KEYS &&
          process.env.BENEFICIARY_PRIVATE_KEYS.split(",")) ||
          []
      ),
    },
  },
};
