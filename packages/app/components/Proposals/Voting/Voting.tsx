import { Proposal, Status } from '@popcorn/utils';
import React from 'react';
import CurrentStandings from '../CurrentStandings';
import ChallengePeriodVoting from './ChallengePeriodVoting';
import CompletedVoting from './CompletedVoting';
import OpenVoting from './OpenVoting';

export default function Voting(proposal: Proposal): JSX.Element {
  return (
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
}
