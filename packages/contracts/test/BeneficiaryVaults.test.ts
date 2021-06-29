import { MockContract } from "@ethereum-waffle/mock-contract";
import { BigNumber } from "@ethersproject/bignumber";
import { parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { waffle, ethers } from "hardhat";
import { merklize, makeElement, generateClaims } from "../scripts/merkle";
import { BeneficiaryVaults } from "../typechain/BeneficiaryVaults";
import { MockERC20 } from "../typechain/MockERC20";
const provider = waffle.provider;

interface Contracts {
  mockPop: MockERC20;
  beneficiaryRegistry: MockContract;
  beneficiaryVaults: BeneficiaryVaults;
}

const VaultStatus = { Open: 0, Closed: 1 };
const OwnerInitial = parseEther("10");
const RewarderInitial = parseEther("5");
const firstReward = parseEther("1");
const secondReward = parseEther("0.05");

let claims, merkleTree, merkleRoot;

let owner: SignerWithAddress,
  rewarder: SignerWithAddress,
  beneficiary1: SignerWithAddress,
  beneficiary2: SignerWithAddress;

let contracts: Contracts;

async function deployContracts(): Promise<Contracts> {
  const mockPop = (await (
    await (
      await ethers.getContractFactory("MockERC20")
    ).deploy("TestPOP", "TPOP", 18)
  ).deployed()) as MockERC20;
  await mockPop.mint(owner.address, OwnerInitial);
  await mockPop.mint(rewarder.address, RewarderInitial);

  const beneficiaryRegistryFactory = await ethers.getContractFactory(
    "BeneficiaryRegistry"
  );
  const beneficiaryRegistry = await waffle.deployMockContract(
    owner,
    beneficiaryRegistryFactory.interface.format() as any[]
  );
  await beneficiaryRegistry.mock.beneficiaryExists.returns(true); //assume true

  const beneficiaryVaults = await (
    await (
      await ethers.getContractFactory("BeneficiaryVaults")
    ).deploy(mockPop.address, beneficiaryRegistry.address)
  ).deployed();

  return { mockPop, beneficiaryRegistry, beneficiaryVaults };
}

describe("BeneficiaryVaults", function () {
  beforeEach(async function () {
    [owner, rewarder, beneficiary1, beneficiary2] = await ethers.getSigners();
    contracts = await deployContracts();
    claims = generateClaims(await provider.listAccounts());
    merkleTree = merklize(claims);
    merkleRoot = "0x" + merkleTree.getRoot().toString("hex");
  });

  it("should be constructed with correct addresses", async function () {
    expect(await contracts.beneficiaryVaults.pop()).to.equal(
      contracts.mockPop.address
    );
    expect(await contracts.beneficiaryVaults.beneficiaryRegistry()).to.equal(
      contracts.beneficiaryRegistry.address
    );
  });

  it("reverts when trying to get uninitialized vault", async function () {
    await expect(contracts.beneficiaryVaults.getVault(0)).to.be.revertedWith(
      "Uninitialized vault slot"
    );
  });

  it("reverts when trying to get invalid vault", async function () {
    await expect(contracts.beneficiaryVaults.getVault(4)).to.be.revertedWith(
      "Invalid vault id"
    );
  });

  it("reverts when trying to initialize an invalid vault id", async function () {
    const currentBlock = (await provider.getBlock("latest")).number;
    await expect(
      contracts.beneficiaryVaults.openVault(4, merkleRoot)
    ).to.be.revertedWith("Invalid vault id");
  });

  it("cannot nominate new owner as non-owner", async function () {
    await expect(
      contracts.beneficiaryVaults
        .connect(beneficiary1)
        .transferOwnership(beneficiary1.address)
    ).to.be.revertedWith("caller is not the owner");
  });

  it("should revert setting to same Beneficiary Registry", async function () {
    await expect(
      contracts.beneficiaryVaults.setBeneficiaryRegistry(
        contracts.beneficiaryRegistry.address
      )
    ).to.be.revertedWith("Same BeneficiaryRegistry");
  });

  describe("sets new dependent contracts", function () {
    it("sets new BeneficiaryRegistry", async function () {
      const newBeneficiaryRegistry = await waffle.deployMockContract(
        owner,
        contracts.beneficiaryRegistry.interface.format() as any[]
      );
      const result = await contracts.beneficiaryVaults.setBeneficiaryRegistry(
        newBeneficiaryRegistry.address
      );
      expect(await contracts.beneficiaryVaults.beneficiaryRegistry()).to.equal(
        newBeneficiaryRegistry.address
      );
      expect(result)
        .to.emit(contracts.beneficiaryVaults, "BeneficiaryRegistryChanged")
        .withArgs(
          contracts.beneficiaryRegistry.address,
          newBeneficiaryRegistry.address
        );
    });
  });

  describe("vault 0 is opened", function () {
    let result;
    beforeEach(async function () {
      result = await contracts.beneficiaryVaults.openVault(0, merkleRoot);
    });

    it("emits a VaultOpened event", async function () {
      expect(result)
        .to.emit(contracts.beneficiaryVaults, "VaultOpened")
        .withArgs(0, merkleRoot);
    });

    it("vault has expected values", async function () {
      const vaultData = await contracts.beneficiaryVaults.getVault(0);
      expect(vaultData.totalAllocated).to.equal(0);
      expect(vaultData.currentBalance).to.equal(0);
      expect(vaultData.unclaimedShare).to.equal(parseEther("100"));
      expect(vaultData.merkleRoot).to.equal(merkleRoot);
      expect(vaultData.status).to.equal(VaultStatus.Open);
      expect(
        await contracts.beneficiaryVaults.hasClaimed(0, beneficiary1.address)
      ).to.be.false;
      expect(
        await contracts.beneficiaryVaults.hasClaimed(0, beneficiary2.address)
      ).to.be.false;
    });

    it("emits expected events", async function () {
      expect(result)
        .to.emit(contracts.beneficiaryVaults, "VaultOpened")
        .withArgs(0, merkleRoot);
    });

    it("vault has expected values", async function () {
      const vaultData = await contracts.beneficiaryVaults.getVault(0);
      expect(vaultData.totalAllocated).to.equal(0);
      expect(vaultData.currentBalance).to.equal(0);
      expect(vaultData.unclaimedShare).to.equal(parseEther("100"));
      expect(vaultData.merkleRoot).to.equal(merkleRoot);
      expect(vaultData.status).to.equal(VaultStatus.Open);
      expect(
        await contracts.beneficiaryVaults.hasClaimed(0, beneficiary1.address)
      ).to.be.false;
      expect(
        await contracts.beneficiaryVaults.hasClaimed(0, beneficiary2.address)
      ).to.be.false;
    });

    it("contract has expected balance", async function () {
      expect(
        await contracts.mockPop.balanceOf(contracts.beneficiaryVaults.address)
      ).to.equal(0);
    });

    it("contract has expected vaulted balance", async function () {
      expect(await contracts.beneficiaryVaults.totalVaultedBalance()).to.equal(
        0
      );
    });

    it("reverts claim with no reward", async function () {
      const proof = merkleTree.getProof(
        makeElement(beneficiary1.address, claims[beneficiary1.address])
      );
      await expect(
        contracts.beneficiaryVaults
          .connect(beneficiary1)
          .claimReward(
            0,
            proof,
            beneficiary1.address,
            claims[beneficiary1.address]
          )
      ).to.be.revertedWith("No reward");
    });
    describe("deposits reward and distribute to vaults", function () {
      beforeEach(async function () {
        await contracts.mockPop
          .connect(rewarder)
          .transfer(contracts.beneficiaryVaults.address, firstReward);
        result = await contracts.beneficiaryVaults.distributeRewards();
      });

      it("contract has expected balance", async function () {
        expect(
          await contracts.mockPop.balanceOf(contracts.beneficiaryVaults.address)
        ).to.equal(firstReward);
      });

      it("contract has expected vaulted balance", async function () {
        expect(
          await contracts.beneficiaryVaults.totalVaultedBalance()
        ).to.equal(firstReward);
      });

      it("emits expected events", async function () {
        expect(result)
          .to.emit(contracts.beneficiaryVaults, "RewardAllocated")
          .withArgs(0, firstReward);
        expect(result)
          .to.emit(contracts.beneficiaryVaults, "RewardsDistributed")
          .withArgs(firstReward);
      });

      it("reverts invalid claim", async function () {
        const proof = [makeElement(owner.address, "10")];
        await expect(
          contracts.beneficiaryVaults.claimReward(0, proof, owner.address, "10")
        ).to.be.revertedWith("Invalid claim");
      });

      it("reverts claim when beneficiary does not exist", async function () {
        const proof = merkleTree.getProof(
          makeElement(beneficiary1.address, claims[beneficiary1.address])
        );
        await contracts.beneficiaryRegistry.mock.beneficiaryExists.returns(
          false
        );
        await expect(
          contracts.beneficiaryVaults
            .connect(beneficiary1)
            .claimReward(
              0,
              proof,
              beneficiary1.address,
              claims[beneficiary1.address]
            )
        ).to.be.revertedWith("Beneficiary does not exist");
      });

      it("verifies valid claim", async function () {
        const proof = merkleTree.getProof(
          makeElement(beneficiary1.address, claims[beneficiary1.address])
        );
        expect(
          await contracts.beneficiaryVaults
            .connect(beneficiary1)
            .verifyClaim(
              0,
              proof,
              beneficiary1.address,
              claims[beneficiary1.address]
            )
        ).to.be.true;
      });

      it("reverts claim from wrong sender", async function () {
        const proof = merkleTree.getProof(
          makeElement(beneficiary1.address, claims[beneficiary1.address])
        );
        result = await expect(
          contracts.beneficiaryVaults
            .connect(beneficiary2)
            .claimReward(
              0,
              proof,
              beneficiary1.address,
              claims[beneficiary1.address]
            )
        ).to.be.revertedWith("Sender must be beneficiary");
      });

      it("reverts when reinitializing open vault", async function () {
        await expect(
          contracts.beneficiaryVaults.openVault(0, merkleRoot)
        ).to.be.revertedWith("Vault must not be open");
      });

      describe("claim from beneficiary 1", function () {
        let beneficiary1Claim: BigNumber;
        beforeEach(async function () {
          beneficiary1Claim = firstReward
            .mul(claims[beneficiary1.address])
            .div(parseEther("100"));
          const proof = merkleTree.getProof(
            makeElement(beneficiary1.address, claims[beneficiary1.address])
          );
          result = await contracts.beneficiaryVaults
            .connect(beneficiary1)
            .claimReward(
              0,
              proof,
              beneficiary1.address,
              claims[beneficiary1.address]
            );
        });

        it("emits expected events", async function () {
          expect(result)
            .to.emit(contracts.beneficiaryVaults, "RewardClaimed")
            .withArgs(0, beneficiary1.address, beneficiary1Claim);
        });

        it("contract has expected balance", async function () {
          expect(
            await contracts.mockPop.balanceOf(
              contracts.beneficiaryVaults.address
            )
          ).to.equal(firstReward.sub(beneficiary1Claim));
        });

        it("contract has expected vaulted balance", async function () {
          expect(
            await contracts.beneficiaryVaults.totalVaultedBalance()
          ).to.equal(firstReward.sub(beneficiary1Claim));
        });

        it("vault has expected data", async function () {
          const currentBalance = firstReward.sub(beneficiary1Claim);
          const unclaimedShare = parseEther("100").sub(
            claims[beneficiary1.address]
          );
          const vaultData = await contracts.beneficiaryVaults.getVault(0);
          expect(vaultData.totalAllocated).to.equal(firstReward);
          expect(vaultData.currentBalance).to.equal(currentBalance);
          expect(vaultData.unclaimedShare).to.equal(unclaimedShare);
          expect(
            await contracts.beneficiaryVaults.hasClaimed(
              0,
              beneficiary1.address
            )
          ).to.be.true;
        });

        it("reverts a second claim", async function () {
          const proof = merkleTree.getProof(
            makeElement(beneficiary1.address, claims[beneficiary1.address])
          );
          await expect(
            contracts.beneficiaryVaults
              .connect(beneficiary1)
              .claimReward(
                0,
                proof,
                beneficiary1.address,
                claims[beneficiary1.address]
              )
          ).to.be.revertedWith("Already claimed");
        });
        describe("deposit more rewards and distribute", function () {
          beforeEach(async function () {
            await contracts.mockPop
              .connect(rewarder)
              .transfer(contracts.beneficiaryVaults.address, secondReward);
            result = await contracts.beneficiaryVaults
              .connect(rewarder)
              .distributeRewards();
          });

          it("has expected contract balance", async function () {
            const currentBalance = firstReward
              .sub(beneficiary1Claim)
              .add(secondReward);
            expect(
              await contracts.mockPop.balanceOf(
                contracts.beneficiaryVaults.address
              )
            ).to.equal(currentBalance);
          });

          it("contract has expected vaulted balance", async function () {
            const currentBalance = firstReward
              .sub(beneficiary1Claim)
              .add(secondReward);
            expect(
              await contracts.beneficiaryVaults.totalVaultedBalance()
            ).to.equal(currentBalance);
          });

          it("emits expected events", async function () {
            expect(result)
              .to.emit(contracts.beneficiaryVaults, "RewardAllocated")
              .withArgs(0, secondReward);
            expect(result)
              .to.emit(contracts.beneficiaryVaults, "RewardsDistributed")
              .withArgs(secondReward);
          });

          describe("claim from beneficiary 2", function () {
            let beneficiary2Claim: BigNumber;
            beforeEach(async function () {
              beneficiary2Claim = firstReward
                .add(secondReward)
                .sub(beneficiary1Claim)
                .mul(claims[beneficiary2.address])
                .div(parseEther("100").sub(claims[beneficiary1.address]));
              const proof = merkleTree.getProof(
                makeElement(beneficiary2.address, claims[beneficiary2.address])
              );
              result = await contracts.beneficiaryVaults
                .connect(beneficiary2)
                .claimReward(
                  0,
                  proof,
                  beneficiary2.address,
                  claims[beneficiary2.address]
                );
            });

            it("emits expected events", async function () {
              expect(result)
                .to.emit(contracts.beneficiaryVaults, "RewardClaimed")
                .withArgs(0, beneficiary2.address, beneficiary2Claim);
            });

            it("vault has expected data", async function () {
              const currentBalance = firstReward
                .add(secondReward)
                .sub(beneficiary1Claim)
                .sub(beneficiary2Claim);
              const unclaimedShare = parseEther("100")
                .sub(claims[beneficiary1.address])
                .sub(claims[beneficiary2.address]);
              const vaultData = await contracts.beneficiaryVaults.getVault(0);
              expect(vaultData.totalAllocated).to.equal(
                firstReward.add(secondReward)
              );
              expect(vaultData.currentBalance).to.equal(currentBalance);
              expect(vaultData.unclaimedShare).to.equal(unclaimedShare);
              expect(
                await contracts.beneficiaryVaults.hasClaimed(
                  0,
                  beneficiary2.address
                )
              ).to.be.true;
            });

            it("has expected contract balance", async function () {
              const currentBalance = firstReward
                .add(secondReward)
                .sub(beneficiary1Claim)
                .sub(beneficiary2Claim);
              expect(
                await contracts.mockPop.balanceOf(
                  contracts.beneficiaryVaults.address
                )
              ).to.equal(currentBalance);
            });

            it("contract has expected vaulted balance", async function () {
              const currentBalance = firstReward
                .sub(beneficiary1Claim)
                .add(secondReward)
                .sub(beneficiary2Claim);
              expect(
                await contracts.beneficiaryVaults.totalVaultedBalance()
              ).to.equal(currentBalance);
            });
          });

          describe("closes vault 0", function () {
            beforeEach(async function () {
              result = await contracts.beneficiaryVaults.closeVault(0);
            });

            it("emits a VaultClosed event", async function () {
              expect(result)
                .to.emit(contracts.beneficiaryVaults, "VaultClosed")
                .withArgs(0);
            });

            it("has expected contract balance", async function () {
              expect(
                await contracts.mockPop.balanceOf(
                  contracts.beneficiaryVaults.address
                )
              ).to.equal(firstReward.add(secondReward).sub(beneficiary1Claim));
            });

            it("contract has expected vaulted balance", async function () {
              expect(
                await contracts.beneficiaryVaults.totalVaultedBalance()
              ).to.equal(0);
            });

            it("vault has expected data", async function () {
              const vaultData = await contracts.beneficiaryVaults.getVault(0);
              expect(vaultData.totalAllocated).to.equal(
                firstReward.add(secondReward)
              );
              expect(vaultData.currentBalance).to.equal(0);
            });
          });
          describe("open vault 1", function () {
            beforeEach(async function () {
              await contracts.beneficiaryVaults.openVault(1, merkleRoot);
            });

            it("vault 1 has expected values", async function () {
              const vaultData = await contracts.beneficiaryVaults.getVault(1);
              expect(vaultData.totalAllocated).to.equal(0);
              expect(vaultData.currentBalance).to.equal(0);
              expect(vaultData.unclaimedShare).to.equal(parseEther("100"));
              expect(vaultData.merkleRoot).to.equal(merkleRoot);
              expect(vaultData.status).to.equal(VaultStatus.Open);
              expect(
                await contracts.beneficiaryVaults.hasClaimed(
                  1,
                  beneficiary1.address
                )
              ).to.be.false;
              expect(
                await contracts.beneficiaryVaults.hasClaimed(
                  1,
                  beneficiary2.address
                )
              ).to.be.false;
            });

            describe("close vault 0 and redirect remaining rewards to vault 1", function () {
              beforeEach(async function () {
                await contracts.beneficiaryVaults.closeVault(0);
              });

              it("contract has expected vaulted balance", async function () {
                const currentBalance = firstReward
                  .add(secondReward)
                  .sub(beneficiary1Claim);
                expect(
                  await contracts.beneficiaryVaults.totalVaultedBalance()
                ).to.equal(currentBalance);
              });

              it("vault 1 has expected values", async function () {
                const currentBalance = firstReward
                  .add(secondReward)
                  .sub(beneficiary1Claim);
                const vaultData = await contracts.beneficiaryVaults.getVault(1);
                expect(vaultData.totalAllocated).to.equal(currentBalance);
                expect(vaultData.currentBalance).to.equal(currentBalance);
                expect(vaultData.unclaimedShare).to.equal(parseEther("100"));
                expect(
                  await contracts.beneficiaryVaults.hasClaimed(
                    1,
                    beneficiary1.address
                  )
                ).to.be.false;
                expect(
                  await contracts.beneficiaryVaults.hasClaimed(
                    1,
                    beneficiary2.address
                  )
                ).to.be.false;
              });
            });
          });
        });
      });
    });
  });
});
