import GrantRound from '../Grants/GrantRound';
import Sidebar from './Sidebar/Sidebar';
import {
  IGrantRoundFilter,
  PendingVotes,
  Vote,
} from 'pages/grant-elections/[type]';
import { Dispatch } from 'react';
import { ElectionMetadata } from '@popcorn/utils/Contracts';
import createElectionName from 'utils/createElectionName';

interface IElectionSection {
  id: number;
  election: ElectionMetadata;
  voiceCredits: number;
  isWalletConnected: boolean;
  grantRoundFilter: IGrantRoundFilter;
  pendingVotes: PendingVotes;
  assignVotes: (grantTerm: number, vote: Vote) => void;
  connectWallet: () => void;
  submitVotes: Function;
  scrollToGrantRound: (grantId: number) => void;
  setGrantRoundFilter: Dispatch<IGrantRoundFilter>;
  scrollToMe: boolean;
  userIsEligibleBeneficiary?: boolean;
  alreadyRegistered: boolean;
}

export default function ElectionSection({
  election,
  voiceCredits,
  isWalletConnected,
  submitVotes,
  pendingVotes,
  assignVotes,
  connectWallet,
  scrollToGrantRound,
  scrollToMe,
  userIsEligibleBeneficiary,
  alreadyRegistered,
}: IElectionSection): JSX.Element {
  const electionOpenForVoting = election.electionState == 1;
  return (
    <div className="flex flex-col">
      <div className="flex flex-row mb-4">
        <div className="ml-12 w-11/12 border-b border-gray-100 border-opacity-10 mb-8 mt-8">
          <span className="flex flex-row flex-wrap items-center mb-8 ">
            <div className="h-8 w-8 mr-2 flex items-center justify-center flex-shrink-0">
              {electionOpenForVoting ? '🟢' : '🟡'}
            </div>
            <h2 className="text-5xl font-extralight text-white">
              🏆 {createElectionName(election)}
            </h2>
          </span>
          <p className="">{/* description goes here */}</p>
        </div>
      </div>
      <div className="flex flex-row">
        <div className="top-10 w-3/12 h-full sticky">
          <Sidebar
            pendingVotes={pendingVotes}
            election={election}
            voiceCredits={voiceCredits}
            isWalletConnected={isWalletConnected}
            connectWallet={connectWallet}
            submitVotes={submitVotes}
            scrollToGrantRound={scrollToGrantRound}
            alreadyRegistered={alreadyRegistered}
            userIsEligibleBeneficiary={userIsEligibleBeneficiary}
          />
        </div>
        <div className="w-9/12 mb-16">
          <GrantRound
            election={election}
            pendingVotes={pendingVotes}
            voiceCredits={voiceCredits}
            assignVotes={assignVotes}
            scrollToMe={scrollToMe}
          />
        </div>
      </div>
    </div>
  );
}
