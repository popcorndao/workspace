import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  MockERC20,
  Faucet,
  Zapper,
  Pool,
} from "../../typechain";
import { expect } from "chai";
import { waffle, ethers, network } from "hardhat";
import { parseEther, parseUnits } from "ethers/lib/utils";

const provider = waffle.provider;

interface Contracts {
  dai: MockERC20;
  usdc: MockERC20;
  usdt: MockERC20;
  frax: MockERC20;
  faucet: Faucet;
  zapper: Zapper;
  pool: Pool;
}

const DepositorInitial = parseEther("100000");
let owner: SignerWithAddress,
  depositor: SignerWithAddress,
  depositor1: SignerWithAddress,
  depositor2: SignerWithAddress,
  depositor3: SignerWithAddress,
  rewardsManager: SignerWithAddress
let contracts: Contracts;

const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const DAI_TOKEN_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const USDC_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_TOKEN_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const CURVE_ADDRESS_PROVIDER_ADDRESS = '0x0000000022D53366457F9d5E68Ec105046FC4383';
const CURVE_METAPOOL_DEPOSIT_ZAP_ADDRESS = '0xA79828DF1850E8a3A3064576f380D90aECDD3359';
const FRAX_TOKEN_ADDRESS = '0x853d955acef822db058eb8505911ed77f175b99e';
const FRAX_LP_TOKEN_ADDRESS = '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B';
const YEARN_REGISTRY_ADDRESS = '0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804';

async function deployContracts(): Promise<Contracts> {

  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await (
    await Faucet.deploy(
      UNISWAP_ROUTER_ADDRESS,
      CURVE_ADDRESS_PROVIDER_ADDRESS,
      CURVE_METAPOOL_DEPOSIT_ZAP_ADDRESS
    )
  ).deployed();
  await network.provider.send("hardhat_setBalance", [
    faucet.address,
    "0x152d02c7e14af6800000", // 100k ETH
  ]);

  const Zapper = await ethers.getContractFactory("Zapper");
  const zapper = await (
    await Zapper.deploy(
      CURVE_ADDRESS_PROVIDER_ADDRESS,
      CURVE_METAPOOL_DEPOSIT_ZAP_ADDRESS,
    )
  ).deployed();

  const Pool = await ethers.getContractFactory("Pool");
  const pool = await (
    await Pool.deploy(
      FRAX_LP_TOKEN_ADDRESS,
      YEARN_REGISTRY_ADDRESS,
      rewardsManager.address
    )
  ).deployed();
  pool.approveContractAccess(zapper.address);

  const dai = await ethers.getContractAt(
    "MockERC20",
    DAI_TOKEN_ADDRESS
  ) as MockERC20;

  const usdc = await ethers.getContractAt(
    "MockERC20",
    USDC_TOKEN_ADDRESS
  ) as MockERC20;

  const usdt = await ethers.getContractAt(
    "MockERC20",
    USDT_TOKEN_ADDRESS
  ) as MockERC20;

  const frax = await ethers.getContractAt(
    "MockERC20",
    FRAX_TOKEN_ADDRESS
  ) as MockERC20;

  return {
    dai,
    usdc,
    usdt,
    frax,
    faucet,
    zapper,
    pool,
  };
}

