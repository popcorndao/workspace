import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { MockERC20, ParticipationRewardHelper } from "../typechain";

interface Contracts {
  mockPop: MockERC20;
  rewardParticipationHelper: ParticipationRewardHelper;
}

let owner: SignerWithAddress,
  voter: SignerWithAddress,
  governance: SignerWithAddress;
let contracts: Contracts;
let now: number;
let end: number;
let vaultId: string;
const rewardBudget = parseEther("10");

async function initVaultAndAddShares(index: number): Promise<string> {
  const currentTime = await (
    await ethers.provider.getBlock("latest")
  ).timestamp;
  const ending = currentTime + 1000;
  const id = ethers.utils.solidityKeccak256(
    ["uint8", "uint256"],
    [index, currentTime]
  );
  await contracts.rewardParticipationHelper.initializeVault(id, ending);
  await contracts.rewardParticipationHelper.addShares(id, owner.address, 1000);
  return id;
}

async function openVaultAndClaim(id: string, index: number): Promise<void> {
  await contracts.rewardParticipationHelper.openVault(id);
  if (index >= 50) {
    await contracts.rewardParticipationHelper.connect(owner).claimReward(index);
  }
}

async function deployContracts(): Promise<Contracts> {
  const mockPop = await (
    await (
      await ethers.getContractFactory("MockERC20")
    ).deploy("TestPOP", "TPOP", 18)
  ).deployed();
  await mockPop.mint(owner.address, parseEther("50"));

  const rewardParticipationHelper = await (
    await (
      await ethers.getContractFactory("ParticipationRewardHelper")
    ).deploy(mockPop.address, governance.address)
  ).deployed();

  await mockPop
    .connect(owner)
    .approve(rewardParticipationHelper.address, parseEther("1000000"));
  await rewardParticipationHelper
    .connect(owner)
    .contributeReward(parseEther("10"));

  return {
    mockPop,
    rewardParticipationHelper,
  };
}

