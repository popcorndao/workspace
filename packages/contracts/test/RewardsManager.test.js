const { expect } = require("chai");
const { waffle } = require("hardhat");
const { merklize, makeElement, generateClaims } = require("../scripts/merkle.js");
const provider = waffle.provider;

describe('RewardsManager', function () {
  const VaultStatus = { "Initialized": 0, "Open": 1, "Closed": 2 };
  let owner, beneficiary1, beneficiary2;
  let claims, merkleTree, merkleRoot;

  beforeEach(async function () {
    [owner, beneficiary1, beneficiary2] = await ethers.getSigners();

    let MockERC20 = await ethers.getContractFactory("MockERC20");
    this.pop = await MockERC20.deploy("TestPOP", "TPOP");
    await this.pop.mint(owner.address, "100000000000");

    let RewardsManager = await ethers.getContractFactory("RewardsManager");
    this.rewards = await RewardsManager.deploy(this.pop.address);

    claims = generateClaims(await provider.listAccounts());
    merkleTree = merklize(claims);
    merkleRoot = "0x" + merkleTree.getRoot().toString("hex");
  });

  it("should be constructed with POP token", async function () {
    expect(await this.rewards.pop()).to.equal(this.pop.address);
  });

  it("reverts deposit with no transfer approval", async function () {
    await expect(this.rewards.depositReward(100)).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
  });

  it("reverts deposit with no open vaults", async function () {
    await this.pop.approve(this.rewards.address, 100);
    await expect(this.rewards.depositReward(100)).to.be.revertedWith("No open vaults");
  });

  it("reverts when trying to get uninitialized vault", async function () {
    await expect(this.rewards.getVault(0)).to.be.revertedWith("Uninitialized vault slot");
  });

  it("reverts when trying to get invalid vault", async function () {
    await expect(this.rewards.getVault(4)).to.be.revertedWith("Invalid vault id");
  });

  it("reverts when trying to initialize an invalid vault id", async function () {
    const currentBlock = (await provider.getBlock("latest")).number;
    await expect(this.rewards.initializeVault(4, currentBlock + 1, merkleRoot)).to.be.revertedWith("Invalid vault id");
  });

  it("reverts when trying to initialize an invalid end block", async function () {
    const currentBlock = (await provider.getBlock("latest")).number;
    await expect(this.rewards.initializeVault(0, currentBlock, merkleRoot)).to.be.revertedWith("Invalid end block");
  });

  describe("vault 0 is initialized", function () {
    beforeEach(async function () {
      currentBlock = (await provider.getBlock("latest")).number;
      endBlock = currentBlock + 100;
      await this.rewards.initializeVault(0, endBlock, merkleRoot);
    });

    it("vault has expected values", async function () {
      let vaultData = await this.rewards.getVault(0);
      expect(vaultData.totalDeposited).to.equal(0);
      expect(vaultData.currentBalance).to.equal(0);
      expect(vaultData.unclaimedShare).to.equal(100);
      expect(vaultData.merkleRoot).to.equal(merkleRoot);
      expect(vaultData.endBlock).to.equal(endBlock);
      expect(vaultData.status).to.equal(VaultStatus.Initialized);
    });

    it("opens vault", async function () {
      await this.rewards.openVault(0);
      let vaultData = await this.rewards.getVault(0);
      expect(vaultData.status).to.equal(VaultStatus.Open);
    });

    describe("open vault and deposit reward", function () {
      beforeEach(async function () {
        totalReward = "10000000";
        await this.rewards.openVault(0);
        await this.pop.approve(this.rewards.address, totalReward);
        await this.rewards.depositReward(totalReward);
      });

      it("contract has expected balance", async function () {
        expect(await this.pop.balanceOf(this.rewards.address)).to.equal(totalReward);
      });

      it("vault has expected balance", async function () {
        let vaultData = await this.rewards.getVault(0);
        expect(vaultData.totalDeposited).to.equal(totalReward);
        expect(vaultData.currentBalance).to.equal(totalReward);
      });

      it("reverts invalid claim", async function () {
        let proof = [makeElement(owner.address, "10")];
        await expect(this.rewards.claimReward(0, proof, owner.address, "10")).to.be.revertedWith("Invalid claim");
      });

      it("verifies valid claim", async function () {
        let proof = merkleTree.getProof(makeElement(beneficiary1.address, claims[beneficiary1.address]));
        expect(
          await this.rewards.verifyClaim(0, proof, beneficiary1.address, claims[beneficiary1.address])
        ).to.be.true;
      });

      describe("allows claim from beneficiary 1", function () {
        beforeEach(async function () {
          let proof = merkleTree.getProof(makeElement(beneficiary1.address, claims[beneficiary1.address]));
          await this.rewards.claimReward(0, proof, beneficiary1.address, claims[beneficiary1.address]);
        });

        it("vault has expected data", async function () {
          let vaultData = await this.rewards.getVault(0);
          expect(vaultData.currentBalance).to.equal(9500000);
          expect(vaultData.unclaimedShare).to.equal(95);
        });

        it("has expected contract balance", async function () {
          expect(await this.pop.balanceOf(this.rewards.address)).to.equal(9500000);
        });

        describe("allows claim from beneficiary 2", function () {
          beforeEach(async function () {
            let proof = merkleTree.getProof(makeElement(beneficiary2.address, claims[beneficiary2.address]));
            await this.rewards.claimReward(0, proof, beneficiary2.address, claims[beneficiary2.address]);
          });

          it("vault has expected data", async function () {
            let vaultData = await this.rewards.getVault(0);
            expect(vaultData.currentBalance).to.equal(9000000);
            expect(vaultData.unclaimedShare).to.equal(90);
          });
        });
      });
    });
  });
});