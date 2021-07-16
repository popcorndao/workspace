import {
  ElectionMetadata,
  GrantElectionAdapter,
} from '@popcorn/utils/Contracts';
import { BeneficiaryApplication } from '@popcorn/utils';
import CardBody from 'components/CommonComponents/CardBody';
import GrantFunded from 'components/Grants/GrantFunded';
import VoteSlider from 'components/Grants/VoteSlider';
import Link from 'next/link';
import { PendingVotes, Vote } from 'pages/grant-elections/[type]';

export interface ElectionProps {
  election: ElectionMetadata;
  votesAssignedByUser?: number;
  pendingVotes: PendingVotes;
  assignVotes?: (grantTerm: number, vote: Vote) => void;
  maxVotes?: number;
  voiceCredits?: number;
  totalVotes: number;
}

export interface BeneficiaryCardProps {
  beneficiary: BeneficiaryApplication;
  electionProps?: ElectionProps;
}

export interface GrantSliderProps {
  beneficiary: BeneficiaryApplication;
  electionProps: ElectionProps;
}

function GrantSlider({
  beneficiary,
  electionProps,
}: GrantSliderProps): JSX.Element {
  return (
    <div className="mt-6 flex items-center">
      <div className="flex-shrink-0">
        {GrantElectionAdapter().isActive(electionProps.election) ? (
          <VoteSlider beneficiary={beneficiary} electionProps={electionProps} />
        ) : (
          <GrantFunded
            beneficiary={beneficiary}
            election={electionProps.election}
            totalVotes={electionProps.totalVotes}
          />
        )}
      </div>
    </div>
  );
}

export default function BeneficiaryCard({
  beneficiary,
  electionProps,
}: BeneficiaryCardProps): JSX.Element {
  return (
    <div
      key={beneficiary.beneficiaryAddress}
      className="flex flex-col rounded-lg shadow-lg overflow-hidden"
    >
      <Link href={`/beneficiaries/${beneficiary.beneficiaryAddress}`} passHref>
        <a>
          <CardBody
            imgUrl={`${process.env.IPFS_URL}${beneficiary?.files.profileImage}`}
            name={beneficiary.organizationName}
            missionStatement={beneficiary?.missionStatement}
          />
        </a>
      </Link>
      {electionProps ? (
        <GrantSlider beneficiary={beneficiary} electionProps={electionProps} />
      ) : (
        <></>
      )}
    </div>
  );
}
