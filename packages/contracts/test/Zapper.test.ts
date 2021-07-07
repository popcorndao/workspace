import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  MockERC20,
  MockCurveDepositZap,
  MockCurveAddressProvider,
  MockCurveMetapool,
  MockCurveRegistry,
  MockYearnV2Vault,
  MockYearnRegistry,
  Pool,
  Zapper,
} from "../typechain";
import { expect } from "chai";
import { waffle, ethers } from "hardhat";
import { parseEther, getAddress } from "ethers/lib/utils";

const provider = waffle.provider;

interface Contracts {
  mockToken: MockERC20;
  mockLPToken: MockERC20;
  mock3crv: MockERC20;
  mockDai: MockERC20;
  mockUSDC: MockERC20;
  mockUSDT: MockERC20;
  mockCurveDepositZap: MockCurveDepositZap;
  mockCurveMetapool: MockCurveMetapool;
  mockCurveRegistry: MockCurveRegistry;
  mockCurveAddressProvider: MockCurveAddressProvider;
  mockYearnVault: MockYearnV2Vault;
  mockYearnRegistry: MockYearnRegistry;
  pool: Pool;
  zapper: Zapper;
}

let depositor: SignerWithAddress, rewardsManager: SignerWithAddress;
let contracts: Contracts;

async function deployContracts(): Promise<Contracts> {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await (
    await MockERC20.deploy("Token", "Token", 18)
  ).deployed();

  const mockLPToken = await (
    await MockERC20.deploy("CrvToken", "CrvToken", 18)
  ).deployed();

  const mock3crv = await (
    await MockERC20.deploy("Mock 3crv", "3crv", 18)
  ).deployed();

  const mockDai = await (
    await MockERC20.deploy("Mock DAI", "DAI", 18)
  ).deployed();

  const mockUSDC = await (
    await MockERC20.deploy("Mock USDC", "USDC", 6)
  ).deployed();

  const mockUSDT = await (
    await MockERC20.deploy("Mock USDT", "USDT", 18)
  ).deployed();

  const MockCurveMetapool = await ethers.getContractFactory(
    "MockCurveMetapool"
  );
  const mockCurveMetapool = await (
    await MockCurveMetapool.deploy(
      mockToken.address,
      mockLPToken.address,
      mock3crv.address,
      mockDai.address,
      mockUSDC.address,
      mockUSDT.address
    )
  ).deployed();

  const MockCurveDepositZap = await ethers.getContractFactory(
    "MockCurveDepositZap"
  );
  const mockCurveDepositZap = await (
    await MockCurveDepositZap.deploy(
      mockToken.address,
      mockLPToken.address,
      mockDai.address,
      mockUSDC.address,
      mockUSDT.address
    )
  ).deployed();

  const MockCurveRegistry = await ethers.getContractFactory(
    "MockCurveRegistry"
  );
  const mockCurveRegistry = await (
    await MockCurveRegistry.deploy(mockCurveMetapool.address)
  ).deployed();

  const MockCurveAddressProvider = await ethers.getContractFactory(
    "MockCurveAddressProvider"
  );
  const mockCurveAddressProvider = await (
    await MockCurveAddressProvider.deploy(mockCurveRegistry.address)
  ).deployed();

  const Zapper = await ethers.getContractFactory("Zapper");
  const zapper = await (
    await Zapper.deploy(
      mockCurveAddressProvider.address,
      mockCurveDepositZap.address
    )
  ).deployed();

  const MockYearnV2Vault = await ethers.getContractFactory("MockYearnV2Vault");
  const mockYearnVault = await (
    await MockYearnV2Vault.deploy(mockLPToken.address)
  ).deployed();

  const MockYearnRegistry = await ethers.getContractFactory(
    "MockYearnRegistry"
  );
  const mockYearnRegistry = await (
    await MockYearnRegistry.deploy(mockYearnVault.address)
  ).deployed();

  const Pool = await ethers.getContractFactory("Pool");
  const pool = await (
    await Pool.deploy(
      mockLPToken.address,
      mockYearnRegistry.address,
      rewardsManager.address
    )
  ).deployed();

  await pool.approveContractAccess(zapper.address);

  return {
    mockToken,
    mockLPToken,
    mock3crv,
    mockDai,
    mockUSDC,
    mockUSDT,
    mockCurveDepositZap,
    mockCurveMetapool,
    mockCurveRegistry,
    mockCurveAddressProvider,
    mockYearnVault,
    mockYearnRegistry,
    pool,
    zapper,
  };
}

