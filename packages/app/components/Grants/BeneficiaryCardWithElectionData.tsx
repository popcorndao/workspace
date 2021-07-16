import { BeneficiaryApplication } from '@popcorn/utils';
import { ElectionMetadata } from '@popcorn/utils/Contracts';
import Link from 'next/link';
import { PendingVotes, Vote } from 'pages/grant-elections/[type]';
import GrantElectionAdapter from '../../../utils/src/Contracts/GrantElection/GrantElectionAdapter';
import GrantFunded from './GrantFunded';
import VoteSlider from './VoteSlider';

export interface ElectionProps {
  election: ElectionMetadata;
  votesAssignedByUser?: number;
  pendingVotes: PendingVotes;
  assignVotes?: (grantTerm: number, vote: Vote) => void;
  maxVotes?: number;
  voiceCredits?: number;
  totalVotes: number;
}

interface BeneficiaryCardWithElectionDataProps {
  beneficiary: BeneficiaryApplication;
  electionProps: ElectionProps;
}

const truncate = (input: string): string => {
  const maxLength = 180;
  const trimmedInput = input.substr(0, maxLength);
  const trimmedOnCompleteWord = trimmedInput.substr(
    0,
    Math.min(trimmedInput.length, trimmedInput.lastIndexOf(' ')),
  );
  return trimmedOnCompleteWord + ' ...';
};

const BeneficiaryCardWithElectionData: React.FC<BeneficiaryCardWithElectionDataProps> = ({
  electionProps,
  beneficiary,
}) => {
  return(
    <div className="shadow-sm w-80 h-auto rounded-lg mr-8 mb-16 bg-white border-b border-gray-200 ">
      <Link href={`/beneficiary/${beneficiary?.beneficiaryAddress}`} passHref>
        <a>
          <div className="w-full h-32 rounded-t-lg">
            <img
              className="w-100 h-auto md:w-100 md:h-auto md:rounded-t rounded-t mx-auto"
              src={`${process.env.IPFS_URL}${beneficiary?.files?.profileImage?.image}`}
              alt=""
              style={{objectFit: 'cover', height: '140px'}}
              />
          </div>
        </a>
      </Link>
      <div className="w-full px-4 pb-6 pt-6">
        <div className="h-10 mt-3">
          <Link
              href={`/beneficiary/${beneficiary?.beneficiaryAddress}`}
              passHref
          >
            <a>
              <h3 className="text-lg font-bold text-gray-800 leading-snug">
                {beneficiary?.organizationName}
              </h3>
            </a>
          </Link>
        </div>
        <div className="h-32">
          <Link
              href={`/beneficiary/${beneficiary?.beneficiaryAddress}`}
              passHref
          >
            <a>
              <p className="text-sm text-gray-700">
                {truncate(beneficiary?.missionStatement)}
              </p>
            </a>
          </Link>
        </div>
        <div className="">
          {GrantElectionAdapter().isActive(electionProps.election) ? (
              <VoteSlider
                  electionProps={electionProps}
                  beneficiary={beneficiary}
              />
          ) : (
              <GrantFunded
                  electionProps={electionProps}
                  beneficiary={beneficiary}
              />
          )}
        </div>
      </div>
    </div>
  );
};
export default BeneficiaryCardWithElectionData
