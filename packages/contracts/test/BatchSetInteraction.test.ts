import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  BatchSetInteraction,
  BlockLockHelper,
  DefendedHelper,
  MockBasicIssuanceModule,
  MockCurveAddressProvider,
  MockCurveMetapool,
  MockCurveRegistry,
  MockERC20,
  MockYearnV1Vault,
  Pool,
} from "../typechain";
import { expect } from "chai";
import { waffle, ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { convertToObject } from "typescript";
import { parse } from "dotenv";

const provider = waffle.provider;

interface Contracts {
  mock3Crv: MockERC20;
  mockCrvUSDX: MockERC20;
  mockCrvUST: MockERC20;
  mockSetToken: MockERC20;
  mockYearnVaultUSDX: MockYearnV1Vault;
  mockYearnVaultUST: MockYearnV1Vault;
  mockCurveMetapoolUSDX: MockCurveMetapool;
  mockCurveMetapoolUST: MockCurveMetapool;
  mockBasicIssuanceModule: MockBasicIssuanceModule;
  batchSetInteraction: BatchSetInteraction;
}

const DepositorInitial = parseEther("100000");
let owner: SignerWithAddress,
  depositor: SignerWithAddress,
  depositor1: SignerWithAddress,
  depositor2: SignerWithAddress,
  depositor3: SignerWithAddress,
  depositor4: SignerWithAddress,
  depositor5: SignerWithAddress;
let contracts: Contracts;

async function deployContracts(): Promise<Contracts> {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mock3Crv = await (
    await MockERC20.deploy("3Crv", "3Crv", 18)
  ).deployed();
  await mock3Crv.mint(depositor.address, DepositorInitial);
  await mock3Crv.mint(depositor1.address, DepositorInitial);
  await mock3Crv.mint(depositor2.address, DepositorInitial);
  await mock3Crv.mint(depositor3.address, DepositorInitial);
  await mock3Crv.mint(depositor4.address, DepositorInitial);
  await mock3Crv.mint(depositor5.address, DepositorInitial);

  const mockCrvUSDX = await (
    await MockERC20.deploy("crvUSDX", "crvUSDX", 18)
  ).deployed();
  const mockCrvUST = await (
    await MockERC20.deploy("crvUST", "crvUST", 18)
  ).deployed();
  const mockSetToken = await await MockERC20.deploy("setToken", "setToken", 18);

  const MockYearnV1Vault = await ethers.getContractFactory("MockYearnV1Vault");
  const mockYearnVaultUSDX = await (
    await MockYearnV1Vault.deploy(mockCrvUSDX.address)
  ).deployed();
  const mockYearnVaultUST = await (
    await MockYearnV1Vault.deploy(mockCrvUST.address)
  ).deployed();

  const MockCurveMetapool = await ethers.getContractFactory(
    "MockCurveMetapool"
  );
  const mockCurveMetapoolUSDX = await (
    await MockCurveMetapool.deploy(mockCrvUSDX.address, mock3Crv.address)
  ).deployed();
  const mockCurveMetapoolUST = await (
    await MockCurveMetapool.deploy(mockCrvUST.address, mock3Crv.address)
  ).deployed();

  const mockBasicIssuanceModule = await (
    await (
      await ethers.getContractFactory("MockBasicIssuanceModule")
    ).deploy([mockYearnVaultUSDX.address, mockYearnVaultUST.address], [50, 50])
  ).deployed();

  const batchSetInteraction = await (
    await (
      await ethers.getContractFactory("BatchSetInteraction")
    ).deploy(
      mock3Crv.address,
      mockSetToken.address,
      mockBasicIssuanceModule.address,
      1800,
      parseEther("20000"),
      parseEther("200")
    )
  ).deployed();

  await batchSetInteraction.connect(owner).setUnderylingToken([
    {
      crvToken: mockCrvUSDX.address,
      allocation: parseEther("50"),
      yToken: mockYearnVaultUSDX.address,
      curveMetaPool: mockCurveMetapoolUSDX.address,
    },
    {
      crvToken: mockCrvUST.address,
      allocation: parseEther("50"),
      yToken: mockYearnVaultUST.address,
      curveMetaPool: mockCurveMetapoolUST.address,
    },
  ]);

  return {
    mock3Crv,
    mockCrvUSDX,
    mockCrvUST,
    mockSetToken,
    mockYearnVaultUSDX,
    mockYearnVaultUST,
    mockCurveMetapoolUSDX,
    mockCurveMetapoolUST,
    mockBasicIssuanceModule,
    batchSetInteraction,
  };
}

describe("BatchSetInteraction", function () {
  beforeEach(async function () {
    [
      owner,
      depositor,
      depositor1,
      depositor2,
      depositor3,
      depositor4,
      depositor5,
    ] = await ethers.getSigners();
    contracts = await deployContracts();
  });
  describe("mint", function () {
    context("depositing", function () {
      it("deposits 3crv in the current mintBatch", async function () {
        await contracts.mock3Crv
          .connect(depositor)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        const result = await contracts.batchSetInteraction
          .connect(depositor)
          .depositForMint(parseEther("10000"));
        expect(result)
          .to.emit(contracts.batchSetInteraction, "Deposit")
          .withArgs(depositor.address, parseEther("10000"));
        expect(
          await contracts.mock3Crv.balanceOf(
            contracts.batchSetInteraction.address
          )
        ).to.equal(parseEther("10000"));
        const currentMintBatchId =
          await contracts.batchSetInteraction.currentMintBatchId();
        const currentBatch = await contracts.batchSetInteraction.mintBatches(
          currentMintBatchId
        );
        expect(currentBatch.suppliedToken).to.equal(parseEther("10000"));
        expect(currentBatch.unclaimedShares).to.equal(parseEther("10000"));
      });
      it("adds the mintBatch to the users batches", async function () {
        await contracts.mock3Crv
          .connect(depositor)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        await contracts.batchSetInteraction
          .connect(depositor)
          .depositForMint(parseEther("10000"));

        const currentMintBatchId =
          await contracts.batchSetInteraction.currentMintBatchId();
        expect(
          await contracts.batchSetInteraction.batchesOfAccount(
            depositor.address,
            0
          )
        ).to.equal(currentMintBatchId);
      });
      it("allows multiple deposits", async function () {
        await contracts.mock3Crv
          .connect(depositor)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        await contracts.batchSetInteraction
          .connect(depositor)
          .depositForMint(parseEther("10000"));
        await contracts.mock3Crv
          .connect(depositor1)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        await contracts.batchSetInteraction
          .connect(depositor1)
          .depositForMint(parseEther("10000"));
        await contracts.mock3Crv
          .connect(depositor2)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        await contracts.batchSetInteraction
          .connect(depositor2)
          .depositForMint(parseEther("5000"));
        await contracts.batchSetInteraction
          .connect(depositor2)
          .depositForMint(parseEther("5000"));
        const currentMintBatchId =
          await contracts.batchSetInteraction.currentMintBatchId();
        const currentBatch = await contracts.batchSetInteraction.mintBatches(
          currentMintBatchId
        );
        expect(currentBatch.suppliedToken).to.equal(parseEther("30000"));
        expect(currentBatch.unclaimedShares).to.equal(parseEther("30000"));
        expect(
          await contracts.batchSetInteraction.batchesOfAccount(
            depositor.address,
            0
          )
        ).to.equal(currentMintBatchId);
        expect(
          await contracts.batchSetInteraction.batchesOfAccount(
            depositor1.address,
            0
          )
        ).to.equal(currentMintBatchId);
        expect(
          await contracts.batchSetInteraction.batchesOfAccount(
            depositor2.address,
            0
          )
        ).to.equal(currentMintBatchId);
      });
    });
    context("batch minting", function () {
      context("reverts", function () {
        it("reverts when minting too early", async function () {
          await contracts.mock3Crv
            .connect(depositor)
            .approve(
              contracts.batchSetInteraction.address,
              parseEther("10000")
            );
          await contracts.batchSetInteraction
            .connect(depositor)
            .depositForMint(parseEther("10000"));
          await expect(
            contracts.batchSetInteraction.connect(owner).batchMint(parseEther("100"))
          ).to.be.revertedWith("can not execute batch action yet");
        });
      });
      context("success", function () {
        it("batch mints", async function () {
          await contracts.mock3Crv
            .connect(depositor)
            .approve(
              contracts.batchSetInteraction.address,
              parseEther("10000")
            );
          await contracts.batchSetInteraction
            .connect(depositor)
            .depositForMint(parseEther("10000"));
          await provider.send("evm_increaseTime", [1800]);
          const result = await contracts.batchSetInteraction
            .connect(owner)
            .batchMint(parseEther("100"));
          expect(result)
            .to.emit(contracts.batchSetInteraction, "BatchMinted")
            .withArgs(parseEther("100"));
          expect(
            await contracts.mockSetToken.balanceOf(
              contracts.batchSetInteraction.address
            )
          ).to.equal(parseEther("100"));
        });
        it("mints early when mintThreshold is met", async function () {
          await contracts.mock3Crv
            .connect(depositor)
            .approve(
              contracts.batchSetInteraction.address,
              parseEther("10000")
            );
          await contracts.batchSetInteraction
            .connect(depositor)
            .depositForMint(parseEther("10000"));
          await contracts.mock3Crv
            .connect(depositor1)
            .approve(
              contracts.batchSetInteraction.address,
              parseEther("10000")
            );
          await contracts.batchSetInteraction
            .connect(depositor1)
            .depositForMint(parseEther("10000"));
          await expect(
            contracts.batchSetInteraction.connect(owner).batchMint(parseEther("200"))
          ).to.emit(contracts.batchSetInteraction, "BatchMinted");
        });
        it("advances to the next batch", async function () {
          await contracts.mock3Crv
            .connect(depositor)
            .approve(
              contracts.batchSetInteraction.address,
              parseEther("10000")
            );
          await contracts.batchSetInteraction
            .connect(depositor)
            .depositForMint(parseEther("10000"));
          await provider.send("evm_increaseTime", [1800]);

          const previousMintBatchId =
            await contracts.batchSetInteraction.currentMintBatchId();
          const currentBlock = await provider.getBlock("latest");

          await contracts.batchSetInteraction.batchMint(parseEther("100"));

          const previousBatch = await contracts.batchSetInteraction.mintBatches(
            previousMintBatchId
          );
          expect(previousBatch.claimable).to.equal(1);
          
          const currentMintBatchId =
            await contracts.batchSetInteraction.currentMintBatchId();
          expect(currentMintBatchId).to.equal(
            ethers.utils.solidityKeccak256(
              ["uint", "bytes32"],
              [currentBlock.timestamp+1, previousMintBatchId]
            )
          );
        });
      });
    });
    context("claim batch", function () {
      beforeEach(async function () {
        await contracts.mock3Crv
          .connect(depositor)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        await contracts.batchSetInteraction
          .connect(depositor)
          .depositForMint(parseEther("10000"));
        await contracts.mock3Crv
          .connect(depositor1)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        await contracts.batchSetInteraction
          .connect(depositor1)
          .depositForMint(parseEther("10000"));
        await contracts.mock3Crv
          .connect(depositor2)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        await contracts.batchSetInteraction
          .connect(depositor2)
          .depositForMint(parseEther("10000"));
        await contracts.mock3Crv
          .connect(depositor3)
          .approve(contracts.batchSetInteraction.address, parseEther("10000"));
        await contracts.batchSetInteraction
          .connect(depositor3)
          .depositForMint(parseEther("10000"));
      });
      it("reverts when batch is not yet claimable", async function () {
        const batchId = await contracts.batchSetInteraction.batchesOfAccount(
          depositor.address,
          0
        );
        await expect(
          contracts.batchSetInteraction.claimMinted(batchId)
        ).to.be.revertedWith("not minted yet");
      });
      it("claim batch successfully", async function () {
        await provider.send("evm_increaseTime", [1800]);

        await contracts.batchSetInteraction.connect(owner).batchMint(parseEther("400"));
        const batchId = await contracts.batchSetInteraction.batchesOfAccount(
          depositor.address,
          0
        );
        expect(
          await contracts.batchSetInteraction
            .connect(depositor)
            .claimMinted(batchId)
        )
          .to.emit(contracts.batchSetInteraction, "Claimed")
          .withArgs(depositor.address, parseEther("10000"));
        expect(
          await contracts.mockSetToken.balanceOf(depositor.address)
        ).to.equal(parseEther("100"));
        const batch = await contracts.batchSetInteraction.mintBatches(batchId);
        expect(batch.unclaimedShares).to.equal(parseEther("30000"));
        expect(batch.claimableToken).to.equal(parseEther("300"));
      });
    });
  });
  describe("redeem", function () {
    beforeEach(async function () {
      await contracts.mockSetToken.mint(depositor.address, parseEther("100"));
      await contracts.mockSetToken.mint(depositor1.address, parseEther("100"));
      await contracts.mockSetToken.mint(depositor2.address, parseEther("100"));
      await contracts.mockSetToken.mint(depositor3.address, parseEther("100"));
      await contracts.mockYearnVaultUSDX.mint(
        contracts.mockBasicIssuanceModule.address,
        parseEther("20000")
      );
      await contracts.mockYearnVaultUST.mint(
        contracts.mockBasicIssuanceModule.address,
        parseEther("20000")
      );
    });
    context("depositing", function () {
      it("deposits setToken in the current redeemBatch", async function () {
        await contracts.mockSetToken
          .connect(depositor)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        const result = await contracts.batchSetInteraction
          .connect(depositor)
          .depositForRedeem(parseEther("100"));
        expect(result)
          .to.emit(contracts.batchSetInteraction, "Deposit")
          .withArgs(depositor.address, parseEther("100"));
        expect(
          await contracts.mockSetToken.balanceOf(
            contracts.batchSetInteraction.address
          )
        ).to.equal(parseEther("100"));
        const currentRedeemBatchId =
          await contracts.batchSetInteraction.currentRedeemBatchId();
        const currentBatch = await contracts.batchSetInteraction.redeemBatches(
          currentRedeemBatchId
        );
        expect(currentBatch.suppliedToken).to.equal(parseEther("100"));
        expect(currentBatch.unclaimedShares).to.equal(parseEther("100"));
      });
      it("adds the redeemBatch to the users batches", async function () {
        await contracts.mockSetToken
          .connect(depositor)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        await contracts.batchSetInteraction
          .connect(depositor)
          .depositForRedeem(parseEther("100"));

        const currentRedeemBatchId =
          await contracts.batchSetInteraction.currentRedeemBatchId();
        expect(
          await contracts.batchSetInteraction.batchesOfAccount(
            depositor.address,
            0
          )
        ).to.equal(currentRedeemBatchId);
      });
      it("allows multiple deposits", async function () {
        await contracts.mockSetToken
          .connect(depositor)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        await contracts.batchSetInteraction
          .connect(depositor)
          .depositForRedeem(parseEther("100"));
        await contracts.mockSetToken
          .connect(depositor1)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        await contracts.batchSetInteraction
          .connect(depositor1)
          .depositForRedeem(parseEther("100"));
        await contracts.mockSetToken
          .connect(depositor2)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        await contracts.batchSetInteraction
          .connect(depositor2)
          .depositForRedeem(parseEther("50"));
        await contracts.batchSetInteraction
          .connect(depositor2)
          .depositForRedeem(parseEther("50"));
        const currentRedeemBatchId =
          await contracts.batchSetInteraction.currentRedeemBatchId();
        const currentBatch = await contracts.batchSetInteraction.redeemBatches(
          currentRedeemBatchId
        );
        expect(currentBatch.suppliedToken).to.equal(parseEther("300"));
        expect(currentBatch.unclaimedShares).to.equal(parseEther("300"));
        expect(
          await contracts.batchSetInteraction.batchesOfAccount(
            depositor.address,
            0
          )
        ).to.equal(currentRedeemBatchId);
        expect(
          await contracts.batchSetInteraction.batchesOfAccount(
            depositor1.address,
            0
          )
        ).to.equal(currentRedeemBatchId);
        expect(
          await contracts.batchSetInteraction.batchesOfAccount(
            depositor2.address,
            0
          )
        ).to.equal(currentRedeemBatchId);
      });
    });
    context("batch redeeming", function () {
      context("reverts", function () {
        it("reverts when redeeming too early", async function () {
          await contracts.mockSetToken
            .connect(depositor)
            .approve(contracts.batchSetInteraction.address, parseEther("100"));
          await contracts.batchSetInteraction
            .connect(depositor)
            .depositForRedeem(parseEther("100"));
          await expect(
            contracts.batchSetInteraction.connect(owner).batchRedeem()
          ).to.be.revertedWith("can not execute batch action yet");
        });
      });
      context("success", function () {
        it("batch redeems", async function () {
          await contracts.mockSetToken
            .connect(depositor)
            .approve(contracts.batchSetInteraction.address, parseEther("100"));
          await contracts.batchSetInteraction
            .connect(depositor)
            .depositForRedeem(parseEther("100"));

          await provider.send("evm_increaseTime", [1800]);
          const result = await contracts.batchSetInteraction
            .connect(owner)
            .batchRedeem();
          expect(result)
            .to.emit(contracts.batchSetInteraction, "BatchRedeemed")
            .withArgs(parseEther("100"));
          expect(
            await contracts.mockYearnVaultUSDX.balanceOf(
              contracts.batchSetInteraction.address
            )
          ).to.equal(parseEther("5000"));
          expect(
            await contracts.mockYearnVaultUST.balanceOf(
              contracts.batchSetInteraction.address
            )
          ).to.equal(parseEther("5000"));
        });
        it("mints early when redeemThreshold is met", async function () {
          await contracts.mockSetToken
            .connect(depositor)
            .approve(contracts.batchSetInteraction.address, parseEther("100"));
          await contracts.batchSetInteraction
            .connect(depositor)
            .depositForRedeem(parseEther("100"));
          await contracts.mockSetToken
            .connect(depositor1)
            .approve(contracts.batchSetInteraction.address, parseEther("100"));
          await contracts.batchSetInteraction
            .connect(depositor1)
            .depositForRedeem(parseEther("100"));
          const result = await contracts.batchSetInteraction
            .connect(owner)
            .batchRedeem();
          expect(result).to.emit(
            contracts.batchSetInteraction,
            "BatchRedeemed"
          );
        });
        it("advances to the next batch", async function () {
          await contracts.mockSetToken
            .connect(depositor)
            .approve(contracts.batchSetInteraction.address, parseEther("100"));
          await contracts.batchSetInteraction
            .connect(depositor)
            .depositForRedeem(parseEther("100"));
          await provider.send("evm_increaseTime", [1800]);

          const previousRedeemBatchId =
            await contracts.batchSetInteraction.currentRedeemBatchId();
          const currentBlock = await provider.getBlock("latest");

          await contracts.batchSetInteraction.batchRedeem();

          const previousBatch =
            await contracts.batchSetInteraction.redeemBatches(
              previousRedeemBatchId
            );
          expect(previousBatch.claimable).to.equal(1);

          const currentRedeemBatchId =
            await contracts.batchSetInteraction.currentRedeemBatchId();
          expect(currentRedeemBatchId).to.equal(
            ethers.utils.solidityKeccak256(
              ["uint256", "bytes32"],
              [currentBlock.timestamp, previousRedeemBatchId]
            )
          );
        });
      });
    });
    context("claim batch", function () {
      beforeEach(async function () {
        await contracts.mockSetToken
          .connect(depositor)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        await contracts.batchSetInteraction
          .connect(depositor)
          .depositForRedeem(parseEther("100"));
        await contracts.mockSetToken
          .connect(depositor1)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        await contracts.batchSetInteraction
          .connect(depositor1)
          .depositForRedeem(parseEther("100"));
        await contracts.mockSetToken
          .connect(depositor2)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        await contracts.batchSetInteraction
          .connect(depositor2)
          .depositForRedeem(parseEther("100"));
        await contracts.mockSetToken
          .connect(depositor3)
          .approve(contracts.batchSetInteraction.address, parseEther("100"));
        await contracts.batchSetInteraction
          .connect(depositor3)
          .depositForRedeem(parseEther("100"));
      });
      it("reverts when batch is not yet claimable", async function () {
        const batchId = await contracts.batchSetInteraction.batchesOfAccount(
          depositor.address,
          0
        );
        await expect(
          contracts.batchSetInteraction.claimRedeemed(batchId)
        ).to.be.revertedWith("not redeemed yet");
      });
      it("claim batch successfully", async function () {
        await provider.send("evm_increaseTime", [1800]);
        await contracts.batchSetInteraction.connect(owner).batchRedeem();
        const batchId = await contracts.batchSetInteraction.batchesOfAccount(
          depositor.address,
          0
        );
        expect(
          await contracts.batchSetInteraction
            .connect(depositor)
            .claimRedeemed(batchId)
        )
          .to.emit(contracts.batchSetInteraction, "Claimed")
          .withArgs(depositor.address, parseEther("100"));
        expect(
          await contracts.mockYearnVaultUSDX.balanceOf(depositor.address)
        ).to.equal(parseEther("5000"));
        expect(
          await contracts.mockYearnVaultUST.balanceOf(depositor.address)
        ).to.equal(parseEther("5000"));
        const batch = await contracts.batchSetInteraction.redeemBatches(
          batchId
        );
        expect(batch.unclaimedShares).to.equal(parseEther("300"));
      });
    });
  });
});
