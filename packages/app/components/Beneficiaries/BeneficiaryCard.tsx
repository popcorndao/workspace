import {
  ElectionMetadata,
  GrantElectionAdapter,
} from '@popcorn/utils/Contracts';
import GrantFunded from 'components/Grants/GrantFunded';
import VoteSlider from 'components/Grants/VoteSlider';
import { BaseBeneficiary, BaseProposal } from 'interfaces/beneficiaries';
import Link from 'next/link';
import { PendingVotes, Vote } from 'pages/grant-elections/[type]';
import VotingInformation from './Proposals/Voting/VotingInformation';

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
  displayData: BaseBeneficiary | BaseProposal;
  electionProps?: ElectionProps;
  isProposal?: boolean;
  isTakedown?: boolean;
}

export default function BeneficiaryCard({
  displayData,
  electionProps,
  isProposal = false,
  isTakedown = false,
}: BeneficiaryCardProps): JSX.Element {
  return (
    <div
      key={displayData?.ethereumAddress}
      className="flex flex-col rounded-lg shadow-lg overflow-hidden"
    >
      <Link
        href={`${
          isTakedown
            ? '/beneficiary-proposals/takedowns/'
            : isProposal
            ? '/beneficiary-proposals/'
            : '/beneficiaries/'
        }${displayData.ethereumAddress}`}
        passHref
      >
        <a>
          <div className="flex-shrink-0">
            <img
              className="h-48 w-full object-cover"
              src={`${process.env.IPFS_URL}${displayData?.profileImage}`}
              alt=""
            />
          </div>
          <div className="flex-1 bg-white p-6 flex flex-col justify-between">
            <div className="flex-1">
              <p className="text-xl font-semibold text-gray-900">
                {displayData?.name}
              </p>
              <p className="mt-3 text-base text-gray-500">
                {displayData?.missionStatement}
              </p>
            </div>
          </div>
        </a>
      </Link>
      <div className="mt-6 flex items-center">
        <div className="flex-shrink-0">
          {isProposal ? (
            <VotingInformation {...(displayData as BaseProposal)} />
          ) : (
            <>
              {GrantElectionAdapter().isActive(electionProps.election) ? (
                <VoteSlider
                  beneficiary={displayData as BaseBeneficiary}
                  electionProps={electionProps}
                />
              ) : (
                <GrantFunded
                  beneficiary={displayData}
                  election={electionProps.election}
                  totalVotes={electionProps.totalVotes}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}