describe("Pool", function () {
  beforeEach(async function () {
    [
      owner,
      depositor,
      depositor1,
      depositor2,
      depositor3,
      rewardsManager
    ] = await ethers.getSigners();
    contracts = await deployContracts();
    [depositor, depositor1, depositor2, depositor3].forEach(async (account) => {
      await contracts.faucet.sendTokens(DAI_TOKEN_ADDRESS, 10, account.address);
      await contracts.faucet.sendTokens(USDC_TOKEN_ADDRESS, 10, account.address);
      await contracts.faucet.sendTokens(USDT_TOKEN_ADDRESS, 10, account.address);
      await contracts.faucet.sendTokens(FRAX_TOKEN_ADDRESS, 10, account.address);
    });
  });

  describe("Zapping in", function () {
    it("Depositor can zap in with DAI", async function () {
      await contracts.dai.connect(depositor).approve(contracts.zapper.address, parseEther("10000"));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, DAI_TOKEN_ADDRESS, parseEther("10000"));
      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(parseEther("9942.540538983760446090"));
    });

    it("Depositor can zap in with USDC", async function () {
      await contracts.usdc.connect(depositor).approve(contracts.zapper.address, parseUnits("10000", 6));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, USDC_TOKEN_ADDRESS, parseUnits("10000", 6));
      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(parseEther("9934.971807099795502637"));
    });

    it("Depositor can zap in with USDT", async function () {
      await contracts.usdt.connect(depositor).approve(contracts.zapper.address, parseUnits("10000", 6));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, USDT_TOKEN_ADDRESS, parseUnits("10000", 6));
      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(parseEther("9934.470278015205908927"));
    });

    it("Depositor can zap in with FRAX", async function () {
      await contracts.frax.connect(depositor).approve(contracts.zapper.address, parseEther("10000"));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, FRAX_TOKEN_ADDRESS, parseEther("10000"));
      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(parseEther("9958.708106800095587291"));
    });
  });

  describe("Zapping out", function () {
    it("Depositor can zap out to DAI", async function () {
      await contracts.dai.connect(depositor).approve(contracts.zapper.address, parseEther("10000"));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, DAI_TOKEN_ADDRESS, parseEther("10000"));
      let initialDaiBalance = await contracts.dai.balanceOf(depositor.address);

      let balance = await contracts.pool.balanceOf(depositor.address);
      await contracts.pool.connect(depositor).approve(contracts.zapper.address, balance);
      await contracts.zapper.connect(depositor).zapOut(contracts.pool.address, DAI_TOKEN_ADDRESS, balance);

      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(0);
      expect((await contracts.dai.balanceOf(depositor.address)).sub(initialDaiBalance)).to.equal(parseEther("9941.407142235427790758"));
    });

    it("Depositor can zap out to USDC", async function () {
      await contracts.dai.connect(depositor).approve(contracts.zapper.address, parseEther("10000"));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, DAI_TOKEN_ADDRESS, parseEther("10000"));
      let initialUsdcBalance = await contracts.usdc.balanceOf(depositor.address);

      let balance = await contracts.pool.balanceOf(depositor.address);
      await contracts.pool.connect(depositor).approve(contracts.zapper.address, balance);
      await contracts.zapper.connect(depositor).zapOut(contracts.pool.address, USDC_TOKEN_ADDRESS, balance);

      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(0);
      expect((await contracts.usdc.balanceOf(depositor.address)).sub(initialUsdcBalance)).to.equal(parseUnits("9950.383014", 6));
    });

    it("Depositor can zap out to USDT", async function () {
      await contracts.dai.connect(depositor).approve(contracts.zapper.address, parseEther("10000"));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, DAI_TOKEN_ADDRESS, parseEther("10000"));
      let initialUsdtBalance = await contracts.usdt.balanceOf(depositor.address);

      let balance = await contracts.pool.balanceOf(depositor.address);
      await contracts.pool.connect(depositor).approve(contracts.zapper.address, balance);
      await contracts.zapper.connect(depositor).zapOut(contracts.pool.address, USDT_TOKEN_ADDRESS, balance);

      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(0);
      expect((await contracts.usdt.balanceOf(depositor.address)).sub(initialUsdtBalance)).to.equal(parseUnits("9951.193297", 6));
    });

    it("Depositor can zap out to FRAX", async function () {
      await contracts.dai.connect(depositor).approve(contracts.zapper.address, parseEther("10000"));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, DAI_TOKEN_ADDRESS, parseEther("10000"));
      let initialFraxBalance = await contracts.frax.balanceOf(depositor.address);

      let balance = await contracts.pool.balanceOf(depositor.address);
      await contracts.pool.connect(depositor).approve(contracts.zapper.address, balance);
      await contracts.zapper.connect(depositor).zapOut(contracts.pool.address, FRAX_TOKEN_ADDRESS, balance);

      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(0);
      expect((await contracts.frax.balanceOf(depositor.address)).sub(initialFraxBalance)).to.equal(parseEther("9929.450577344820125379"));
    });
  });

  describe("Deposits", function () {
    it("Multiple deposits", async function () {
      await contracts.dai.connect(depositor).approve(contracts.zapper.address, parseEther("10000"));
      await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, DAI_TOKEN_ADDRESS, parseEther("10000"));

      await contracts.usdc.connect(depositor1).approve(contracts.zapper.address, parseUnits("25000", 6));
      await contracts.zapper.connect(depositor1).zapIn(contracts.pool.address, USDC_TOKEN_ADDRESS, parseUnits("25000", 6));

      await contracts.usdt.connect(depositor2).approve(contracts.zapper.address, parseUnits("150000", 6));
      await contracts.zapper.connect(depositor2).zapIn(contracts.pool.address, USDT_TOKEN_ADDRESS, parseUnits("150000", 6));

      await contracts.frax.connect(depositor3).approve(contracts.zapper.address, parseUnits("15000"));
      await contracts.zapper.connect(depositor3).zapIn(contracts.pool.address, FRAX_TOKEN_ADDRESS, parseEther("15000"));

      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(parseEther("9942.518429334402447895"));
      expect(await contracts.pool.balanceOf(depositor1.address)).to.equal(parseEther("24837.370725848887812075"));
      expect(await contracts.pool.balanceOf(depositor2.address)).to.equal(parseEther("149016.123624648447740383"));
      expect(await contracts.pool.balanceOf(depositor3.address)).to.equal(parseEther("14938.232552405515813615"));

      expect(await contracts.pool.totalAssets()).to.equal(parseEther("60654500.944694042012671843"));
      expect(await contracts.pool.pricePerPoolToken()).to.equal(parseEther("0.999999993662252304"));

      let [vault] = await contracts.pool.allVaults();
      await contracts.faucet.sendCurveLPTokens(FRAX_LP_TOKEN_ADDRESS, 100, vault);
      expect(await contracts.pool.totalAssets()).to.equal(parseEther("60857153.177374046977874240"));

      expect(await contracts.pool.pricePerPoolToken()).to.equal(parseEther("1.003341085060900996"));
    });
  });
});
