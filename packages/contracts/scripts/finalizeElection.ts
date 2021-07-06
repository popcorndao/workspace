import { BigNumber } from "@ethersproject/bignumber";
import { parseEther } from "ethers/lib/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  ElectionMetadata,
  GrantElectionAdapter,
  ShareType,
} from "../../utils/src/Contracts";
import { merklize } from "./merkle";

export type awardee = [string, BigNumber];

export function calculateVaultShare(
  awardees: awardee[],
  shareType: ShareType
): awardee[] {
  if (shareType === ShareType.DynamicWeight) {
    let totalVotes = BigNumber.from(0);
    awardees.forEach((awardee) => (totalVotes = totalVotes.add(awardee[1])));
    const a = awardees[0][1].mul(parseEther("100")).div(totalVotes);
    const b = awardees[1][1].mul(parseEther("100")).div(totalVotes);
    awardees.forEach(
      (awardee) =>
        (awardee[1] = awardee[1].mul(parseEther("100")).div(totalVotes))
    );
  } else {
    const equalShare = parseEther("100").div(awardees.length);
    awardees = awardees.map((awardee) => [awardee[0], equalShare]);
  }

  return awardees;
}

export function shuffleAwardees(
  awardees: awardee[],
  randomNumber: number,
  ranking: number
): awardee[] {
  awardees = awardees.slice(0, ranking);
  for (let i = 0; i < awardees.length; i++) {
    let n = i + (randomNumber % (awardees.length - i));
    const temp = awardees[i];
    awardees[i] = awardees[n];
    awardees[n] = temp;
  }
  return awardees;
}

export function countVotes(electionMetaData: ElectionMetadata): awardee[] {
  const awardees: awardee[] = [];
  electionMetaData.votes.forEach((vote) => {
    const awardee = awardees.find((awardee) => awardee[0] == vote.beneficiary);
    if (awardee == undefined) {
      awardees.push([vote.beneficiary, vote.weight]);
    } else {
      awardee[1].add(vote.weight);
    }
  });
  return awardees;
}

export function rankAwardees(electionMetaData: ElectionMetadata): awardee[] {
  let awardees = countVotes(electionMetaData);
  awardees.sort((a, b) => Number(b[1].toString()) - Number(a[1].toString()));
  if (electionMetaData.useChainlinkVRF) {
    awardees = shuffleAwardees(
      awardees,
      electionMetaData.randomNumber,
      electionMetaData.configuration.ranking
    );
  }
  const cutOff = electionMetaData.configuration.awardees;
  return awardees.slice(0, cutOff);
}

export default async function finalizeElection(
  args,
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  console.log("finalize current grant election of term: " + args.term);

  const [signer] = await hre.ethers.getSigners();
  const grantElection = await hre.ethers.getContractAt(
    "GrantElections",
    process.env.ADDR_GRANT_ELECTION
  );

  console.log("getting election meta data...");
  const electionMetaData: ElectionMetadata = await GrantElectionAdapter(
    grantElection
  ).getElectionMetadata(args.term);

  console.log("ranking awardees...");
  let winner = rankAwardees(electionMetaData);
  console.log("and the winner are: " + winner);

  console.log("calculating vault share...");
  winner = calculateVaultShare(winner, electionMetaData.shareType);

  console.log("creating merkle root...");
  const merkleTree = merklize(winner);
  const merkleRoot = "0x" + merkleTree.getRoot().toString("hex");
  console.log("and the merkle root is: " + merkleRoot);

  console.log("finalizing grant election...");
  await grantElection
    .connect(signer)
    .proposeFinalization(args.term, merkleRoot);
  console.log("grant election finalized");
}
