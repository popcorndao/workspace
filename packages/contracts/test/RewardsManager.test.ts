import { expect } from "chai";
import { waffle, ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import IUniswapV2Factory from "../artifacts/@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol/IUniswapV2Factory.json";
import IUniswapV2Router02 from "../artifacts/@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol/IUniswapV2Router02.json";
import { MockERC20, RewardsManager, Staking } from "../typechain";
import { Contract } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockContract } from "@ethereum-waffle/mock-contract";

interface Contracts {
  POP: MockERC20;
  MockAlt: MockERC20;
  Insurance: MockContract;
  Treasury: MockContract;
  BeneficiaryVaults: MockContract;
  Staking: Staking;
  mockUniswapV2Router: MockContract;
  RewardsManager: RewardsManager;
}

const RewardSplits = {
  Staking: parseEther("32"),
  Treasury: parseEther("32"),
  Insurance: parseEther("2"),
  BeneficiaryVaults: parseEther("34"),
};
const OwnerInitial = parseEther("10");
const RewarderInitial = parseEther("5");
const overrides = {
  gasLimit: 9999999,
};


let owner: SignerWithAddress,
  rewarder: SignerWithAddress,
  nonOwner: SignerWithAddress;

let contracts: Contracts;

async function deployContracts(): Promise<Contracts> {
  const mockERC20Factory = await ethers.getContractFactory("MockERC20");
  const POP = (await mockERC20Factory.deploy(
    "TestPOP",
    "TPOP",
    18
  )) as MockERC20;
  await POP.mint(owner.address, OwnerInitial);
  await POP.mint(rewarder.address, RewarderInitial);

  const MockAlt = await mockERC20Factory.deploy("TestALT", "TALT", 18);
  await MockAlt.mint(owner.address, OwnerInitial);

  const treasuryFactory = await ethers.getContractFactory("MockTreasury");
  const Treasury = await waffle.deployMockContract(
    owner,
    treasuryFactory.interface.format() as any[]
  );

  const insuranceFactory = await ethers.getContractFactory("MockInsurance");
  const Insurance = await waffle.deployMockContract(
    owner,
    insuranceFactory.interface.format() as any[]
  );

  const Staking = await (
    await (await ethers.getContractFactory("Staking")).deploy(POP.address)
  ).deployed();

  const beneficiaryVaultsFactory = await ethers.getContractFactory(
    "BeneficiaryVaults"
  );
  const BeneficiaryVaults = await waffle.deployMockContract(
    owner,
    beneficiaryVaultsFactory.interface.format() as any[]
  );

  const mockUniswapV2Factory = await waffle.deployMockContract(
    owner,
    IUniswapV2Factory.abi
  );
  const mockUniswapV2Router = await waffle.deployMockContract(
    owner,
    IUniswapV2Router02.abi
  );
  await mockUniswapV2Router.mock.factory.returns(mockUniswapV2Factory.address);

  const rewardsManagerFactory = await ethers.getContractFactory(
    "RewardsManager"
  );
  const RewardsManager = await rewardsManagerFactory.deploy(
    POP.address,
    Staking.address,
    Treasury.address,
    Insurance.address,
    BeneficiaryVaults.address,
    mockUniswapV2Router.address
  );
  await RewardsManager.deployed();
  await Staking.setRewardsManager(RewardsManager.address);
  return {
    POP,
    MockAlt,
    Insurance,
    Treasury,
    Staking,
    BeneficiaryVaults,
    mockUniswapV2Router,
    RewardsManager,
  };
}

