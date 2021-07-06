import { expect } from "chai";
import {
  BeneficiaryRegistry,
  BeneficiaryVaults,
  IUniswapV2Pair,
  MockERC20,
  Region,
  RewardsManager,
  Staking,
  UniswapV2Router02,
  WETH9,
} from "../typechain";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployContract } from "ethereum-waffle";
import { ethers, waffle } from "hardhat";
import { parseEther } from "@ethersproject/units";
const UniswapV2FactoryJSON = require("../artifactsUniswap/UniswapV2Factory.json");
const UniswapV2Router02JSON = require("../artifactsUniswap/UniswapV2Router.json");
const UniswapV2PairJSON = require("../artifactsUniswap/UniswapV2Pair.json");

const overrides = {
  gasLimit: 9999999,
};

let owner: SignerWithAddress,
  rewarder: SignerWithAddress,
  nonOwner: SignerWithAddress;
let contracts: Contracts;
const provider = waffle.provider;
const DEFAULT_REGION = "0x5757"

interface Contracts {
  POP: MockERC20;
  TestERC20: MockERC20;
  WETH: WETH9;
  Region:Region;
  Insurance: Contract;
  Treasury: Contract;
  BeneficiaryVaults: BeneficiaryVaults;
  BeneficiaryRegistry: BeneficiaryRegistry;
  Staking: Staking;
  RewardsManager: RewardsManager;
  UniswapRouter: UniswapV2Router02;
  WETHPair: IUniswapV2Pair;
  TestERC20Pair: IUniswapV2Pair;
}

async function deployContracts(): Promise<Contracts> {
  const mockERC20Factory = await ethers.getContractFactory("MockERC20");
  const POP = (await mockERC20Factory.deploy(
    "TestPOP",
    "TPOP",
    18
  )) as MockERC20;
  const TestERC20 = (await mockERC20Factory.deploy(
    "TestToken",
    "TT",
    18
  )) as MockERC20;

  const WETH = (await (
    await (await ethers.getContractFactory("WETH9")).deploy()
  ).deployed()) as WETH9;

  const Region = await (await (await ethers.getContractFactory("Region")).deploy()).deployed()

  const Insurance = await (
    await (await ethers.getContractFactory("MockInsurance")).deploy()
  ).deployed();

  const Treasury = await (
    await (await ethers.getContractFactory("MockTreasury")).deploy()
  ).deployed();

  const BeneficiaryRegistry = (await (
    await (await ethers.getContractFactory("BeneficiaryRegistry")).deploy(Region.address)
  ).deployed()) as BeneficiaryRegistry;

  const BeneficiaryVaults = (await (
    await (
      await ethers.getContractFactory("BeneficiaryVaults")
    ).deploy(POP.address, BeneficiaryRegistry.address, Region.address)
  ).deployed()) as BeneficiaryVaults;

  const Staking = (await (
    await (await ethers.getContractFactory("Staking")).deploy(POP.address)
  ).deployed()) as Staking;

  const factoryV2 = await deployContract(owner, UniswapV2FactoryJSON, [
    owner.address,
  ]);

  const UniswapRouter = (await deployContract(
    owner,
    UniswapV2Router02JSON,
    [factoryV2.address, WETH.address],
    overrides
  )) as UniswapV2Router02;

  const RewardsManager = (await (
    await (
      await ethers.getContractFactory("RewardsManager")
    ).deploy(
      POP.address,
      Staking.address,
      Treasury.address,
      Insurance.address,
      BeneficiaryVaults.address,
      UniswapRouter.address
    )
  ).deployed()) as RewardsManager;

  await Staking.setRewardsManager(RewardsManager.address);

  await factoryV2.createPair(WETH.address, POP.address);
  await factoryV2.createPair(TestERC20.address, POP.address);

  const WETHPairAddress = await factoryV2.getPair(WETH.address, POP.address);
  const TestERC20PairAddress = await factoryV2.getPair(
    TestERC20.address,
    POP.address
  );

  const WETHPair = new Contract(
    WETHPairAddress,
    JSON.stringify(UniswapV2PairJSON.abi),
    owner
  ) as IUniswapV2Pair;
  const TestERC20Pair = new Contract(
    TestERC20PairAddress,
    JSON.stringify(UniswapV2PairJSON.abi),
    owner
  ) as IUniswapV2Pair;
  return {
    POP,
    TestERC20,
    WETH,
    Region,
    Insurance,
    Treasury,
    BeneficiaryVaults,
    BeneficiaryRegistry,
    Staking,
    RewardsManager,
    UniswapRouter,
    WETHPair,
    TestERC20Pair,
  };
}

