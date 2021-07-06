import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BeneficiaryRegistry } from "../typechain";

let owner: SignerWithAddress,
  unauthed: SignerWithAddress,
  beneficiary: SignerWithAddress;
let registry: BeneficiaryRegistry;
const DEFAULT_REGION = "0x5757";

describe("BeneficiaryRegistry", function () {
  beforeEach(async function () {
    [owner, unauthed, beneficiary] = await ethers.getSigners();
    const region = await (
      await (await ethers.getContractFactory("Region")).deploy()
    ).deployed();
    registry = await (
      await (
        await ethers.getContractFactory("BeneficiaryRegistry")
      ).deploy(region.address)
    ).deployed();
  });

  it("Should add a beneficiary to the registry", async function () {
    await registry.addBeneficiary(
      beneficiary.address,
      DEFAULT_REGION,
      ethers.utils.formatBytes32String("testCid")
    );
    expect(await registry.beneficiaryExists(beneficiary.address)).to.equal(
      true
    );
  });

  it("Should not allow an unauthorized address to add a beneficiary to the registry", async function () {
    await expect(
      registry
        .connect(unauthed)
        .addBeneficiary(
          beneficiary.address,
          DEFAULT_REGION,
          ethers.utils.formatBytes32String("testCid")
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should not allow an unauthorized address to revoke a beneficiary", async function () {
    await expect(
      registry.connect(unauthed).revokeBeneficiary(beneficiary.address)
    ).to.be.revertedWith("Only the owner or council may perform this action");
  });

  it("Should revoke beneficiaries", async function () {
    await registry.addBeneficiary(
      beneficiary.address,
      DEFAULT_REGION,
      ethers.utils.formatBytes32String("testCid")
    );
    await registry.connect(owner).revokeBeneficiary(beneficiary.address);
    expect(await registry.beneficiaryExists(beneficiary.address)).to.equal(
      false
    );
  });

  it("Should get a beneficiary by address", async function () {
    await registry.addBeneficiary(
      beneficiary.address,
      DEFAULT_REGION,
      ethers.utils.formatBytes32String("testCid")
    );
    expect(
      ethers.utils.parseBytes32String(
        await registry.getBeneficiary(beneficiary.address)
      )
    ).to.equal("testCid");
  });

  it("Should get a beneficiary by address (public)", async function () {
    await registry.addBeneficiary(
      beneficiary.address,
      DEFAULT_REGION,
      ethers.utils.formatBytes32String("testCid")
    );
    expect(
      ethers.utils.parseBytes32String(
        await registry.connect(unauthed).getBeneficiary(beneficiary.address)
      )
    ).to.equal("testCid");
  });

  it("Cannot nominate new ownership as non-owner", async function () {
    await expect(
      registry.connect(unauthed).transferOwnership(unauthed.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Cannot nominate new council as non-council", async function () {
    await expect(
      registry
        .connect(unauthed)
        .nominateNewCouncil(unauthed.address, DEFAULT_REGION)
    ).to.be.revertedWith("Only the contract council may perform this action");
  });
});
