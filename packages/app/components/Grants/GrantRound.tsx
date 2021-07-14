import {
  BeneficiaryApplication,
  BeneficiaryRegistryAdapter,
  IpfsClient,
} from '@popcorn/utils';
import { ElectionMetadata } from '@popcorn/utils/Contracts';
import { ContractsContext } from 'context/Web3/contracts';
import { BigNumber, utils } from 'ethers';
import { PendingVotes, Vote, Votes } from 'pages/grant-elections/[type]';
import { useContext, useEffect, useRef, useState } from 'react';
import BeneficiaryCard from '../Beneficiaries/BeneficiaryCard';

interface IGrantRound {
  voiceCredits: number;
  votes?: Vote[];
  assignVotes?: (grantTerm: number, vote: Vote) => void;
  scrollToMe?: boolean;
  pendingVotes: PendingVotes;
  election?: ElectionMetadata;
}

const convertBlockchainVotesToVoiceCredits = (
  election: ElectionMetadata,
): Votes => {
  return election.votes.reduce(
    (votes, vote) => {
      votes[vote.beneficiary] = Number(
        utils.formatEther(BigNumber.from(vote.weight).pow(2)),
      ).toFixed(0);
      return votes;
    },
    { total: 0 },
  );
};

export default function GrantRound({
  voiceCredits,
  assignVotes,
  pendingVotes,
  election,
  scrollToMe = false,
}: IGrantRound): JSX.Element {
  const ref = useRef(null);
  const [votes, setVotes] = useState<Votes>({ total: 0 });
  const { contracts } = useContext(ContractsContext);
  const [beneficiariesWithMetadata, setBeneficiaries] = useState<
    BeneficiaryApplication[]
  >([]);

  useEffect(() => {
    if (election) {
      setVotes(convertBlockchainVotesToVoiceCredits(election));
    }
  }, [election]);

  const getBeneficiary = async (
    address: string,
  ): Promise<BeneficiaryApplication> => {
    const beneficiary = await BeneficiaryRegistryAdapter(
      contracts.beneficiary,
      IpfsClient,
    ).getBeneficiaryApplication(address);
    return beneficiary;
  };

  const getAllBeneficiaries = async (registeredBeneficiaries: string[]) => {
    setBeneficiaries(
      await Promise.all(
        registeredBeneficiaries.map((address) => getBeneficiary(address)),
      ),
    );
  };

  useEffect(() => {
    if (votes && election) {
      getAllBeneficiaries(election.registeredBeneficiaries);
    }
  }, [votes, election]);

  useEffect(() => {
    if (ref.current && scrollToMe) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [scrollToMe]);
  if (!election) {
    return <></>;
  }
  return (
    <div
      ref={ref}
      className="mb-16 w-full flex flex-row flex-wrap items-center"
    >
      {beneficiariesWithMetadata?.map((beneficiary) => (
        <BeneficiaryCard
          key={beneficiary.beneficiaryAddress}
          electionProps={{
            election: election,
            pendingVotes: pendingVotes,
            voiceCredits: voiceCredits,
            votesAssignedByUser: 0,
            assignVotes: assignVotes,
            totalVotes: votes[beneficiary.beneficiaryAddress],
          }}
          beneficiary={beneficiary}
        />
      ))}
    </div>
  );
}
