import { Proposal, Status } from '@popcorn/utils';
import { formatAndRoundBigNumber } from '@popcorn/utils/formatBigNumber';
interface VotingRowProps {
  name: string;
  value: string;
}

const VotingRow: React.FC<VotingRowProps> = (data) => {
    return(
        <span className="flex flex-row justify-between">
          <p className="text-base font-medium text-gray-700">{data.name}</p>
          <span className="text-base text-gray-700 flex flex-row">
            <p>{data.value}</p>
          </span>
        </span>
    );
};

const VotingInformation: React.FC<Proposal> = (proposal): JSX.Element => {
    return(
        <div className="my-4 mx-6">
            <VotingRow name={'Status'} value={Status[proposal.status]}/>
            <VotingRow
                name={'Voting Deadline'}
                value={proposal.stageDeadline.toLocaleString()}
            />
            <VotingRow
                name={'Votes For'}
                value={formatAndRoundBigNumber(proposal.votes.for)}
            />
            <VotingRow
                name={'Votes Against'}
                value={formatAndRoundBigNumber(proposal.votes.against)}
            />
            <VotingRow
                name={'Total Votes'}
                value={formatAndRoundBigNumber(
                    proposal.votes.for.add(proposal.votes.against),
                )}
            />
        </div>
    );
};
export default VotingInformation
