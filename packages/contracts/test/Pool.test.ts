import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  BlockLockHelper,
  PoolDefendedHelper,
  MockERC20,
  MockYearnV2Vault,
  MockYearnRegistry,
  Pool,
} from "../typechain";
import { expect } from "chai";
import { waffle, ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const provider = waffle.provider;

interface Contracts {
  mockToken: MockERC20;
  mockYearnVault: MockYearnV2Vault;
  mockYearnRegistry: MockYearnRegistry;
  pool: Pool;
  blockLockHelper: BlockLockHelper;
  defendedHelper: PoolDefendedHelper;
}

const DepositorInitial = parseEther("100000");
let owner: SignerWithAddress,
  depositor: SignerWithAddress,
  depositor1: SignerWithAddress,
  depositor2: SignerWithAddress,
  depositor3: SignerWithAddress,
  depositor4: SignerWithAddress,
  depositor5: SignerWithAddress,
  rewardsManager: SignerWithAddress;
let contracts: Contracts;

async function deployContracts(): Promise<Contracts> {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await (
    await MockERC20.deploy("Token", "Token", 18)
  ).deployed();
  await mockToken.mint(depositor.address, DepositorInitial);
  await mockToken.mint(depositor1.address, DepositorInitial);
  await mockToken.mint(depositor2.address, DepositorInitial);
  await mockToken.mint(depositor3.address, DepositorInitial);
  await mockToken.mint(depositor4.address, DepositorInitial);
  await mockToken.mint(depositor5.address, DepositorInitial);

  const MockYearnV2Vault = await ethers.getContractFactory("MockYearnV2Vault");
  const mockYearnVault = await (
    await MockYearnV2Vault.deploy(mockToken.address)
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
      mockToken.address,
      mockYearnRegistry.address,
      rewardsManager.address
    )
  ).deployed();

  const Staking = await ethers.getContractFactory("Staking");
  const mockStaking = await waffle.deployMockContract(
    owner,
    Staking.interface.format() as any
  );

  const PoolDefendedHelper = await ethers.getContractFactory(
    "PoolDefendedHelper"
  );
  const defendedHelper = await (
    await PoolDefendedHelper.deploy(mockToken.address, pool.address)
  ).deployed();

  await mockToken.mint(defendedHelper.address, DepositorInitial);

  const BlockLockHelper = await ethers.getContractFactory("BlockLockHelper");
  const blockLockHelper = await (
    await BlockLockHelper.deploy(pool.address, mockToken.address)
  ).deployed();

  await pool.approveContractAccess(blockLockHelper.address);

  return {
    mockToken,
    mockYearnVault,
    mockYearnRegistry,
    pool,
    blockLockHelper,
    defendedHelper,
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
      depositor4,
      depositor5,
      rewardsManager,
    ] = await ethers.getSigners();
    contracts = await deployContracts();
  });

  describe("constructor", async function () {
    it("should be constructed with correct addresses", async function () {
      expect(await contracts.pool.token()).to.equal(
        contracts.mockToken.address
      );
      expect(await contracts.pool.rewardsManager()).to.equal(
        rewardsManager.address
      );
    });
  });

  describe("pool token", async function () {
    it("has a token name", async function () {
      expect(await contracts.pool.name()).to.equal("Popcorn Token Pool");
    });

    it("has a token symbol", async function () {
      expect(await contracts.pool.symbol()).to.equal("popToken");
    });

    it("uses 18 decimals", async function () {
      expect(await contracts.pool.decimals()).to.equal(18);
    });
  });

  describe("deposits", async function () {
    it("accepts token deposits", async function () {
      let amount = parseEther("1000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);
      expect(
        await contracts.mockToken
          .connect(depositor)
          .balanceOf(depositor.address)
      ).to.equal(parseEther("99000"));
    });

    it("reverts unapproved deposits", async function () {
      let amount = parseEther("1000");
      await expect(
        contracts.pool.connect(depositor).deposit(amount)
      ).to.be.revertedWith("transfer amount exceeds allowance");
    });

    it("returns pool tokens to depositor", async function () {
      let amount = parseEther("1000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);
      expect(
        await contracts.pool.connect(depositor).balanceOf(depositor.address)
      ).to.equal(amount);
    });

    it("deposits tokens to Yearn in exchange for Yearn vault shares", async function () {
      let amount = parseEther("1000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);
      expect(
        await contracts.mockYearnVault
          .connect(depositor)
          .balanceOf(contracts.pool.address)
      ).to.equal(parseEther("1000"));
    });

    it("should not allow non-whitelisted contracts to deposit", async function () {
      let amount = parseEther("1000");
      await expect(contracts.defendedHelper.deposit(amount)).to.revertedWith(
        "Access denied for caller"
      );
    });

    it("should allow whitelisted contracts to deposit", async function () {
      let amount = parseEther("1000");
      await contracts.pool.approveContractAccess(
        contracts.defendedHelper.address
      );
      await contracts.defendedHelper.deposit(amount);
      expect(
        await contracts.mockYearnVault.balanceOf(contracts.pool.address)
      ).to.equal(parseEther("1000"));
    });

    it("depositFor deposits and sends shares to address", async function () {
      let amount = parseEther("1000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool
        .connect(depositor)
        .depositFor(amount, depositor2.address);
      expect(
        await contracts.pool.connect(depositor2).balanceOf(depositor2.address)
      ).to.equal(amount);
    });
  });

  describe("calculating total assets", async function () {
    it("total assets is Yearn balance * Yearn price per share", async function () {
      let amount = parseEther("10000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);
      expect(await contracts.pool.totalValue()).to.equal(parseEther("10000"));
    });

    it("total assets change with Yearn price per share", async function () {
      let amount = parseEther("10000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);
      await contracts.mockYearnVault.setPricePerFullShare(parseEther("1.5"));
      expect(await contracts.pool.totalValue()).to.equal(parseEther("15000"));
    });
  });

  describe("pool token accounting", async function () {
    it("depositor earns tokens equal to deposit when pool is empty", async function () {
      let depositAmount = parseEther("10000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, depositAmount);
      await contracts.pool.connect(depositor).deposit(depositAmount);
      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(
        depositAmount
      );
    });

    it("deposits emit an event", async function () {
      let depositAmount = parseEther("10000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, depositAmount);
      await expect(contracts.pool.connect(depositor).deposit(depositAmount))
        .to.emit(contracts.pool, "Deposit")
        .withArgs(depositor.address, parseEther("10000"), parseEther("10000"));
    });

    it("depositors earn tokens proportional to contributions", async function () {
      let deposit1Amount = parseEther("2000");
      let deposit2Amount = parseEther("3000");
      let deposit3Amount = parseEther("90000");

      await contracts.mockToken
        .connect(depositor1)
        .approve(contracts.pool.address, deposit1Amount);
      await contracts.pool.connect(depositor1).deposit(deposit1Amount);

      await contracts.mockToken
        .connect(depositor2)
        .approve(contracts.pool.address, deposit2Amount);
      await contracts.pool.connect(depositor2).deposit(deposit2Amount);
      await contracts.mockToken
        .connect(depositor2)
        .approve(contracts.pool.address, deposit3Amount);
      await contracts.pool.connect(depositor2).deposit(deposit3Amount);

      expect(await contracts.pool.balanceOf(depositor1.address)).to.equal(
        deposit1Amount
      );
      expect(await contracts.pool.balanceOf(depositor2.address)).to.equal(
        parseEther("93000.000231961566357067")
      );
    });

    it("tokens convert 1:1 minus fees on withdrawal when underlying Yearn vault value is unchanged", async function () {
      let deposit1Amount = parseEther("10000");

      await contracts.mockToken
        .connect(depositor1)
        .approve(contracts.pool.address, deposit1Amount);
      await contracts.pool.connect(depositor1).deposit(deposit1Amount);

      expect(await contracts.pool.balanceOf(depositor1.address)).to.equal(
        parseEther("10000")
      );
      expect(await contracts.mockToken.balanceOf(depositor1.address)).to.equal(
        parseEther("90000")
      );
      let withdrawal1Amount = parseEther("10000");

      expect(
        await contracts.pool.connect(depositor1).withdraw(withdrawal1Amount)
      )
        .to.emit(contracts.pool, "WithdrawalFee")
        .withArgs(rewardsManager.address, parseEther("49.999999968311261493"))
        .and.emit(contracts.pool, "ManagementFee")
        .withArgs(parseEther("0.000006337747701362"))
        .and.emit(contracts.pool, "Withdrawal")
        .withArgs(depositor1.address, parseEther("9949.999993693941037145"));
      expect(await contracts.pool.balanceOf(depositor1.address)).to.equal(
        parseEther("0")
      );

      let depositor1TokenBalance = await contracts.mockToken.balanceOf(
        depositor1.address
      );
      expect(depositor1TokenBalance).to.equal(
        parseEther("99949.999993693941037145")
      );
    });

    it("tokens convert at higher rate on withdrawal when underlying Yearn vault value increases", async function () {
      let deposit = parseEther("10000");

      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, deposit);
      await contracts.pool.connect(depositor).deposit(deposit);

      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(
        parseEther("10000")
      );
      expect(await contracts.mockToken.balanceOf(depositor.address)).to.equal(
        parseEther("90000")
      );

      contracts.mockYearnVault.setPricePerFullShare(parseEther("2"));
      let withdrawal = parseEther("10000");
      await expect(contracts.pool.connect(depositor).withdraw(withdrawal))
        .to.emit(contracts.pool, "WithdrawalFee")
        .withArgs(rewardsManager.address, parseEther("89.999999898596036782"))
        .and.to.emit(contracts.pool, "Withdrawal")
        .withArgs(depositor.address, parseEther("17909.999979820611319770"))
        .and.to.emit(contracts.pool, "PerformanceFee")
        .withArgs(parseEther("1999.999997464900915331"))
        .and.to.emit(contracts.pool, "ManagementFee")
        .withArgs(parseEther("0.000025350990805449"));
      expect(await contracts.pool.balanceOf(depositor.address)).to.equal(
        parseEther("0")
      );
      let depositorTokenBalance = await contracts.mockToken.balanceOf(
        depositor.address
      );
      expect(depositorTokenBalance).to.equal(
        parseEther("107909.999979820611319770")
      );
    });

    it("handles multiple deposits", async function () {
      let deposits = [
        [
          depositor1,
          parseEther("1000"),
          parseEther("1000"),
          parseEther("99000"),
        ],
        [
          depositor1,
          parseEther("2000"),
          parseEther("3000.000002535099083760"),
          parseEther("97000"),
        ],
        [
          depositor2,
          parseEther("3000"),
          parseEther("3000.000007605297256098"),
          parseEther("97000"),
        ],
        [
          depositor1,
          parseEther("4000"),
          parseEther("7000.000017745693607595"),
          parseEther("93000"),
        ],
        [
          depositor1,
          parseEther("5000"),
          parseEther("12000.000043096684496052"),
          parseEther("88000"),
        ],
        [
          depositor2,
          parseEther("6000"),
          parseEther("9000.000045631783610750"),
          parseEther("91000"),
        ],
      ];

      for (let [depositor, deposit, poolBalance, threeCrvBalance] of deposits) {
        await contracts.mockToken
          .connect(depositor as SignerWithAddress)
          .approve(contracts.pool.address, deposit as BigNumber);
        await contracts.pool
          .connect(depositor as SignerWithAddress)
          .deposit(deposit as BigNumber);

        expect(
          await contracts.pool.balanceOf(
            (depositor as SignerWithAddress).address
          )
        ).to.equal(poolBalance);
        expect(
          await contracts.mockToken.balanceOf(
            (depositor as SignerWithAddress).address
          )
        ).to.equal(threeCrvBalance);
      }

      expect(await contracts.mockYearnVault.balance()).to.equal(
        parseEther("21000")
      );
      let yearnPrice = await contracts.mockYearnVault.pricePerShare();
      await contracts.mockYearnVault.setPricePerFullShare(
        yearnPrice.mul(15).div(10)
      );

      let withdrawal1Amount = parseEther("12000");
      await expect(
        contracts.pool.connect(depositor1).withdraw(withdrawal1Amount)
      )
        .to.emit(contracts.pool, "Withdrawal")
        .withArgs(depositor1.address, parseEther("16715.999891031301463230"));

      let withdrawal2Amount = parseEther("9000");
      await expect(
        contracts.pool.connect(depositor2).withdraw(withdrawal2Amount)
      )
        .to.emit(contracts.pool, "Withdrawal")
        .withArgs(depositor2.address, parseEther("12536.999910327841856028"));
    });

    it("multiple small deposits", async function () {
      let deposit1Amount = parseEther("1000");
      for (let i = 0; i < 10; i++) {
        await contracts.mockToken
          .connect(depositor1)
          .approve(contracts.pool.address, deposit1Amount);
        await contracts.pool.connect(depositor1).deposit(deposit1Amount);
      }

      expect(await contracts.pool.balanceOf(depositor1.address)).to.equal(
        parseEther("10000.000057039729582795")
      );
      expect(await contracts.mockToken.balanceOf(depositor1.address)).to.equal(
        parseEther("90000")
      );

      let deposit2Amount = parseEther("10000");
      await contracts.mockToken
        .connect(depositor2)
        .approve(contracts.pool.address, deposit2Amount);
      await contracts.pool.connect(depositor2).deposit(deposit2Amount);

      expect(await contracts.pool.balanceOf(depositor2.address)).to.equal(
        parseEther("10000.000126754954919843")
      );
      expect(await contracts.mockToken.balanceOf(depositor2.address)).to.equal(
        parseEther("90000")
      );

      expect(await contracts.mockYearnVault.balance()).to.equal(
        parseEther("20000")
      );
      contracts.mockYearnVault.increasePricePerFullShare(parseEther("2"));

      let withdrawal1Amount = await contracts.pool.balanceOf(
        depositor1.address
      );
      await contracts.pool.connect(depositor1).withdraw(withdrawal1Amount);
      expect(await contracts.pool.balanceOf(depositor1.address)).to.equal(
        parseEther("0")
      );
      let depositor1TokenBalance = await contracts.mockToken.balanceOf(
        depositor1.address
      );
      expect(depositor1TokenBalance).to.equal(
        parseEther("107909.999880184880318654")
      );

      let withdrawal2Amount = await contracts.pool.balanceOf(
        depositor2.address
      );
      await contracts.pool.connect(depositor2).withdraw(withdrawal2Amount);
      expect(await contracts.pool.balanceOf(depositor2.address)).to.equal(
        parseEther("0")
      );
      let depositor2TokenBalance = await contracts.mockToken.balanceOf(
        depositor2.address
      );
      expect(depositor2TokenBalance).to.equal(
        parseEther("107909.999993693941213482")
      );
    });

    it("multiple small withdrawals", async function () {
      let deposit1Amount = parseEther("10000");
      await contracts.mockToken
        .connect(depositor1)
        .approve(contracts.pool.address, deposit1Amount);
      await contracts.pool.connect(depositor1).deposit(deposit1Amount);

      expect(await contracts.pool.balanceOf(depositor1.address)).to.equal(
        parseEther("10000")
      );
      expect(await contracts.mockToken.balanceOf(depositor1.address)).to.equal(
        parseEther("90000")
      );

      let deposit2Amount = parseEther("10000");
      await contracts.mockToken
        .connect(depositor2)
        .approve(contracts.pool.address, deposit2Amount);
      await contracts.pool.connect(depositor2).deposit(deposit2Amount);

      expect(await contracts.pool.balanceOf(depositor2.address)).to.equal(
        parseEther("10000.000012675495423790")
      );
      expect(await contracts.mockToken.balanceOf(depositor2.address)).to.equal(
        parseEther("90000")
      );

      expect(await contracts.mockYearnVault.balance()).to.equal(
        parseEther("20000")
      );
      contracts.mockYearnVault.increasePricePerFullShare(parseEther("2"));

      let withdrawal1Amount = parseEther("1000");
      for (let i = 0; i < 10; i++) {
        await contracts.pool.connect(depositor1).withdraw(withdrawal1Amount);
      }
      let depositor1TokenBalance = await contracts.mockToken.balanceOf(
        depositor1.address
      );
      expect(depositor1TokenBalance).to.equal(
        parseEther("107909.999908562145257888")
      );

      let withdrawal2Amount = parseEther("10000");
      await contracts.pool.connect(depositor2).withdraw(withdrawal2Amount);
      let depositor2TokenBalance = await contracts.mockToken.balanceOf(
        depositor2.address
      );
      expect(depositor2TokenBalance).to.equal(
        parseEther("107909.999846132161903735")
      );
    });

    it("deposits at different magnitudes", async function () {
      async function _makeDeposit(depositor, amount) {
        let weiAmount = parseEther(amount);
        await contracts.mockToken.mint(depositor.address, weiAmount);
        await contracts.mockToken
          .connect(depositor)
          .approve(contracts.pool.address, weiAmount);
        await contracts.pool.connect(depositor).deposit(weiAmount);
      }
      const makeDeposit = _makeDeposit.bind(this);
      let deposits = [
        [depositor1, "1000", "8.999999929017225984", "1790.999985874427970974"],
        [
          depositor2,
          "10000",
          "89.999999404251717918",
          "17909.999881446091866208",
        ],
        [
          depositor3,
          "100000",
          "899.999995183311759950",
          "179099.999041479040230512",
        ],
        [
          depositor4,
          "1000000",
          "8999.999963241063422761",
          "1790999.992684971621129980",
        ],
        [
          depositor5,
          "100000000",
          "899999.997464900926032325",
          "179099999.495515284280432883",
        ],
      ];

      for (let [depositor, deposit] of deposits) {
        await makeDeposit(depositor, deposit);
      }

      expect(await contracts.mockYearnVault.balance()).to.equal(
        parseEther("101111000")
      );
      contracts.mockYearnVault.increasePricePerFullShare(parseEther("2"));

      async function _expectation(depositor, amount, fee, withdrawal) {
        let withdrawalAmount = await contracts.pool.balanceOf(
          depositor.address
        );
        await expect(
          contracts.pool.connect(depositor).withdraw(withdrawalAmount)
        )
          .to.emit(contracts.pool, "WithdrawalFee")
          .withArgs(rewardsManager.address, parseEther(fee))
          .and.emit(contracts.pool, "Withdrawal")
          .withArgs(depositor.address, parseEther(withdrawal));
        expect(await contracts.pool.balanceOf(depositor.address)).to.equal(
          parseEther("0")
        );
      }
      const expectFeeAndWithdrawalForAmount = _expectation.bind(this);

      for (let [depositor, deposit, withdrawalFee, withdrawal] of deposits) {
        await expectFeeAndWithdrawalForAmount(
          depositor,
          deposit,
          withdrawalFee,
          withdrawal
        );
      }
    });
  });

  describe("calculating pool token value", async function () {
    it("calculated value is greater than realized withdrawal amount due to fees", async function () {
      let amount = parseEther("20000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);
      await expect(
        contracts.pool.connect(depositor).withdraw(parseEther("10000"))
      )
        .to.emit(contracts.pool, "WithdrawalFee")
        .withArgs(rewardsManager.address, parseEther("49.999999968311261493"))
        .and.emit(contracts.pool, "Withdrawal")
        .withArgs(depositor.address, parseEther("9949.999993693941037145"));
      expect(
        await contracts.pool.connect(depositor).valueFor(parseEther("10000"))
      ).to.equal(parseEther("9999.999993662252298638"));
    });

    it("when underlying vault value increases", async function () {
      let amount = parseEther("20000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);
      await contracts.mockYearnVault.setPricePerFullShare(parseEther("2"));
      await expect(
        contracts.pool.connect(depositor).withdraw(parseEther("10000"))
      )
        .to.emit(contracts.pool, "WithdrawalFee")
        .withArgs(rewardsManager.address, parseEther("89.999999898596036782"))
        .and.emit(contracts.pool, "Withdrawal")
        .withArgs(depositor.address, parseEther("17909.999979820611319769"));
      expect(
        await contracts.pool.connect(depositor).valueFor(parseEther("10000"))
      ).to.equal(parseEther("17999.999979719207356554"));
    });

    it("is unchanged by other deposits", async function () {
      let amount = parseEther("10000");
      await contracts.mockToken.mint(depositor.address, amount);
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);

      let amount1 = parseEther("10000");
      await contracts.mockToken.mint(depositor1.address, amount);
      await contracts.mockToken
        .connect(depositor1)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor1).deposit(amount);

      let amount2 = parseEther("15000");
      await contracts.mockToken.mint(depositor2.address, amount);
      await contracts.mockToken
        .connect(depositor2)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor2).deposit(amount);

      let amount3 = parseEther("250000");
      await contracts.mockToken.mint(depositor3.address, amount);
      await contracts.mockToken
        .connect(depositor3)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor3).deposit(amount);

      let amount4 = parseEther("250000000");
      await contracts.mockToken.mint(depositor4.address, amount);
      await contracts.mockToken
        .connect(depositor4)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor4).deposit(amount);

      await expect(
        await contracts.pool.connect(depositor).withdraw(parseEther("10000"))
      )
        .to.emit(contracts.pool, "WithdrawalFee")
        .withArgs(rewardsManager.address, parseEther("49.999999588046400699"))
        .and.emit(contracts.pool, "Withdrawal")
        .withArgs(depositor.address, parseEther("9949.999918021233739196"));
      expect(
        await contracts.pool.connect(depositor).valueFor(parseEther("10000"))
      ).to.equal(parseEther("9999.999917609280140895"));
    });

    it("calculating value for a single pool token", async function () {
      let amount = parseEther("10000");
      await contracts.mockToken
        .connect(depositor)
        .approve(contracts.pool.address, amount);
      await contracts.pool.connect(depositor).deposit(amount);
      let valueForOneShare = await contracts.pool.valueFor(parseEther("1"));
      let pricePerPoolToken = await contracts.pool.pricePerPoolToken();
      expect(pricePerPoolToken).to.equal(parseEther("1"));
      expect(valueForOneShare).to.equal(pricePerPoolToken);
    });
  });

  describe("fees", async function () {
    describe("management fees", async function () {
      beforeEach(async function () {
        await contracts.pool.connect(owner).setPerformanceFee(0);
      });

      it("management fee issues pool tokens to contract on deposit", async function () {
        let amount = parseEther("10000");
        await contracts.mockToken
          .connect(depositor)
          .approve(contracts.pool.address, amount);

        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          0
        );
        await contracts.pool.connect(depositor).deposit(amount);
        await provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await contracts.pool.takeFees();

        let managementTokenBalance = await contracts.pool.balanceOf(
          contracts.pool.address
        );
        expect(await contracts.pool.valueFor(managementTokenBalance)).to.equal(
          parseEther("199.867211510161057378")
        );
      });

      it("shorter periods issue fewer shares", async function () {
        let amount = parseEther("10000");
        await contracts.mockToken
          .connect(depositor)
          .approve(contracts.pool.address, amount);

        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          0
        );
        await contracts.pool.connect(depositor).deposit(amount);
        await provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
        await contracts.pool.takeFees();

        let managementTokenBalance = await contracts.pool.balanceOf(
          contracts.pool.address
        );
        expect(await contracts.pool.valueFor(managementTokenBalance)).to.equal(
          parseEther("3.833069809783910688")
        );
      });

      it("feesUpdatedAt is contract creation block for new pool", async function () {
        let deployBlock = await provider.getBlock(
          contracts.pool.deployTransaction.blockNumber
        );
        let deployTimestamp = deployBlock.timestamp;
        expect(await contracts.pool.feesUpdatedAt()).to.equal(deployTimestamp);
      });

      it("larger management fees dilute token value", async function () {
        await contracts.pool.connect(owner).setManagementFee(5000);

        let amount = parseEther("10000");
        await contracts.mockToken
          .connect(depositor)
          .approve(contracts.pool.address, amount);

        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          0
        );
        await contracts.pool.connect(depositor).deposit(amount);
        await provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await contracts.pool.takeFees();

        let managementTokenBalance = await contracts.pool.balanceOf(
          contracts.pool.address
        );
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("0.500331971224597356")
        );
        expect(await contracts.pool.valueFor(managementTokenBalance)).to.equal(
          parseEther("4996.680287754026434491")
        );
      });
    });

    describe("performance fees", async function () {
      beforeEach(async function () {
        await contracts.pool.connect(owner).setManagementFee(0);
      });

      it("takes no performance fee when value is unchanged", async function () {
        let amount = parseEther("20000");
        await contracts.mockToken
          .connect(depositor)
          .approve(contracts.pool.address, amount);
        await contracts.pool.connect(depositor).deposit(amount);
        await expect(
          contracts.pool.connect(depositor).withdraw(parseEther("10000"))
        ).not.to.emit(contracts.pool, "PerformanceFee");
      });

      it("takes a performance fee when value increases", async function () {
        let amount = parseEther("20000");
        await contracts.mockToken
          .connect(depositor)
          .approve(contracts.pool.address, amount);
        await contracts.pool.connect(depositor).deposit(amount);
        await contracts.mockYearnVault.setPricePerFullShare(parseEther("1.5"));
        await expect(
          contracts.pool.connect(depositor).withdraw(parseEther("10000"))
        )
          .to.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("2000"));
      });

      it("takes no performance fee when value decreases below HWM", async function () {
        let amount = parseEther("20000");
        await contracts.mockToken
          .connect(depositor)
          .approve(contracts.pool.address, amount);
        await contracts.pool.connect(depositor).deposit(amount);
        await contracts.mockYearnVault.setPricePerFullShare(parseEther("1.5"));
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.5")
        );
        await expect(
          contracts.pool.connect(depositor).withdraw(parseEther("10000"))
        )
          .to.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("2000"));
        await contracts.mockYearnVault.setPricePerFullShare(parseEther("1.25"));
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.166666666666666666")
        );
        await expect(
          contracts.pool.connect(depositor).withdraw(parseEther("10000"))
        ).not.to.emit(contracts.pool, "PerformanceFee");
      });

      it("takes a performance fee when value decreases below HWM, then increases above it", async function () {
        let amount = parseEther("30000");
        await contracts.mockToken
          .connect(depositor)
          .approve(contracts.pool.address, amount);
        await contracts.pool.connect(depositor).deposit(amount);

        await contracts.mockYearnVault.setPricePerFullShare(parseEther("1.5"));
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.5")
        );
        await expect(
          contracts.pool.connect(depositor).withdraw(parseEther("10000"))
        )
          .to.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("3000"));

        await contracts.mockYearnVault.setPricePerFullShare(parseEther("1.25"));
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.166666666666666666")
        );
        await expect(
          contracts.pool.connect(depositor).withdraw(parseEther("10000"))
        ).not.to.emit(contracts.pool, "PerformanceFee");

        await contracts.mockYearnVault.setPricePerFullShare(parseEther("1.75"));
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.633333333333333332")
        );
        await expect(
          contracts.pool.connect(depositor).withdraw(parseEther("10000"))
        )
          .to.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("566.666666666666663428"));
      });
    });

    describe("combined fees", async function () {
      it("combined fees over time", async function () {
        let initialDeposit = parseEther("10000");
        await contracts.mockToken
          .connect(depositor1)
          .approve(contracts.pool.address, initialDeposit);

        // Management fee:  None
        // Performance fee: None
        await expect(contracts.pool.connect(depositor1).deposit(initialDeposit))
          .to.emit(contracts.pool, "Deposit")
          .withArgs(
            depositor1.address,
            parseEther("10000"),
            parseEther("10000")
          )
          .and.not.to.emit(contracts.pool, "ManagementFee")
          .and.not.to.emit(contracts.pool, "PerformanceFee");

        // yVault share price: $1.00
        // Pool token price:   $1.00
        // Total pool value:   $10,000
        // Pool share value:   $0
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1")
        );
        expect(await contracts.pool.totalValue()).to.equal(parseEther("10000"));
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("0")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("10000")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("0"));

        // Increase vault share value by 10% in each period
        await contracts.mockYearnVault.setPricePerFullShare(parseEther("1.1"));
        // Fast forward 30 days in each period
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $11,000
        // Gain this period: $1,000
        expect(await contracts.pool.totalValue()).to.equal(parseEther("11000"));

        // We've had assets worth $11,000 under management for 30 days.
        // Management fee:  $18.07

        // We've earned $1000 profit this period
        // Performance fee: $196
        await contracts.mockToken
          .connect(depositor2)
          .approve(contracts.pool.address, initialDeposit);
        await expect(contracts.pool.connect(depositor2).deposit(initialDeposit))
          .to.emit(contracts.pool, "Deposit")
          .withArgs(
            depositor2.address,
            parseEther("10000"),
            parseEther("9271.669698336058197924")
          )
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("18.070200189169093390"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("196.709102950288323885"));

        // yVault share price: $1.10
        // Pool token price:   $1.07
        // Total pool value: $20,999
        // Pool share value: $214
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.078554383984866471")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("20999.999999999999991427")
        );
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("198.836668169664009768")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("19470.506366505722207692")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("214.456160151335273221"));

        let yearnPrice = await contracts.mockYearnVault.pricePerShare();
        await contracts.mockYearnVault.setPricePerFullShare(
          yearnPrice.mul(110).div(100)
        );
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $23,099
        // Gain this period: $2,100
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("23099.999999999999972855")
        );

        // Management fee:  $38
        // Performance fee: $413
        await contracts.mockToken
          .connect(depositor3)
          .approve(contracts.pool.address, initialDeposit);
        await expect(contracts.pool.connect(depositor3).deposit(initialDeposit))
          .to.emit(contracts.pool, "Deposit")
          .withArgs(
            depositor3.address,
            parseEther("10000"),
            parseEther("8596.385899504305242976")
          )
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("37.947420397255096074"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("413.089116195605481713"));

        // yVault share price: $1.21
        // Pool token price:   $1.16
        // Total pool value: $33,099
        // Pool share value: $681
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.163279559212974789")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("33099.999999999999973372")
        );
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("585.981729518886890461")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("28454.037327359250331361")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("681.660568021587359665"));

        yearnPrice = await contracts.mockYearnVault.pricePerShare();
        await contracts.mockYearnVault.setPricePerFullShare(
          yearnPrice.mul(110).div(100)
        );
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $36,409
        // Gain this period: $3,310
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("36409.999999999999939954")
        );

        // Management fee:  $59
        // Performance fee: $651
        await contracts.mockToken
          .connect(depositor4)
          .approve(contracts.pool.address, initialDeposit);
        await expect(contracts.pool.connect(depositor4).deposit(initialDeposit))
          .to.emit(contracts.pool, "Deposit")
          .withArgs(
            depositor4.address,
            parseEther("10000"),
            parseEther("7970.285065963742610210")
          )
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("59.812362626149699023"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("651.107130765454348514"));

        // yVault share price: $1.33
        // Pool token price:   $1.25
        // Total pool value: $46,409
        // Pool share value: $1,445
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.254660268389137024")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("46409.999999999999936980")
        );
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("1151.752327333623352649")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("36990.092991137729403759")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("1445.057884130217075157"));

        yearnPrice = await contracts.mockYearnVault.pricePerShare();
        await contracts.mockYearnVault.setPricePerFullShare(
          yearnPrice.mul(110).div(100)
        );
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $51,509
        // Gain this period: $5,100
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("51050.999999999999895633")
        );

        // Management fee:  $83
        // Performance fee: $912
        await contracts.mockToken
          .connect(depositor5)
          .approve(contracts.pool.address, initialDeposit);
        await expect(contracts.pool.connect(depositor5).deposit(initialDeposit))
          .to.emit(contracts.pool, "Deposit")
          .withArgs(
            depositor5.address,
            parseEther("10000"),
            parseEther("7389.785053319644314748")
          )
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("83.863799077933762252"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("912.926946792288111925"));

        // yVault share price: $1.46
        // Pool token price:   $1.35
        // Total pool value: $61,051
        // Pool share value: $2,553
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.353219332882732919")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("61050.999999999999903594")
        );
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("1887.251011898010068869")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("45115.376729021760434727")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("2553.864555302887833935"));

        yearnPrice = await contracts.mockYearnVault.pricePerShare();
        await contracts.mockYearnVault.setPricePerFullShare(
          yearnPrice.mul(110).div(100)
        );
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $67,156
        // Gain this period: $6,104
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("67156.099999999999847729")
        );

        // Withdrawal:      $14,522
        // Withdrawal fee:  $73
        // Management fee:  $110
        // Performance fee: $1,200
        var withdrawalAmount = await contracts.pool.balanceOf(
          depositor1.address
        );
        await expect(
          contracts.pool.connect(depositor1).withdraw(withdrawalAmount)
        )
          .to.emit(contracts.pool, "Withdrawal")
          .withArgs(depositor1.address, parseEther("14522.230415048255454266"))
          .and.emit(contracts.pool, "WithdrawalFee")
          .withArgs(rewardsManager.address, parseEther("72.976032236423394242"))
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("110.320336613054391061"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("1200.928752185809556612"));

        // yVault share price: $1.61
        // Pool token price:   $1.46
        // Total pool value: $52,560
        // Pool share value: $4,063
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.459520644728467885")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("52560.893552715321026411")
        );
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("2784.310107306711095891")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("36012.435824430461461749")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("4063.758082940280580937"));

        yearnPrice = await contracts.mockYearnVault.pricePerShare();
        await contracts.mockYearnVault.setPricePerFullShare(
          yearnPrice.mul(110).div(100)
        );
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $57,816
        // Gain this period: $5,253
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("57816.982907986853097131")
        );

        // Withdrawal:      $14,522
        // Withdrawal fee:  $73
        // Management fee:  $95
        // Performance fee: $1,033
        withdrawalAmount = await contracts.pool.balanceOf(depositor2.address);
        await expect(
          contracts.pool.connect(depositor2).withdraw(withdrawalAmount)
        )
          .to.emit(contracts.pool, "Withdrawal")
          .withArgs(depositor2.address, parseEther("14522.230422557718663450"))
          .and.emit(contracts.pool, "WithdrawalFee")
          .withArgs(rewardsManager.address, parseEther("72.976032274159390267"))
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("94.978550218972244984"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("1033.920628786319189082"));

        // yVault share price: $1.77
        // Pool token price:   $1.57
        // Total pool value: $43,221
        // Pool share value: $5,510
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.574172390702314309")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("43221.776453154975064694")
        );
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("3500.369363514721164791")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("27456.825382302413332725")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("5510.184809305106909525"));

        yearnPrice = await contracts.mockYearnVault.pricePerShare();
        await contracts.mockYearnVault.setPricePerFullShare(
          yearnPrice.mul(110).div(100)
        );
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $47,543
        // Gain this period: $4,319
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("47543.954098470472555255")
        );

        // Withdrawal:      $14,522
        // Withdrawal fee:  $73
        // Management fee:  $78
        // Performance fee: $850
        withdrawalAmount = await contracts.pool.balanceOf(depositor3.address);
        await expect(
          contracts.pool.connect(depositor3).withdraw(withdrawalAmount)
        )
          .to.emit(contracts.pool, "Withdrawal")
          .withArgs(depositor3.address, parseEther("14522.230430067181878507"))
          .and.emit(contracts.pool, "WithdrawalFee")
          .withArgs(rewardsManager.address, parseEther("72.976032311895386322"))
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("78.102585171843949525"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("850.211692898419517187"));

        // yVault share price: $1.94
        // Pool token price:   $1.70
        // Total pool value: $32,948
        // Pool share value: $6,869
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.697830534017869412")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("32948.747636091395306333")
        );
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("4046.311716787782863304")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("19406.381836071169788262")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("6869.951582916563356767"));

        yearnPrice = await contracts.mockYearnVault.pricePerShare();
        await contracts.mockYearnVault.setPricePerFullShare(
          yearnPrice.mul(110).div(100)
        );
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $36,243
        // Gain this period: $3,281
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("36243.622399700534818223")
        );

        // Withdrawal:      $14,531
        // Withdrawal fee:  $73
        // Management fee:  $59
        // Performance fee: $648
        withdrawalAmount = await contracts.pool.balanceOf(depositor4.address);
        await expect(
          contracts.pool.connect(depositor4).withdraw(withdrawalAmount)
        )
          .to.emit(contracts.pool, "Withdrawal")
          .withArgs(depositor4.address, parseEther("14522.230437576645095717"))
          .and.emit(contracts.pool, "WithdrawalFee")
          .withArgs(rewardsManager.address, parseEther("72.976032349631382390"))
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("59.539023606364889707"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("648.131863273269589630"));

        // yVault share price: $2.14
        // Pool token price:   $1.83
        // Total pool value:   $21,648
        // Pool share value:   $8,116
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.831202566675257121")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("21648.415929774258351143")
        );
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("4432.181737104452917788")
        );
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("11821.966790424097232536")
        );
        expect(
          await contracts.pool.valueFor(
            await contracts.pool.balanceOf(contracts.pool.address)
          )
        ).to.equal(parseEther("8116.222572956873876835"));

        yearnPrice = await contracts.mockYearnVault.pricePerShare();
        await contracts.mockYearnVault.setPricePerFullShare(
          yearnPrice.mul(110).div(100)
        );
        await provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
        // Total pool value: $23,813
        // Gain this period: $2,155
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("23813.257522751684179013")
        );

        // Withdrawal:      $14,522
        // Withdrawal fee:  $73
        // Management fee:  $39
        // Performance fee: $425
        withdrawalAmount = await contracts.pool.balanceOf(depositor5.address);
        await expect(
          contracts.pool.connect(depositor5).withdraw(withdrawalAmount)
        )
          .to.emit(contracts.pool, "Withdrawal")
          .withArgs(depositor5.address, parseEther("14522.230445086108316041"))
          .and.emit(contracts.pool, "WithdrawalFee")
          .withArgs(rewardsManager.address, parseEther("72.976032387367378471"))
          .and.emit(contracts.pool, "ManagementFee")
          .withArgs(parseEther("39.119105870699989114"))
          .and.emit(contracts.pool, "PerformanceFee")
          .withArgs(parseEther("425.844050537144392781"));

        // yVault share price: $2.35
        // Pool token price:   $1.97
        // Total pool value:   $9,218
        expect(await contracts.pool.pricePerPoolToken()).to.equal(
          parseEther("1.975051557273239907")
        );
        expect(await contracts.pool.totalValue()).to.equal(
          parseEther("9218.051045278208491088")
        );
        let poolBalance = await contracts.pool.balanceOf(
          contracts.pool.address
        );

        // All external depositors have withdrawn their pool tokens. The only remaining balance is owned by the pool.
        expect(poolBalance).to.equal(parseEther("4667.245779651781863454"));
        expect(await contracts.pool.totalSupply()).to.equal(
          parseEther("4667.245779651781863454")
        );

        // $9,218 in management and performance fees drawn as pool tokens over pool lifetime
        expect(await contracts.pool.valueFor(poolBalance)).to.equal(
          parseEther("9218.051045278208491088")
        );

        // $365 in withdrawal fees sent as DAI to rewardsManager over pool lifetime
        expect(
          await contracts.mockToken.balanceOf(rewardsManager.address)
        ).to.equal(parseEther("364.880161559476931679"));
      });
    });
  });

  describe("governance", async function () {
    it("owner can set withdrawalFee", async function () {
      await contracts.pool.connect(owner).setWithdrawalFee(20);
      expect(await contracts.pool.withdrawalFee()).to.equal(20);
    });

    it("non-owner cannot set withdrawalFee", async function () {
      expect(
        contracts.pool.connect(depositor).setWithdrawalFee(20)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner can set managementFee", async function () {
      await contracts.pool.connect(owner).setManagementFee(500);
      expect(await contracts.pool.managementFee()).to.equal(500);
    });

    it("non-owner cannot set managementFee", async function () {
      expect(
        contracts.pool.connect(depositor).setManagementFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner can set performanceFee", async function () {
      await contracts.pool.connect(owner).setPerformanceFee(5000);
      expect(await contracts.pool.performanceFee()).to.equal(5000);
    });

    it("non-owner cannot set performanceFee", async function () {
      expect(
        contracts.pool.connect(depositor).setPerformanceFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner can pause the contract", async function () {
      await expect(contracts.pool.connect(owner).pauseContract()).to.emit(
        contracts.pool,
        "Paused"
      );
    });

    it("non-owner cannot pause the contract", async function () {
      expect(
        contracts.pool.connect(depositor).pauseContract()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("deposits to the pool should not be allowed when paused", async function () {
      let deposit1Amount = parseEther("1000");
      await contracts.pool.connect(owner).pauseContract();
      await contracts.mockToken
        .connect(depositor1)
        .approve(contracts.pool.address, deposit1Amount);

      expect(
        contracts.pool.connect(depositor1).deposit(deposit1Amount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("deposits to the pool can resume when paused and unpaused", async function () {
      let deposit1Amount = parseEther("1000");
      await contracts.pool.connect(owner).pauseContract();
      await contracts.mockToken
        .connect(depositor1)
        .approve(contracts.pool.address, deposit1Amount);

      await contracts.pool.connect(owner).unpauseContract();
      await contracts.pool.connect(depositor1).deposit(deposit1Amount);

      expect(await contracts.pool.totalValue()).to.equal(parseEther("1000"));
    });

    it("withdrawals are allowed when the pool is paused", async function () {
      let deposit1Amount = parseEther("1000");
      await contracts.mockToken
        .connect(depositor1)
        .approve(contracts.pool.address, deposit1Amount);
      await contracts.pool.connect(depositor1).deposit(deposit1Amount);
      await contracts.pool.connect(owner).pauseContract();

      expect(contracts.pool.connect(depositor1).withdraw(parseEther("1000")))
        .not.to.be.reverted;
    });

    describe("sending accrued fees to rewards manager", async function () {
      it("owner can withdraw accrued fees", async function () {
        let deposit1Amount = parseEther("10000");
        await contracts.mockToken
          .connect(depositor1)
          .approve(contracts.pool.address, deposit1Amount);
        await contracts.pool.connect(depositor1).deposit(deposit1Amount);
        await contracts.mockYearnVault.setPricePerFullShare(parseEther("2"));
        await provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await contracts.pool.takeFees();
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          parseEther("1312.081263122647200413")
        );
        await contracts.pool.connect(owner).withdrawAccruedFees();
        expect(await contracts.pool.balanceOf(contracts.pool.address)).to.equal(
          0
        );
        expect(
          await contracts.mockToken.balanceOf(rewardsManager.address)
        ).to.equal(parseEther("2624.162526245294400826"));
      });
    });
  });

  describe("block lock modifier", async function () {
    it("prevents a deposit and withdrawal in the same block", async function () {
      await contracts.mockToken.mint(
        contracts.blockLockHelper.address,
        parseEther("1000")
      );
      await expect(
        contracts.blockLockHelper.depositThenWithdraw()
      ).to.be.revertedWith("Locked until next block");
    });

    it("prevents a withdrawal and deposit in the same block", async function () {
      await contracts.mockToken.mint(
        contracts.blockLockHelper.address,
        parseEther("1000")
      );
      await contracts.blockLockHelper.deposit();
      await expect(
        contracts.blockLockHelper.withdrawThenDeposit()
      ).to.be.revertedWith("Locked until next block");
    });

    it("prevents a deposit and a transfer in the same block", async function () {
      await contracts.mockToken.mint(
        contracts.blockLockHelper.address,
        parseEther("1000")
      );
      await expect(
        contracts.blockLockHelper.depositThenTransfer()
      ).to.be.revertedWith("Locked until next block");
    });

    it("prevents a deposit and transferFrom in the same block", async function () {
      await contracts.mockToken.mint(
        contracts.blockLockHelper.address,
        parseEther("1000")
      );
      await expect(
        contracts.blockLockHelper.depositThenTransferFrom()
      ).to.be.revertedWith("Locked until next block");
    });
  });
});
