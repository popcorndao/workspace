import { expect } from "chai";
import { waffle, ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { KeeperIncentiveHelper, MockERC20 } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

let deployTimestamp;
let owner: SignerWithAddress, nonOwner: SignerWithAddress;
let mockPop: MockERC20;
let keeperIncentiveHelper: KeeperIncentiveHelper;
const dayInSec = 86400;
const incentive = parseEther("10");

describe("Keeper incentives", function () {
  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();
    const mockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockPop = (await (
      await mockERC20Factory.deploy("TestPOP", "TPOP", 18)
    ).deployed()) as MockERC20;
    await mockPop.mint(owner.address, parseEther("100"));
    await mockPop.mint(nonOwner.address, parseEther("10"));

    deployTimestamp = (await waffle.provider.getBlock("latest")).timestamp + 1;
    keeperIncentiveHelper = await (
      await (
        await ethers.getContractFactory("KeeperIncentiveHelper")
      ).deploy(mockPop.address)
    ).deployed();
  });
  it("should create incentives with the correct parameters", async function () {
    expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
      BigNumber.from(deployTimestamp),
      BigNumber.from(dayInSec),
      BigNumber.from(30 * dayInSec),
      incentive,
      true,
      false,
    ]);
    await keeperIncentiveHelper.createIncentive(
      deployTimestamp + 100,
      dayInSec,
      30 * dayInSec,
      incentive,
      true,
      false
    );
    expect(await keeperIncentiveHelper.incentives(1)).to.deep.equal([
      BigNumber.from(deployTimestamp + 100),
      BigNumber.from(dayInSec),
      BigNumber.from(30 * dayInSec),
      incentive,
      true,
      false,
    ]);
  });
  it("functions should only be available for Governance", async function () {
    const timestamp = (await waffle.provider.getBlock("latest")).timestamp;
    await expect(
      keeperIncentiveHelper
        .connect(nonOwner)
        .createIncentive(
          timestamp + 10,
          dayInSec,
          30 * dayInSec,
          incentive,
          true,
          false
        )
    ).to.be.revertedWith(
      "Only the contract governance may perform this action"
    );
    await expect(
      keeperIncentiveHelper
        .connect(nonOwner)
        .updateIncentive(
          0,
          timestamp + 100,
          dayInSec,
          30 * dayInSec,
          incentive,
          true,
          false
        )
    ).to.be.revertedWith(
      "Only the contract governance may perform this action"
    );
    await expect(
      keeperIncentiveHelper.connect(nonOwner).whitelistAccount(owner.address)
    ).to.be.revertedWith(
      "Only the contract governance may perform this action"
    );
    await expect(
      keeperIncentiveHelper.connect(nonOwner).removeWhitelisting(owner.address)
    ).to.be.revertedWith(
      "Only the contract governance may perform this action"
    );
    await expect(
      keeperIncentiveHelper.connect(nonOwner).toggleWhitelisting(0)
    ).to.be.revertedWith(
      "Only the contract governance may perform this action"
    );
    await expect(
      keeperIncentiveHelper
        .connect(nonOwner)
        .changeTargetDate(0, timestamp + 1000)
    ).to.be.revertedWith(
      "Only the contract governance may perform this action"
    );
    await expect(
      keeperIncentiveHelper.connect(nonOwner).toggleIncentive(0)
    ).to.be.revertedWith(
      "Only the contract governance may perform this action"
    );
  });
  describe("change incentives", function () {
    it("should change the whole incentive", async function () {
      const timestamp = (await waffle.provider.getBlock("latest")).timestamp;
      const result = await keeperIncentiveHelper
        .connect(owner)
        .updateIncentive(
          0,
          timestamp + 100,
          2 * dayInSec,
          10 * dayInSec,
          parseEther("100"),
          false,
          true
        );
      expect(result)
        .to.emit(keeperIncentiveHelper, "IncentiveChanged")
        .withArgs(0);
      expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
        BigNumber.from(timestamp + 100),
        BigNumber.from(2 * dayInSec),
        BigNumber.from(10 * dayInSec),
        parseEther("100"),
        false,
        true,
      ]);
    });
    it("should change the targetDate", async function () {
      const timestamp = (await waffle.provider.getBlock("latest")).timestamp;
      const result = await keeperIncentiveHelper
        .connect(owner)
        .changeTargetDate(0, timestamp + 1000);
      expect(result)
        .to.emit(keeperIncentiveHelper, "TargetDateChanged")
        .withArgs(0, timestamp + 1000);
      expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
        BigNumber.from(timestamp + 1000),
        BigNumber.from(dayInSec),
        BigNumber.from(30 * dayInSec),
        incentive,
        true,
        false,
      ]);
    });
    it("should toggle if the incentive is enabled", async function () {
      const result = await keeperIncentiveHelper
        .connect(owner)
        .toggleIncentive(0);
      expect(result)
        .to.emit(keeperIncentiveHelper, "IncentiveToggled")
        .withArgs(0, false);
      expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
        BigNumber.from(deployTimestamp),
        BigNumber.from(dayInSec),
        BigNumber.from(30 * dayInSec),
        incentive,
        false,
        false,
      ]);
      const result2 = await keeperIncentiveHelper
        .connect(owner)
        .toggleIncentive(0);
      expect(result2)
        .to.emit(keeperIncentiveHelper, "IncentiveToggled")
        .withArgs(0, true);
      expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
        BigNumber.from(deployTimestamp),
        BigNumber.from(dayInSec),
        BigNumber.from(30 * dayInSec),
        incentive,
        true,
        false,
      ]);
    });
    it("should fund incentives", async function () {
      await mockPop
        .connect(nonOwner)
        .approve(keeperIncentiveHelper.address, incentive);
      const result = await keeperIncentiveHelper
        .connect(nonOwner)
        .fundIncentive(incentive);
      expect(result)
        .to.emit(keeperIncentiveHelper, "IncentiveFunded")
        .withArgs(incentive);
      expect(await mockPop.balanceOf(keeperIncentiveHelper.address)).to.equal(
        incentive
      );
      expect(await keeperIncentiveHelper.incentiveBudget()).to.equal(incentive);
    });
    context("targetDate in the past", function () {
      it("should not allow a new incentive with target date in the past", async function () {
        const timestamp = (await waffle.provider.getBlock("latest")).timestamp;
        await expect(
          keeperIncentiveHelper
            .connect(owner)
            .createIncentive(
              timestamp - 1,
              dayInSec,
              30 * dayInSec,
              incentive,
              false,
              true
            )
        ).to.revertedWith("must be in the future");
      });
      it("should not allow changing incentive with target date in the past", async function () {
        const timestamp = (await waffle.provider.getBlock("latest")).timestamp;
        await expect(
          keeperIncentiveHelper
            .connect(owner)
            .updateIncentive(
              0,
              timestamp - 1,
              dayInSec,
              30 * dayInSec,
              incentive,
              false,
              true
            )
        ).to.revertedWith("must be in the future");
      });
      it("should not allow to change target date in the past", async function () {
        const timestamp = (await waffle.provider.getBlock("latest")).timestamp;
        await expect(
          keeperIncentiveHelper
            .connect(owner)
            .changeTargetDate(0, timestamp - 1)
        ).to.revertedWith("must be in the future");
      });
    });
    context("whitelisting", function () {
      it("should whitelist", async function () {
        expect(
          await keeperIncentiveHelper
            .connect(owner)
            .whitelistAccount(nonOwner.address)
        )
          .to.emit(keeperIncentiveHelper, "Whitelisted")
          .withArgs(nonOwner.address);
        expect(
          await keeperIncentiveHelper.whitelisted(nonOwner.address)
        ).to.equal(true);
      });
      it("should remove whitelisting", async function () {
        await keeperIncentiveHelper
          .connect(owner)
          .whitelistAccount(nonOwner.address);
        expect(
          await keeperIncentiveHelper
            .connect(owner)
            .removeWhitelisting(nonOwner.address)
        )
          .to.emit(keeperIncentiveHelper, "RemovedWhitelisting")
          .withArgs(nonOwner.address);
        expect(
          await keeperIncentiveHelper.whitelisted(nonOwner.address)
        ).to.equal(false);
      });
      it("should toggle whitelisting", async function () {
        expect(await keeperIncentiveHelper.connect(owner).toggleWhitelisting(0))
          .to.emit(keeperIncentiveHelper, "WhitelistingToggled")
          .withArgs(0, true);
        expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
          BigNumber.from(deployTimestamp),
          BigNumber.from(dayInSec),
          BigNumber.from(30 * dayInSec),
          incentive,
          true,
          true,
        ]);
        expect(await keeperIncentiveHelper.connect(owner).toggleWhitelisting(0))
          .to.emit(keeperIncentiveHelper, "WhitelistingToggled")
          .withArgs(0, false);
        expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
          BigNumber.from(deployTimestamp),
          BigNumber.from(dayInSec),
          BigNumber.from(30 * dayInSec),
          incentive,
          true,
          false,
        ]);
      });
    });
  });
  describe("call incentivized functions", function () {
    it("should pay out keeper incentive rewards", async function () {
      const oldBalance = await mockPop.balanceOf(owner.address);

      await mockPop
        .connect(nonOwner)
        .approve(keeperIncentiveHelper.address, incentive);
      await keeperIncentiveHelper.connect(nonOwner).fundIncentive(incentive);

      expect(
        await keeperIncentiveHelper.connect(owner).defaultIncentivisedFunction()
      )
        .to.emit(keeperIncentiveHelper, "FunctionCalled")
        .withArgs(owner.address);
      const newBalance = await mockPop.balanceOf(owner.address);
      expect(newBalance).to.deep.equal(oldBalance.add(incentive));
    });
    it("should advance the targetDate by its interval", async function () {
      const result = await keeperIncentiveHelper
        .connect(owner)
        .defaultIncentivisedFunction();
      expect(result)
        .to.emit(keeperIncentiveHelper, "TargetDateChanged")
        .withArgs(0, deployTimestamp + 30 * dayInSec);

      expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
        BigNumber.from(deployTimestamp + 30 * dayInSec),
        BigNumber.from(dayInSec),
        BigNumber.from(30 * dayInSec),
        incentive,
        true,
        false,
      ]);
    });
    it("should not pay out rewards if the incentive budget is not high enough", async function () {
      const oldBalance = await mockPop.balanceOf(owner.address);
      const result = await keeperIncentiveHelper
        .connect(owner)
        .defaultIncentivisedFunction();
      expect(result)
        .to.emit(keeperIncentiveHelper, "TargetDateChanged")
        .withArgs(0, deployTimestamp + 30 * dayInSec);
      const newBalance = await mockPop.balanceOf(owner.address);
      expect(newBalance).to.equal(oldBalance);
    });
    context("whitelisting", function () {
      it("should not be callable for non whitelisted addresses", async function () {
        await expect(
          keeperIncentiveHelper.connect(nonOwner).defaultIncentivisedFunction()
        ).to.revertedWith("you are not whitelisted");
      });
      it("should be callable for non whitelisted addresses if the incentive is open to everyone", async function () {
        await keeperIncentiveHelper.connect(owner).toggleWhitelisting(0);
        await mockPop
          .connect(owner)
          .approve(keeperIncentiveHelper.address, parseEther("11"));
        await keeperIncentiveHelper
          .connect(owner)
          .fundIncentive(parseEther("11"));

        const oldBalance = await mockPop.balanceOf(nonOwner.address);
        const result = await keeperIncentiveHelper
          .connect(nonOwner)
          .defaultIncentivisedFunction();

        expect(result)
          .to.emit(keeperIncentiveHelper, "TargetDateChanged")
          .withArgs(0, deployTimestamp + 30 * dayInSec);
        expect(result)
          .to.emit(keeperIncentiveHelper, "FunctionCalled")
          .withArgs(nonOwner.address);

        expect(await keeperIncentiveHelper.incentives(0)).to.deep.equal([
          BigNumber.from(deployTimestamp + 30 * dayInSec),
          BigNumber.from(dayInSec),
          BigNumber.from(30 * dayInSec),
          incentive,
          true,
          true,
        ]);

        const newbalance = await mockPop.balanceOf(nonOwner.address);
        expect(newbalance).to.equal(oldBalance.add(incentive))
      });
    });
    context("should not do anything ", function () {
      it("if the incentive for this function wasnt set yet", async function () {
        await mockPop
          .connect(nonOwner)
          .approve(keeperIncentiveHelper.address, incentive);
        await keeperIncentiveHelper.connect(nonOwner).fundIncentive(incentive);

        const oldBalance = await mockPop.balanceOf(owner.address);
        expect(
          await keeperIncentiveHelper.connect(owner).incentivisedFunction()
        )
          .to.emit(keeperIncentiveHelper, "FunctionCalled")
          .withArgs(owner.address);

        const newBalance = await mockPop.balanceOf(owner.address);
        expect(newBalance).to.equal(oldBalance);
      });
      it("if the function got called too early", async function () {
        const currentTime =
          (await waffle.provider.getBlock("latest")).timestamp + 1;
        await keeperIncentiveHelper
          .connect(owner)
          .changeTargetDate(0, currentTime + 10 * dayInSec);

        const oldBalance = await mockPop.balanceOf(owner.address);
        const result = await keeperIncentiveHelper
          .connect(owner)
          .incentivisedFunction();
        expect(result)
          .to.emit(keeperIncentiveHelper, "FunctionCalled")
          .withArgs(owner.address);
        expect(result).to.not.emit(keeperIncentiveHelper, "TargetDateChanged");

        const newBalance = await mockPop.balanceOf(owner.address);
        expect(newBalance).to.equal(oldBalance);
      });
      it("if the function got called too late", async function () {
        ethers.provider.send("evm_increaseTime", [2 * dayInSec]);
        ethers.provider.send("evm_mine", []);

        const oldBalance = await mockPop.balanceOf(owner.address);
        const result = await keeperIncentiveHelper
          .connect(owner)
          .incentivisedFunction();
        expect(result)
          .to.emit(keeperIncentiveHelper, "FunctionCalled")
          .withArgs(owner.address);
        expect(result).to.not.emit(keeperIncentiveHelper, "TargetDateChanged");

        const newBalance = await mockPop.balanceOf(owner.address);
        expect(newBalance).to.equal(oldBalance);
      });
    });
  });
});