describe("Zapper", function () {
  beforeEach(async function () {
    [depositor, rewardsManager] = await ethers.getSigners();
    contracts = await deployContracts();
  });

  describe("constructor", async function () {
    it("has the address of the Curve address provider", async function () {
      expect(await contracts.zapper.curveAddressProvider()).to.equal(
        contracts.mockCurveAddressProvider.address
      );
    });

    it("has the address of the Curve registry", async function () {
      expect(await contracts.zapper.curveAddressProvider()).to.equal(
        contracts.mockCurveAddressProvider.address
      );
    });

    it("has the address of the Curve metapool deposit zap", async function () {
      expect(await contracts.zapper.curveDepositZap()).to.equal(
        contracts.mockCurveDepositZap.address
      );
    });
  });

  describe("finding supported tokens", async function () {
    it("gets LP token from pool", async function () {
      expect(await contracts.zapper.token(contracts.pool.address)).to.equal(
        contracts.mockLPToken.address
      );
    });

    it("gets Curve pool for LP token", async function () {
      expect(
        await contracts.zapper.curvePoolAddress(contracts.pool.address)
      ).to.equal(contracts.mockCurveMetapool.address);
    });

    it("gets supported deposit tokens for underlying Curve pool", async function () {
      expect(
        await contracts.zapper.supportedTokens(contracts.pool.address)
      ).to.eql([
        contracts.mockToken.address,
        contracts.mockDai.address,
        contracts.mockUSDC.address,
        contracts.mockUSDT.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
      ]);
    });

    it("returns true if token is supported", async function () {
      expect(
        await contracts.zapper.canZap(
          contracts.pool.address,
          contracts.mockDai.address
        )
      ).to.be.true;
    });

    it("returns false if token is not supported", async function () {
      expect(
        await contracts.zapper.canZap(
          contracts.pool.address,
          contracts.mock3crv.address
        )
      ).to.be.false;
    });

    it("reverts on zero address", async function () {
      expect(
        contracts.zapper.canZap(
          contracts.pool.address,
          "0x0000000000000000000000000000000000000000"
        )
      ).to.be.reverted;
    });
  });

  describe("zapping in", async function () {
    it("reverts on unsupported tokens", async function () {
      expect(
        contracts.zapper.zapIn(
          contracts.pool.address,
          contracts.mock3crv.address,
          parseEther("1000")
        )
      ).to.be.reverted;
    });

    it("transfers in token on zapIn", async function () {
      await contracts.mockDai.mint(depositor.address, parseEther("1000"));
      expect(await contracts.mockDai.balanceOf(depositor.address)).to.equal(
        parseEther("1000")
      );
      await contracts.mockDai
        .connect(depositor)
        .approve(contracts.zapper.address, parseEther("1000"));
      await contracts.zapper
        .connect(depositor)
        .zapIn(
          contracts.pool.address,
          contracts.mockDai.address,
          parseEther("1000")
        );
      expect(await contracts.mockDai.balanceOf(depositor.address)).to.equal(
        parseEther("0")
      );
    });

    it("deposits to Pool on behalf of sender", async function () {
      await contracts.mockDai.mint(depositor.address, parseEther("1000"));
      await contracts.mockDai
        .connect(depositor)
        .approve(contracts.zapper.address, parseEther("1000"));
      await contracts.zapper
        .connect(depositor)
        .zapIn(
          contracts.pool.address,
          contracts.mockDai.address,
          parseEther("1000")
        );
      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(
        parseEther("1000")
      );
    });
  });

  describe("zapping out", async function () {
    beforeEach(async () => {
      await contracts.mockDai.mint(depositor.address, parseEther("1000"));
      expect(await contracts.mockDai.balanceOf(depositor.address)).to.equal(
        parseEther("1000")
      );
      await contracts.mockDai
        .connect(depositor)
        .approve(contracts.zapper.address, parseEther("1000"));
      await contracts.zapper
        .connect(depositor)
        .zapIn(
          contracts.pool.address,
          contracts.mockDai.address,
          parseEther("1000")
        );
      await contracts.pool
        .connect(depositor)
        .approve(contracts.zapper.address, parseEther("1000"));
    });

    it("reverts on unsupported tokens", async function () {
      expect(
        contracts.zapper.zapOut(
          contracts.pool.address,
          contracts.mock3crv.address,
          parseEther("1000")
        )
      ).to.be.reverted;
    });

    it("transfers in shares on zapOut", async function () {
      await contracts.zapper
        .connect(depositor)
        .zapOut(
          contracts.pool.address,
          contracts.mockUSDC.address,
          parseEther("1000")
        );
      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(0);
    });

    it("returns USDC to sender", async function () {
      await contracts.zapper
        .connect(depositor)
        .zapOut(
          contracts.pool.address,
          contracts.mockUSDC.address,
          parseEther("1000")
        );
      expect(await contracts.mockUSDC.balanceOf(depositor.address)).to.equal(
        parseEther("994.004998740049419223")
      );
    });
  });
});