describe("RewardsManager", function () {
  beforeEach(async function () {
    [owner, rewarder, nonOwner] = await ethers.getSigners();
    contracts = await deployContracts();
  });

  it("should be constructed with correct addresses", async function () {
    expect(await contracts.RewardsManager.POP()).to.equal(
      contracts.POP.address
    );
    expect(await contracts.RewardsManager.staking()).to.equal(
      contracts.Staking.address
    );
    expect(await contracts.RewardsManager.treasury()).to.equal(
      contracts.Treasury.address
    );
    expect(await contracts.RewardsManager.insurance()).to.equal(
      contracts.Insurance.address
    );
    expect(await contracts.RewardsManager.beneficiaryVaults()).to.equal(
      contracts.BeneficiaryVaults.address
    );
    expect(await contracts.RewardsManager.uniswapV2Router()).to.equal(
      contracts.mockUniswapV2Router.address
    );
  });

  it("should be initialized with correct splits", async function () {
    expect(await contracts.RewardsManager.rewardSplits(0)).to.equal(
      parseEther("32")
    );
    expect(await contracts.RewardsManager.rewardSplits(1)).to.equal(
      parseEther("32")
    );
    expect(await contracts.RewardsManager.rewardSplits(2)).to.equal(
      parseEther("2")
    );
    expect(await contracts.RewardsManager.rewardSplits(3)).to.equal(
      parseEther("34")
    );
  });

  it("reverts when setting reward splits as non-owner", async function () {
    await expect(
      contracts.RewardsManager.connect(nonOwner).setRewardSplits([
        20, 18, 2, 60,
      ])
    ).to.be.revertedWith("Only the contract owner may perform this action");
  });

  it("reverts when setting invalid reward splits", async function () {
    await expect(
      contracts.RewardsManager.setRewardSplits([19, 19, 2, 60])
    ).to.be.revertedWith("Invalid split");
  });

  it("reverts when setting invalid total reward splits", async function () {
    await expect(
      contracts.RewardsManager.setRewardSplits([
        parseEther("20.000000001"),
        parseEther("18"),
        parseEther("2"),
        parseEther("60"),
      ])
    ).to.be.revertedWith("Invalid split total");
  });

  it("reverts when setting out of bounds reward splits", async function () {
    await expect(
      contracts.RewardsManager.setRewardSplits([
        parseEther("9"),
        parseEther("9"),
        parseEther("2"),
        parseEther("80"),
      ])
    ).to.be.revertedWith("Invalid split");
  });

  it("cannot nominate new owner as non-owner", async function () {
    await expect(
      contracts.RewardsManager.connect(nonOwner).nominateNewOwner(
        nonOwner.address
      )
    ).to.be.revertedWith("Only the contract owner may perform this action");
  });

  describe("reward splits are set", function () {
    const newRewardSplits = [
      parseEther("20"),
      parseEther("18"),
      parseEther("2"),
      parseEther("60"),
    ];
    let result;
    beforeEach(async function () {
      result = await contracts.RewardsManager.setRewardSplits([
        parseEther("20"),
        parseEther("18"),
        parseEther("2"),
        parseEther("60"),
      ]);
    });

    it("should emit RewardSplitsUpdated event", async function () {
      expect(result)
        .to.emit(contracts.RewardsManager, "RewardSplitsUpdated")
        .withArgs(newRewardSplits);
    });

    it("should have updated correct splits", async function () {
      expect(await contracts.RewardsManager.rewardSplits(0)).to.equal(
        parseEther("20")
      );
      expect(await contracts.RewardsManager.rewardSplits(1)).to.equal(
        parseEther("18")
      );
      expect(await contracts.RewardsManager.rewardSplits(2)).to.equal(
        parseEther("2")
      );
      expect(await contracts.RewardsManager.rewardSplits(3)).to.equal(
        parseEther("60")
      );
    });
  });

  it("should revert setting to same Staking", async function () {
    await expect(
      contracts.RewardsManager.setStaking(contracts.Staking.address)
    ).to.be.revertedWith("Same Staking");
  });

  it("should revert setting to same Treasury", async function () {
    await expect(
      contracts.RewardsManager.setTreasury(contracts.Treasury.address)
    ).to.be.revertedWith("Same Treasury");
  });

  it("should revert setting to same Insurance", async function () {
    await expect(
      contracts.RewardsManager.setInsurance(contracts.Insurance.address)
    ).to.be.revertedWith("Same Insurance");
  });

  it("should revert setting to same BeneficiaryVaults", async function () {
    await expect(
      contracts.RewardsManager.setBeneficiaryVaults(
        contracts.BeneficiaryVaults.address
      )
    ).to.be.revertedWith("Same BeneficiaryVaults");
  });

  describe("sets new dependent contracts", function () {
    let result;
    it("sets new Staking", async function () {
      const newStaking = await waffle.deployMockContract(
        owner,
        contracts.Staking.interface.format() as any[]
      );
      result = await contracts.RewardsManager.setStaking(newStaking.address);
      expect(await contracts.RewardsManager.staking()).to.equal(
        newStaking.address
      );
      expect(result)
        .to.emit(contracts.RewardsManager, "StakingChanged")
        .withArgs(contracts.Staking.address, newStaking.address);
    });

    it("sets new Insurance", async function () {
      const newInsurance = await waffle.deployMockContract(
        owner,
        contracts.Insurance.interface.format() as any[]
      );
      result = await contracts.RewardsManager.setInsurance(
        newInsurance.address
      );
      expect(await contracts.RewardsManager.insurance()).to.equal(
        newInsurance.address
      );
      expect(result)
        .to.emit(contracts.RewardsManager, "InsuranceChanged")
        .withArgs(contracts.Insurance.address, newInsurance.address);
    });

    it("sets new Treasury", async function () {
      const newTreasury = await waffle.deployMockContract(
        owner,
        contracts.Treasury.interface.format() as any[]
      );
      result = await contracts.RewardsManager.setTreasury(newTreasury.address);
      expect(await contracts.RewardsManager.treasury()).to.equal(
        newTreasury.address
      );
      expect(result)
        .to.emit(contracts.RewardsManager, "TreasuryChanged")
        .withArgs(contracts.Treasury.address, newTreasury.address);
    });

    it("sets new BeneficiaryVaults", async function () {
      const newBeneficiaryVaults = await waffle.deployMockContract(
        owner,
        contracts.BeneficiaryVaults.interface.format() as any[]
      );
      result = await contracts.RewardsManager.setBeneficiaryVaults(
        newBeneficiaryVaults.address
      );
      expect(await contracts.RewardsManager.beneficiaryVaults()).to.equal(
        newBeneficiaryVaults.address
      );
      expect(result)
        .to.emit(contracts.RewardsManager, "BeneficiaryVaultsChanged")
        .withArgs(
          contracts.BeneficiaryVaults.address,
          newBeneficiaryVaults.address
        );
    });
  });

  describe("send rewards", function () {
    const firstReward = parseEther("0.1");
    const stakingReward = firstReward
      .mul(RewardSplits.Staking)
      .div(parseEther("100"));
    const treasuryReward = firstReward
      .mul(RewardSplits.Treasury)
      .div(parseEther("100"));
    const insuranceReward = firstReward
      .mul(RewardSplits.Insurance)
      .div(parseEther("100"));
    const beneficiaryVaultsReward = firstReward
      .mul(RewardSplits.BeneficiaryVaults)
      .div(parseEther("100"));
    let result;

    beforeEach(async function () {
      await contracts.POP.connect(rewarder).transfer(
        contracts.RewardsManager.address,
        firstReward
      );
    });

    it("contract has expected balance", async function () {
      expect(
        await contracts.POP.balanceOf(contracts.RewardsManager.address)
      ).to.equal(firstReward);
    });

    describe("rewards are distributed", function () {
      beforeEach(async function () {
        result = await contracts.RewardsManager.distributeRewards();
      });

      it("emits expected events", async function () {
        expect(result)
          .to.emit(contracts.RewardsManager, "StakingDeposited")
          .withArgs(contracts.Staking.address, stakingReward);
        expect(result)
          .to.emit(contracts.RewardsManager, "TreasuryDeposited")
          .withArgs(contracts.Treasury.address, treasuryReward);
        expect(result)
          .to.emit(contracts.RewardsManager, "InsuranceDeposited")
          .withArgs(contracts.Insurance.address, insuranceReward);
        expect(result)
          .to.emit(contracts.RewardsManager, "BeneficiaryVaultsDeposited")
          .withArgs(
            contracts.BeneficiaryVaults.address,
            beneficiaryVaultsReward
          );
        expect(result)
          .to.emit(contracts.RewardsManager, "RewardsDistributed")
          .withArgs(firstReward);
      });

      it("has expected contract balance", async function () {
        expect(
          await contracts.POP.balanceOf(contracts.RewardsManager.address)
        ).to.equal(0);
      });

      it("Staking has expected balance", async function () {
        expect(
          await contracts.POP.balanceOf(contracts.Staking.address)
        ).to.equal(stakingReward);
      });

      it("Treasury has expected balance", async function () {
        expect(
          await contracts.POP.balanceOf(contracts.Treasury.address)
        ).to.equal(treasuryReward);
      });

      it("Insurance has expected balance", async function () {
        expect(
          await contracts.POP.balanceOf(contracts.Insurance.address)
        ).to.equal(insuranceReward);
      });

      it("BeneficiaryVaults has expected balance", async function () {
        expect(
          await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
        ).to.equal(beneficiaryVaultsReward);
      });

      describe("send more rewards", function () {
        const secondReward = parseEther("0.05");
        beforeEach(async function () {
          await contracts.POP.connect(rewarder).transfer(
            contracts.RewardsManager.address,
            secondReward
          );
        });

        it("has expected contract balance", async function () {
          expect(
            await contracts.POP.balanceOf(contracts.RewardsManager.address)
          ).to.equal(secondReward);
        });

        describe("new rewards are distributed", function () {
          const stakingSecondReward = secondReward
            .mul(RewardSplits.Staking)
            .div(parseEther("100"));
          const treasurySecondReward = secondReward
            .mul(RewardSplits.Treasury)
            .div(parseEther("100"));
          const insuranceSecondReward = secondReward
            .mul(RewardSplits.Insurance)
            .div(parseEther("100"));
          const beneficiaryVaultsSecondReward = secondReward
            .mul(RewardSplits.BeneficiaryVaults)
            .div(parseEther("100"));
          beforeEach(async function () {
            result = await contracts.RewardsManager.distributeRewards();
          });

          it("emits expected events", async function () {
            expect(result)
              .to.emit(contracts.RewardsManager, "StakingDeposited")
              .withArgs(contracts.Staking.address, stakingSecondReward);
            expect(result)
              .to.emit(contracts.RewardsManager, "TreasuryDeposited")
              .withArgs(contracts.Treasury.address, treasurySecondReward);
            expect(result)
              .to.emit(contracts.RewardsManager, "InsuranceDeposited")
              .withArgs(contracts.Insurance.address, insuranceSecondReward);
            expect(result)
              .to.emit(contracts.RewardsManager, "BeneficiaryVaultsDeposited")
              .withArgs(
                contracts.BeneficiaryVaults.address,
                beneficiaryVaultsSecondReward
              );
            expect(result)
              .to.emit(contracts.RewardsManager, "RewardsDistributed")
              .withArgs(secondReward);
          });

          it("has expected contract balance", async function () {
            expect(
              await contracts.POP.balanceOf(contracts.RewardsManager.address)
            ).to.equal(0);
          });

          it("Staking has expected balance", async function () {
            expect(
              await contracts.POP.balanceOf(contracts.Staking.address)
            ).to.equal(stakingReward.add(stakingSecondReward));
          });

          it("Treasury has expected balance", async function () {
            expect(
              await contracts.POP.balanceOf(contracts.Treasury.address)
            ).to.equal(treasuryReward.add(treasurySecondReward));
          });

          it("Insurance has expected balance", async function () {
            expect(
              await contracts.POP.balanceOf(contracts.Insurance.address)
            ).to.equal(insuranceReward.add(insuranceSecondReward));
          });

          it("BeneficiaryVaults has expected balance", async function () {
            expect(
              await contracts.POP.balanceOf(contracts.BeneficiaryVaults.address)
            ).to.equal(
              beneficiaryVaultsReward.add(beneficiaryVaultsSecondReward)
            );
          });
        });
      });
    });

    describe("send alt token for reward swap", function () {
      const altAmount = parseEther("1");
      beforeEach(async function () {
        await contracts.MockAlt.transfer(
          contracts.RewardsManager.address,
          altAmount
        );
      });

      it("has expected contract balance", async function () {
        expect(
          await contracts.MockAlt.balanceOf(contracts.RewardsManager.address)
        ).to.equal(altAmount);
      });

      it("reverts with short path", async function () {
        await expect(
          contracts.RewardsManager.swapTokenForRewards(
            [contracts.MockAlt.address],
            100
          )
        ).to.be.revertedWith("Invalid swap path");
      });

      it("reverts with invalid amount", async function () {
        await expect(
          contracts.RewardsManager.swapTokenForRewards(
            [contracts.MockAlt.address, contracts.POP.address],
            0
          )
        ).to.be.revertedWith("Invalid amount");
      });

      it("reverts with invalid path", async function () {
        await expect(
          contracts.RewardsManager.swapTokenForRewards(
            [contracts.MockAlt.address, contracts.MockAlt.address],
            100
          )
        ).to.be.revertedWith("POP must be last in path");
      });

      describe("execute token swap for pop rewards", function () {
        const swapReward = parseEther("0.24");
        beforeEach(async function () {
          await contracts.mockUniswapV2Router.mock.swapExactTokensForTokens.returns(
            [altAmount, swapReward]
          );
          await contracts.POP.transfer(
            contracts.RewardsManager.address,
            swapReward
          ); //simulate swap
          result = await contracts.RewardsManager.swapTokenForRewards(
            [contracts.MockAlt.address, contracts.POP.address],
            swapReward
          );
        });

        it("emits expected events", async function () {
          expect(result)
            .to.emit(contracts.RewardsManager, "TokenSwapped")
            .withArgs(contracts.MockAlt.address, altAmount, swapReward);
        });

        it("has expected contract balance", async function () {
          expect(
            await contracts.POP.balanceOf(contracts.RewardsManager.address)
          ).to.equal(firstReward.add(swapReward));
        });
      });
    });
  });
});