describe("RewardParticipation", function () {
  beforeEach(async function () {
    [owner, voter, governance] = await ethers.getSigners();
    contracts = await deployContracts();
    now = await (await ethers.provider.getBlock("latest")).timestamp;
    end = now + 604800;
    vaultId = ethers.utils.solidityKeccak256(["uint8", "uint256"], [1, now]);
  });
  describe("initialize a vault", function () {
    it("vault must not already exist", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      await expect(
        contracts.rewardParticipationHelper.initializeVault(vaultId, end)
      ).to.be.revertedWith("Vault must not exist");
    });
    it("endTime must be in the future", async function () {
      await expect(
        contracts.rewardParticipationHelper.initializeVault(vaultId, now)
      ).to.be.revertedWith("end must be in the future");
    });
    it("should initialize a vault successfully", async function () {
      await contracts.rewardParticipationHelper
        .connect(governance)
        .setRewardsBudget(rewardBudget);
      await contracts.mockPop
        .connect(owner)
        .transfer(contracts.rewardParticipationHelper.address, rewardBudget);
      const result = await contracts.rewardParticipationHelper.initializeVault(
        vaultId,
        end
      );
      expect("0x" + result.data.slice(10, 74)).to.equal(vaultId);
      expect(result)
        .to.emit(contracts.rewardParticipationHelper, "VaultInitialized")
        .withArgs(vaultId);

      const vault = await contracts.rewardParticipationHelper.vaults(vaultId);
      expect(vault.status).to.equal(0);
      expect(vault.endTime).to.equal(end);
      expect(vault.tokenBalance).to.equal(rewardBudget);
    });
    it("should not create a vault if the budget for it is not sufficient", async function () {
      await contracts.rewardParticipationHelper
        .connect(governance)
        .setRewardsBudget(rewardBudget.add(parseEther("1")));

      const result = await contracts.rewardParticipationHelper.initializeVault(
        vaultId,
        end
      );
      expect(result).to.not.emit(
        contracts.rewardParticipationHelper,
        "VaultInitialized"
      );
    });
  });
  describe("open a vault", function () {
    it("vault must exist", async function () {
      await expect(
        contracts.rewardParticipationHelper.openVault(vaultId)
      ).to.be.revertedWith("Uninitialized vault slot");
    });
    it("vault must not be open", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);
      await contracts.rewardParticipationHelper.openVault(vaultId);
      await expect(
        contracts.rewardParticipationHelper.openVault(vaultId)
      ).to.be.revertedWith("Vault must be initialized");
    });
    it("vault must be opened after endTime", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      ethers.provider.send("evm_increaseTime", [604600]);
      ethers.provider.send("evm_mine", []);
      await expect(
        contracts.rewardParticipationHelper.openVault(vaultId)
      ).to.be.revertedWith("wait till endTime is over");
    });
    it("should open vaults successfully", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);
      await expect(contracts.rewardParticipationHelper.openVault(vaultId))
        .to.emit(contracts.rewardParticipationHelper, "VaultOpened")
        .withArgs(vaultId);
    });
  });
  describe("add shares", function () {
    it("vault must exist", async function () {
      await expect(
        contracts.rewardParticipationHelper.addShares(
          vaultId,
          owner.address,
          1000
        )
      ).to.be.revertedWith("Uninitialized vault slot");
    });
    it("vault must not be open", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);
      await contracts.rewardParticipationHelper.openVault(vaultId);
      await expect(
        contracts.rewardParticipationHelper.addShares(
          vaultId,
          owner.address,
          1000
        )
      ).to.be.revertedWith("Vault must be initialized");
    });
    it("should add shares successfully", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      await expect(
        contracts.rewardParticipationHelper.addShares(
          vaultId,
          owner.address,
          1000
        )
      )
        .to.emit(contracts.rewardParticipationHelper, "SharesAdded")
        .withArgs(vaultId, owner.address, 1000);
    });
  });
  describe("claim rewards", function () {
    beforeEach(async function () {
      await contracts.rewardParticipationHelper
        .connect(governance)
        .setRewardsBudget(parseEther("10"));
    });
    it("reverts if the vault is not open", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      await contracts.rewardParticipationHelper.addShares(
        vaultId,
        owner.address,
        1000
      );
      await expect(
        contracts.rewardParticipationHelper.connect(owner).claimReward(0)
      ).to.be.revertedWith("vault is not open");
    });
    it("reverts if there are no rewards to claim", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      await contracts.rewardParticipationHelper.addShares(
        vaultId,
        owner.address,
        0
      );
      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);
      await contracts.rewardParticipationHelper.openVault(vaultId);
      await expect(
        contracts.rewardParticipationHelper.connect(owner).claimReward(0)
      ).to.be.revertedWith("no rewards");
    });
    it("doesnt allow to claim the same reward twice", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      await contracts.rewardParticipationHelper.addShares(
        vaultId,
        owner.address,
        1000
      );
      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);
      await contracts.rewardParticipationHelper.openVault(vaultId);
      await contracts.rewardParticipationHelper.connect(owner).claimReward(0);
      await expect(
        contracts.rewardParticipationHelper.connect(owner).claimReward(0)
      ).to.be.revertedWith("vault is not open");
    });
    it("claims rewards successfully", async function () {
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      await contracts.rewardParticipationHelper.addShares(
        vaultId,
        owner.address,
        1000
      );
      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);
      await contracts.rewardParticipationHelper.openVault(vaultId);
      const oldBalance = await contracts.mockPop.balanceOf(owner.address);

      await expect(
        contracts.rewardParticipationHelper.connect(owner).claimReward(0)
      )
        .to.emit(contracts.rewardParticipationHelper, "RewardsClaimed")
        .withArgs(owner.address, parseEther("10"));

      const newBalance = await contracts.mockPop.balanceOf(owner.address);
      expect(newBalance).to.equal(oldBalance.add(parseEther("10")));
    });
    it("adds rewardedVaults to user address when voting and deletes them after claiming rewards", async function () {
      await contracts.rewardParticipationHelper
        .connect(owner)
        .contributeReward(parseEther("20"));
      await contracts.rewardParticipationHelper.initializeVault(vaultId, end);
      await contracts.rewardParticipationHelper.addShares(
        vaultId,
        owner.address,
        1000
      );
      expect(
        await (
          await contracts.rewardParticipationHelper.getUserVaults(owner.address)
        ).length
      ).to.equal(1);

      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);

      await contracts.rewardParticipationHelper.openVault(vaultId);
      await contracts.rewardParticipationHelper.connect(owner).claimReward(0);

      //Array is empty with 0 as the first element
      expect(
        await (
          await contracts.rewardParticipationHelper.getUserVaults(owner.address)
        )[0]
      ).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      now = await (await ethers.provider.getBlock("latest")).timestamp;
      end = now + 604800;
      const vaultId2 = ethers.utils.solidityKeccak256(
        ["uint8", "uint256"],
        [2, now]
      );
      await contracts.rewardParticipationHelper.initializeVault(vaultId2, end);
      await contracts.rewardParticipationHelper.addShares(
        vaultId2,
        owner.address,
        1000
      );
      now = await (await ethers.provider.getBlock("latest")).timestamp;
      end = now + 604800;
      const vaultId3 = ethers.utils.solidityKeccak256(
        ["uint8", "uint256"],
        [3, now]
      );
      await contracts.rewardParticipationHelper.initializeVault(vaultId3, end);
      await contracts.rewardParticipationHelper.addShares(
        vaultId3,
        owner.address,
        1000
      );

      expect(
        await (
          await contracts.rewardParticipationHelper.getUserVaults(owner.address)
        ).length
      ).to.equal(3);

      ethers.provider.send("evm_increaseTime", [604800]);
      ethers.provider.send("evm_mine", []);

      await contracts.rewardParticipationHelper.openVault(vaultId2);
      await contracts.rewardParticipationHelper.openVault(vaultId3);

      await expect(
        contracts.rewardParticipationHelper.connect(owner).claimRewards([1, 2])
      )
        .to.emit(contracts.rewardParticipationHelper, "RewardsClaimed")
        .withArgs(owner.address, parseEther("20"));
      expect(
        await contracts.rewardParticipationHelper.getUserVaults(owner.address)
      ).to.deep.equal([
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ]);
    });
    it("still claims after a high amount of vaults", async function () {
      //Preparation
      await contracts.rewardParticipationHelper
        .connect(governance)
        .setRewardsBudget(parseEther("1"));
      await contracts.mockPop.mint(owner.address, parseEther("100"));
      await contracts.mockPop.approve(
        contracts.rewardParticipationHelper.address,
        parseEther("100")
      );
      await contracts.rewardParticipationHelper
        .connect(owner)
        .contributeReward(parseEther("100"));

      const vaultIds = await Promise.all(
        new Array(100)
          .fill(0)
          .map(async (x, i) => await initVaultAndAddShares(i))
      );
      ethers.provider.send("evm_increaseTime", [1000]);
      ethers.provider.send("evm_mine", []);
      await Promise.all(
        vaultIds.map(async (id, i) => {
          await openVaultAndClaim(id, i);
        })
      );

      //Actual test
      await expect(
        contracts.rewardParticipationHelper
          .connect(owner)
          .claimRewards([0, 1, 2])
      )
        .to.emit(contracts.rewardParticipationHelper, "RewardsClaimed")
        .withArgs(owner.address, parseEther("3"));
      expect(
        (
          await contracts.rewardParticipationHelper.getUserVaults(owner.address)
        ).slice(0, 3)
      ).to.deep.equal([
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ]);

      await expect(
        contracts.rewardParticipationHelper.connect(owner).claimReward(3)
      )
        .to.emit(contracts.rewardParticipationHelper, "RewardsClaimed")
        .withArgs(owner.address, parseEther("1"));
      expect(
        (
          await contracts.rewardParticipationHelper.getUserVaults(owner.address)
        )[3]
      ).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      await expect(
        contracts.rewardParticipationHelper
          .connect(owner)
          .claimRewards([40, 41, 42, 45])
      )
        .to.emit(contracts.rewardParticipationHelper, "RewardsClaimed")
        .withArgs(owner.address, parseEther("4"));

      await expect(
        contracts.rewardParticipationHelper.connect(owner).claimReward(49)
      )
        .to.emit(contracts.rewardParticipationHelper, "RewardsClaimed")
        .withArgs(owner.address, parseEther("1"));
    });
  });
});
