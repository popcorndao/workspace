import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { MockERC20, RewardsEscrow, Staking } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "@ethersproject/bignumber";

interface Contracts {
  mockPop: MockERC20;
  staking: Staking;
  rewardsEscrow: RewardsEscrow;
}

let owner: SignerWithAddress,
  rewarder: SignerWithAddress,
  nonOwner: SignerWithAddress;

let contracts: Contracts;
let popBalance: BigNumber;
const stakingFund = parseEther("10");
const dayInSec = 86400

async function deployContracts(): Promise<Contracts> {
  const mockPop = (await (
    await (
      await ethers.getContractFactory("MockERC20")
    ).deploy("TestPOP", "TPOP", 18)
  ).deployed()) as MockERC20;
  await mockPop.mint(owner.address, parseEther("500"));
  await mockPop.mint(nonOwner.address, parseEther("10"));

  const rewardsEscrow = (await (
    await (
      await ethers.getContractFactory("RewardsEscrow")
    ).deploy(mockPop.address)
  ).deployed()) as RewardsEscrow;

  const staking = (await (
    await (
      await ethers.getContractFactory("Staking")
    ).deploy(mockPop.address, rewardsEscrow.address)
  ).deployed()) as Staking;

  

  await mockPop.transfer(staking.address, stakingFund);
  await mockPop.connect(owner).approve(staking.address, parseEther("100000"));

  await staking.init(rewarder.address);
  await staking.notifyRewardAmount(stakingFund);
  await staking.connect(owner).stake(parseEther("1"), 604800);

  return { mockPop, staking, rewardsEscrow };
}

