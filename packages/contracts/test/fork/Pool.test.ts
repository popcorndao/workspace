import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  MockERC20,
  Faucet,
  Zapper,
  Pool,
} from "../../typechain";
import { expect } from "chai";
import { waffle, ethers, network } from "hardhat";
import { parseEther } from "ethers/lib/utils";

const provider = waffle.provider;

interface Contracts {
  dai: MockERC20;
  faucet: Faucet;
  zapper: Zapper;
  pool: Pool;
}

const DepositorInitial = parseEther("100000");
let owner: SignerWithAddress,
  depositor: SignerWithAddress,
  rewardsManager: SignerWithAddress
let contracts: Contracts;

const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const DAI_TOKEN_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const CURVE_ADDRESS_PROVIDER_ADDRESS = '0x0000000022D53366457F9d5E68Ec105046FC4383';
const CURVE_METAPOOL_DEPOSIT_ZAP_ADDRESS = '0xA79828DF1850E8a3A3064576f380D90aECDD3359';
const FRAX_TOKEN_ADDRESS = '0x853d955acef822db058eb8505911ed77f175b99e';
const FRAX_LP_TOKEN_ADDRESS = '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B';
const YEARN_REGISTRY_ADDRESS = '0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804';

async function deployContracts(): Promise<Contracts> {

  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await (
    await Faucet.deploy(
      UNISWAP_ROUTER_ADDRESS
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

  return {
    dai,
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
      rewardsManager
    ] = await ethers.getSigners();
    contracts = await deployContracts();
    await contracts.faucet.sendTokens(DAI_TOKEN_ADDRESS, depositor.address);
  });


  it("does not explode", async function () {
    await contracts.dai.connect(depositor).approve(contracts.zapper.address, parseEther("1000"));
    await contracts.zapper.connect(depositor).zapIn(contracts.pool.address, DAI_TOKEN_ADDRESS, parseEther("1000"));
    expect(await contracts.pool.balanceOf(depositor.address)).to.equal(parseEther("994.254300004312981034"));
  });


});
