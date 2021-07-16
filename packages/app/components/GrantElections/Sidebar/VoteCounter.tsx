import { PendingVotes } from '../../../pages/grant-elections/[type]';
import { ElectionMetadata } from '@popcorn/utils/Contracts';

interface VoteCounterProps {
  election: ElectionMetadata;
  pendingVotes: PendingVotes;
  maxVotes: number;
  voiceCredits: number;
}

const VoteCounter: React.FC<VoteCounterProps> = ({
  election,
  pendingVotes,
  maxVotes,
  voiceCredits,
}) => {
  if (!voiceCredits) {
    return <></>;
  }
  return (
    <div className="w-full bg-white h-28 rounded-lg p-3 mb-2">
      <p className="font-semibold text-gray-800">Your voice credits</p>
      <p className="text-center pt-2 text-4xl font-black tracking-tight text-gray-800">
        {pendingVotes[election.electionTerm].total} / {maxVotes}
      </p>
    </div>
  );
};
export default VoteCounter
