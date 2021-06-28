import CardBody from 'components/CommonComponents/CardBody';
import { Proposal, ProposalType } from '@popcorn/utils/';
import Link from 'next/link';
import VotingInformation from './Voting/VotingInformation';

export interface ProposalCardProps {
  proposal: Proposal;
  proposalType: ProposalType;
}

export default function ProposalCard({
  proposal,
  proposalType = 0,
}: ProposalCardProps): JSX.Element {
  return (
    <div
      key={proposal?.id}
      className="flex flex-col rounded-lg shadow-lg overflow-hidden bg-white"
    >
      <Link
        href={`${
          proposalType === ProposalType.Takedown
            ? '/proposals/takedowns/'
            : '/proposals/nominations/'
        }${proposal.id}`}
        passHref
      >
        <a>
          <CardBody
            imgUrl={`${process.env.IPFS_URL}${proposal.application.files.profileImage}`}
            name={proposal?.application.organizationName}
            missionStatement={proposal?.application.missionStatement}
          />
          <div className="flex-shrink-0 ">
            <VotingInformation {...proposal} />
          </div>
        </a>
      </Link>
    </div>
  );
}