describe("RewardsEscrow", function () {
  beforeEach(async function () {
    [owner, rewarder, nonOwner] = await ethers.getSigners();
    contracts = await deployContracts();
  });

  describe("restricted functions", function () {
    it("set staking contract after construction", async function () {
      await contracts.rewardsEscrow
        .connect(owner)
        .setStaking(contracts.staking.address);
      expect(await contracts.rewardsEscrow.Staking()).to.equal(
        contracts.staking.address
      );
    });

    it("update staking contract", async function () {
      const newStaking = (await (
        await (
          await ethers.getContractFactory("Staking")
        ).deploy(contracts.mockPop.address, contracts.rewardsEscrow.address)
      ).deployed()) as Staking;
      await contracts.rewardsEscrow
        .connect(owner)
        .setStaking(contracts.staking.address);
      expect(await contracts.rewardsEscrow.Staking()).to.equal(
        contracts.staking.address
      );
      await contracts.rewardsEscrow
        .connect(owner)
        .setStaking(newStaking.address);
      expect(await contracts.rewardsEscrow.Staking()).to.equal(
        newStaking.address
      );
    });

    it("should revert setStaking if not owner", async function () {
      await expect(
        contracts.rewardsEscrow.connect(nonOwner).setStaking(nonOwner.address)
      ).to.be.revertedWith("Only the contract owner may perform this action");
    });

    it("should revert updateEscrowDuration if not owner", async function () {
      await expect(
        contracts.rewardsEscrow
          .connect(nonOwner)
          .updateEscrowDuration(nonOwner.address)
      ).to.be.revertedWith("Only the contract owner may perform this action");
    });

    it("update escrow duration", async function () {
      await contracts.rewardsEscrow.connect(owner).updateEscrowDuration(604800);
      expect(await contracts.rewardsEscrow.escrowDuration()).to.equal(604800);
    });
  });

  describe("lock", function () {
    beforeEach(async function () {
      await contracts.rewardsEscrow
        .connect(owner)
        .setStaking(contracts.staking.address);
      ethers.provider.send("evm_increaseTime", [302400]);
      ethers.provider.send("evm_mine", []);
    });
    it("should not allow anyone but the staking contract to lock funds", async function () {
      await expect(
        contracts.rewardsEscrow
          .connect(owner)
          .lock(owner.address, parseEther("1"))
      ).to.be.revertedWith("you cant call this function");
    });
    describe("locking funds before the first vesting period starts", function () {
      it("should transfer funds, lock them and emit an event", async function () {
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        const currentBlock = await ethers.provider._getBlock(
          currentBlockNumber
        );
        const result = await contracts.staking.connect(owner).getReward();
        const lockedAmount = parseEther("3.333355379188604788");
        const escrowedBalance = await contracts.rewardsEscrow.escrowedBalances(
          owner.address
        );
        expect(result)
          .to.emit(contracts.rewardsEscrow, "Locked")
          .withArgs(owner.address, lockedAmount);
        expect(await contracts.rewardsEscrow.getLocked(owner.address)).to.equal(
          lockedAmount
        );
        expect(
          await contracts.mockPop.balanceOf(contracts.rewardsEscrow.address)
        ).to.equal(lockedAmount);
        expect(
          escrowedBalance.start >
            BigNumber.from(currentBlock.timestamp + (90 * dayInSec))
        ).to.equal(true);
        expect(escrowedBalance.end).to.equal(
          escrowedBalance.start.add(90 * dayInSec)
        );
      });
      it("should extend the vesting end time and locked funds when locking again", async function () {
        await contracts.staking.connect(owner).getReward();
        const escrowedBalance1 = await contracts.rewardsEscrow.escrowedBalances(
          owner.address
        );
        ethers.provider.send("evm_increaseTime", [302400]);
        ethers.provider.send("evm_mine", []);
        await contracts.staking.connect(owner).getReward();
        const escrowedBalance2 = await contracts.rewardsEscrow.escrowedBalances(
          owner.address
        );
        expect(await contracts.rewardsEscrow.getLocked(owner.address)).to.equal(
          parseEther("6.666655643738761606")
        );
        expect(escrowedBalance2.start).to.equal(escrowedBalance1.start);
        expect(
          escrowedBalance2.end > escrowedBalance2.start.add(90)
        ).to.equal(true);
      });
    });
    describe("locking additional funds after vesting already started", function () {
      it("should update the vesting time and locked funds when locking again", async function () {
        await contracts.staking.connect(owner).getReward();
        const escrowedBalance1 = await contracts.rewardsEscrow.escrowedBalances(
          owner.address
        );
        ethers.provider.send("evm_increaseTime", [91 * dayInSec]);
        ethers.provider.send("evm_mine", []);
        await contracts.staking.connect(owner).getReward();
        const lockedAmount = parseEther("6.666655643738761606");
        const escrowedBalance2 = await contracts.rewardsEscrow.escrowedBalances(
          owner.address
        );
        expect(await contracts.rewardsEscrow.getLocked(owner.address)).to.equal(
          lockedAmount
        );
        expect(escrowedBalance1.start < escrowedBalance2.start).to.equal(true);
        expect(escrowedBalance2.end).to.equal(
          escrowedBalance2.start.add(90 * dayInSec)
        );
      });
    });

    describe("locking additional funds after all other funds have been vested", function () {
      it("should update the vesting time and locked funds when locking again", async function () {
        const lockedAmount = parseEther("3.333355379188604788");
        const lockedAmount2 = parseEther("3.333300264550156818")
        await contracts.staking.connect(owner).getReward();
        const escrowedBalance1 = await contracts.rewardsEscrow.escrowedBalances(
          owner.address
        );
        ethers.provider.send("evm_increaseTime", [181 * dayInSec]);
        ethers.provider.send("evm_mine", []);
        const vested1 = await contracts.rewardsEscrow.getVested(owner.address);
        expect(vested1).to.equal(lockedAmount);
        await contracts.staking.connect(owner).getReward();
        const escrowedBalance2 = await contracts.rewardsEscrow.escrowedBalances(
          owner.address
        );
        const lockedBalance = await contracts.rewardsEscrow.getLocked(
          owner.address
        );
        expect(lockedBalance).to.equal(lockedAmount2.add(lockedAmount));
        expect(escrowedBalance1.start < escrowedBalance2.start).to.equal(true);
        expect(escrowedBalance2.end).to.equal(
          escrowedBalance2.start.add(90 * dayInSec)
        );
      });
    });
  });

  describe("claim", function () {
    beforeEach(async function () {
      await contracts.rewardsEscrow
        .connect(owner)
        .setStaking(contracts.staking.address);
      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);
    });
    it("should claim funds", async function () {
      const rewardsEarned = await contracts.staking.earned(owner.address);
      const payout = rewardsEarned.div(BigNumber.from("3"));
      const lockedAmount = payout.mul(BigNumber.from("2"));
      await contracts.staking.connect(owner).getReward();
      popBalance = await contracts.mockPop.balanceOf(owner.address);

      ethers.provider.send("evm_increaseTime", [120 * dayInSec]);
      ethers.provider.send("evm_mine", []);

      await contracts.rewardsEscrow.connect(owner).claim();
      expect(await contracts.mockPop.balanceOf(owner.address)).to.equal(
        parseEther("494.555547227119704082")
      );

      ethers.provider.send("evm_increaseTime", [60 * dayInSec]);
      ethers.provider.send("evm_mine", []);

      const locked3 = await contracts.rewardsEscrow.getLocked(owner.address);
      const vested3 = await contracts.rewardsEscrow.getVested(owner.address);
      expect(locked3).to.equal(vested3);
      await contracts.rewardsEscrow.connect(owner).claim();
      const locked4 = await contracts.rewardsEscrow.getLocked(owner.address);
      const vested4 = await contracts.rewardsEscrow.getVested(owner.address);

      expect(await contracts.mockPop.balanceOf(owner.address)).to.equal(
        popBalance.add(lockedAmount)
      );
      expect(vested4).to.equal(0);
      expect(locked4).to.equal(0);
    });
    it("reverts if there is nothing to claim", async function () {
      await expect(
        contracts.rewardsEscrow.connect(nonOwner).claim()
      ).to.be.revertedWith("nothing to claim");
    });
  });
});