async function prepareContracts(): Promise<void> {
  const currentBlockNumber = await provider.getBlockNumber();
  const currentTimestamp = await (
    await ethers.provider.getBlock(currentBlockNumber)
  ).timestamp;
  await contracts.POP.mint(owner.address, parseEther("100000"));
  await contracts.TestERC20.mint(owner.address, parseEther("10000"));
  await contracts.POP.connect(owner).approve(
    contracts.UniswapRouter.address,
    parseEther("10000")
  );
  await contracts.TestERC20.connect(owner).approve(
    contracts.UniswapRouter.address,
    parseEther("10000")
  );
  await contracts.UniswapRouter.addLiquidityETH(
    contracts.POP.address,
    parseEther("1000"),
    parseEther("1000"),
    parseEther("1"),
    owner.address,
    currentTimestamp + 60,
    { ...overrides, value: parseEther("1") }
  );
  await contracts.UniswapRouter.addLiquidity(
    contracts.POP.address,
    contracts.TestERC20.address,
    parseEther("1000"),
    parseEther("1000"),
    parseEther("1000"),
    parseEther("1000"),
    owner.address,
    currentTimestamp + 60
  );
}

describe("Integration", function () {
  beforeEach(async function () {
    [owner, rewarder, nonOwner] = await ethers.getSigners();
    contracts = await deployContracts();
    await prepareContracts();
  });

  describe("swapTokenForRewards", function () {
    it("swaps ERC20 to POP", async function () {
      await contracts.TestERC20.connect(owner).transfer(
        contracts.RewardsManager.address,
        parseEther("10")
      );
      expect(
        await contracts.TestERC20.balanceOf(contracts.RewardsManager.address)
      ).to.equal(parseEther("10"));

      const amountOut = await contracts.UniswapRouter.getAmountsOut(
        parseEther("10"),
        [contracts.TestERC20.address, contracts.POP.address]
      );
      await contracts.RewardsManager.swapTokenForRewards(
        [contracts.TestERC20.address, contracts.POP.address],
        amountOut[1]
      );
      expect(
        await contracts.POP.balanceOf(contracts.RewardsManager.address)
      ).to.equal(amountOut[1]);
    });
  });
  describe("distributeRewards", function () {
    beforeEach(async function () {
      await contracts.POP.mint(
        contracts.RewardsManager.address,
        parseEther("100")
      );
    });

    it("distribute rewards to contracts", async function () {
      await contracts.RewardsManager.distributeRewards();
      expect(await contracts.POP.balanceOf(contracts.Staking.address)).to.equal(
        parseEther("32")
      );
      expect(
        await contracts.POP.balanceOf(contracts.Treasury.address)
      ).to.equal(parseEther("32"));
      expect(
        await contracts.POP.balanceOf(contracts.Insurance.address)
      ).to.equal(parseEther("2"));
      expect(
        await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
      ).to.equal(parseEther("34"));
    });

    it("distribute rewards according to current split", async function () {
      await contracts.RewardsManager.setRewardSplits([
        parseEther("20"),
        parseEther("18"),
        parseEther("2"),
        parseEther("60"),
      ]);
      await contracts.RewardsManager.distributeRewards();
      expect(await contracts.POP.balanceOf(contracts.Staking.address)).to.equal(
        parseEther("20")
      );
      expect(
        await contracts.POP.balanceOf(contracts.Treasury.address)
      ).to.equal(parseEther("18"));
      expect(
        await contracts.POP.balanceOf(contracts.Insurance.address)
      ).to.equal(parseEther("2"));
      expect(
        await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
      ).to.equal(parseEther("60"));
    });

    it("distribute rewards to newly set Insurance", async function () {
      const newInsurance = await (
        await (await ethers.getContractFactory("MockInsurance")).deploy()
      ).deployed();

      await contracts.RewardsManager.distributeRewards();
      expect(await contracts.POP.balanceOf(contracts.Staking.address)).to.equal(
        parseEther("32")
      );
      expect(
        await contracts.POP.balanceOf(contracts.Treasury.address)
      ).to.equal(parseEther("32"));
      expect(
        await contracts.POP.balanceOf(contracts.Insurance.address)
      ).to.equal(parseEther("2"));
      expect(
        await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
      ).to.equal(parseEther("34"));

      await contracts.POP.mint(
        contracts.RewardsManager.address,
        parseEther("100")
      );

      await contracts.RewardsManager.setInsurance(newInsurance.address);
      await contracts.RewardsManager.distributeRewards();
      expect(
        await contracts.POP.balanceOf(contracts.Insurance.address)
      ).to.equal(parseEther("2"));
      expect(await contracts.POP.balanceOf(newInsurance.address)).to.equal(
        parseEther("2")
      );
    });
    it("distribute rewards to newly set Treasury", async function () {
      const newTreasury = await (
        await (await ethers.getContractFactory("MockTreasury")).deploy()
      ).deployed();

      await contracts.RewardsManager.distributeRewards();
      expect(await contracts.POP.balanceOf(contracts.Staking.address)).to.equal(
        parseEther("32")
      );
      expect(
        await contracts.POP.balanceOf(contracts.Treasury.address)
      ).to.equal(parseEther("32"));
      expect(
        await contracts.POP.balanceOf(contracts.Insurance.address)
      ).to.equal(parseEther("2"));
      expect(
        await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
      ).to.equal(parseEther("34"));

      await contracts.POP.mint(
        contracts.RewardsManager.address,
        parseEther("100")
      );

      await contracts.RewardsManager.setTreasury(newTreasury.address);
      await contracts.RewardsManager.distributeRewards();
      expect(
        await contracts.POP.balanceOf(contracts.Treasury.address)
      ).to.equal(parseEther("32"));
      expect(await contracts.POP.balanceOf(newTreasury.address)).to.equal(
        parseEther("32")
      );
    });

    it("distribute rewards to newly set Staking", async function () {
      const newStaking = await (
        await (
          await ethers.getContractFactory("Staking")
        ).deploy(contracts.POP.address)
      ).deployed();
      await newStaking.setRewardsManager(contracts.RewardsManager.address);

      await contracts.RewardsManager.distributeRewards();
      expect(await contracts.POP.balanceOf(contracts.Staking.address)).to.equal(
        parseEther("32")
      );
      expect(
        await contracts.POP.balanceOf(contracts.Treasury.address)
      ).to.equal(parseEther("32"));
      expect(
        await contracts.POP.balanceOf(contracts.Insurance.address)
      ).to.equal(parseEther("2"));
      expect(
        await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
      ).to.equal(parseEther("34"));

      await contracts.POP.mint(
        contracts.RewardsManager.address,
        parseEther("100")
      );

      await contracts.RewardsManager.setStaking(newStaking.address);
      await contracts.RewardsManager.distributeRewards();
      expect(await contracts.POP.balanceOf(contracts.Staking.address)).to.equal(
        parseEther("32")
      );
      expect(await contracts.POP.balanceOf(newStaking.address)).to.equal(
        parseEther("32")
      );
    });

    it("distribute rewards to newly set BeneficiaryVaults", async function () {
      const newBeneficiaryVaults = await (
        await (
          await ethers.getContractFactory("BeneficiaryVaults")
        ).deploy(contracts.POP.address, contracts.BeneficiaryRegistry.address, contracts.Region.address)
      ).deployed();

      await contracts.RewardsManager.distributeRewards();
      expect(await contracts.POP.balanceOf(contracts.Staking.address)).to.equal(
        parseEther("32")
      );
      expect(
        await contracts.POP.balanceOf(contracts.Treasury.address)
      ).to.equal(parseEther("32"));
      expect(
        await contracts.POP.balanceOf(contracts.Insurance.address)
      ).to.equal(parseEther("2"));
      expect(
        await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
      ).to.equal(parseEther("34"));

      await contracts.POP.mint(
        contracts.RewardsManager.address,
        parseEther("100")
      );

      await contracts.RewardsManager.setBeneficiaryVaults(
        newBeneficiaryVaults.address
      );
      await contracts.RewardsManager.distributeRewards();
      expect(
        await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
      ).to.equal(parseEther("34"));
      expect(
        await contracts.POP.balanceOf(newBeneficiaryVaults.address)
      ).to.equal(parseEther("34"));
    });
    it("distribute rewards to contracts", async function () {
      const result = await contracts.RewardsManager.distributeRewards();
      expect(await contracts.POP.balanceOf(contracts.Staking.address)).to.equal(
        parseEther("32")
      );
      expect(result)
        .to.emit(contracts.Staking, "RewardAdded")
        .withArgs(parseEther("32"));
    });
  });
});
