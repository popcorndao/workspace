import { Proposal, Status } from '@popcorn/utils';
import React from 'react';
import CurrentStandings from '../CurrentStandings';
import ChallengePeriodVoting from './ChallengePeriodVoting';
import CompletedVoting from './CompletedVoting';
import OpenVoting from './OpenVoting';

const Voting: React.FC<Proposal> = (proposal): JSX.Element => (
    <div>
      {proposal?.status === Status.Open ? (
          <OpenVoting {...proposal} />
      ) : proposal?.status === Status.Challenge ? (
          <ChallengePeriodVoting {...proposal} />
      ) : (
          <CompletedVoting {...proposal} />
      )}
      {Object.keys(proposal).length > 0 && <CurrentStandings {...proposal} />}
    </div>
);
export default Voting
