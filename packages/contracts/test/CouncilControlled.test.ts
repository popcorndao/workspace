import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "@ethersproject/bignumber";
import { CouncilControlled, Region } from "../typechain";

let owner: SignerWithAddress,
  council: SignerWithAddress,
  nonOwner: SignerWithAddress;

let contract: CouncilControlled;
let region: Region;
const DEFAULT_REGION = "0x5757";
const newRegion = "0x1111";

describe("Council Controlled", function () {
  beforeEach(async function () {
    [owner, council, nonOwner] = await ethers.getSigners();
    region = await (
      await (await ethers.getContractFactory("Region")).deploy()
    ).deployed();
    contract = await (
      await (
        await ethers.getContractFactory("CouncilControlled")
      ).deploy(owner.address, region.address)
    ).deployed();
  });

  it("initates correct default values", async function () {
    expect(await contract.getCouncil(DEFAULT_REGION)).to.be.equal(
      owner.address
    );
  });

  context("nominating council", function () {
    it("nominates a new council", async function () {
      expect(await contract.connect(owner).nominateNewCouncil(council.address, DEFAULT_REGION))
        .to.emit(contract, "CouncilNominated")
        .withArgs(DEFAULT_REGION, council.address);
      expect(await contract.nominatedCouncil(DEFAULT_REGION)).to.be.equal(council.address)
    });

    it("reverts when not called by region council", async function () {
      await expect(
        contract
          .connect(nonOwner)
          .nominateNewCouncil(nonOwner.address, newRegion)
      ).to.be.revertedWith("Only the contract council may perform this action");
    });
  });

  context("accepting council", function () {
    it("accepts a new council", async function () {
      await contract.connect(owner).nominateNewCouncil(council.address, DEFAULT_REGION)
      expect(await contract.connect(council).acceptCouncil(DEFAULT_REGION))
      .to.emit(contract, "CouncilChanged")
      .withArgs(DEFAULT_REGION, owner.address, council.address);
    expect(await contract.nominatedCouncil(DEFAULT_REGION)).to.be.equal("0x0000000000000000000000000000000000000000")
    expect(await contract.getCouncil(DEFAULT_REGION)).to.be.equal(council.address)
    });

    it("reverts when not nominated", async function () {
      await expect(
        contract
          .connect(nonOwner)
          .acceptCouncil(DEFAULT_REGION)
      ).to.be.revertedWith("You must be nominated before you can accept council");

    });
  });

  context("create a new region", function () {
    beforeEach(async function () {
      await region.addRegion(newRegion);
    });
    it("reverts when not called by council of default region", async function () {
      await expect(
        contract
          .connect(nonOwner)
          .nominateFirstCouncil(nonOwner.address, newRegion)
      ).to.be.revertedWith("Only the contract council may perform this action");
    });
    it("reverts when the region doesnt exists", async function () {
      await expect(
        contract.connect(owner).nominateFirstCouncil(council.address, "0x4545")
      ).to.be.revertedWith("region doesnt exist");
    });
    it("reverts when the region already has a council", async function () {
      await contract
        .connect(owner)
        .nominateFirstCouncil(council.address, newRegion);
      await contract.connect(council).acceptCouncil(newRegion);
      await expect(
        contract.connect(owner).nominateFirstCouncil(council.address, newRegion)
      ).to.be.revertedWith("region already has a council");
    });
    it("nominates the first council", async function () {
      const result = await contract
        .connect(owner)
        .nominateFirstCouncil(council.address, newRegion);
      expect(result)
        .to.emit(contract, "CouncilNominated")
        .withArgs(newRegion, council.address);
    });
  });
});
