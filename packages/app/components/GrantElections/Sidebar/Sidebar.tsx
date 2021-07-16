import { ElectionMetadata } from '@popcorn/utils/Contracts';
import ActionButton from './ActionButton';
import VoteCounter from './VoteCounter';
import { PendingVotes } from '../../../pages/grant-elections/[type]';
import { Check } from 'react-feather';
import Link from 'next/link';

interface ISideBar {
  election?: ElectionMetadata;
  pendingVotes: PendingVotes;
  voiceCredits: number;
  isWalletConnected: boolean;
  connectWallet: () => void;
  submitVotes: Function;
  scrollToGrantRound: (grantId: number) => void;
  userIsEligibleBeneficiary: boolean;
  alreadyRegistered: boolean;
}

export default function Sidebar({
  election,
  pendingVotes,
  voiceCredits,
  isWalletConnected,
  connectWallet,
  submitVotes,
  alreadyRegistered,
}: ISideBar): JSX.Element {
  return (
    <div className="w-9/12 mx-auto">
      {election && 'registration' == election.electionStateStringShort && (
        <>
          <figure className="bg-white rounded-xl p-6 mb-4">
            <div className="space-y-4">
              <blockquote>
                <p className="text-lg font-semibold pb-2">🍿</p>
                <p className="text-md">
                  This grant is currently open for registration.{' '}
                </p>
              </blockquote>
              <figcaption className="text-sm">
                <div>
                  To register, interested organizations must be approved by
                  token holders.
                </div>
              </figcaption>
            </div>
          </figure>
          <span className={`${alreadyRegistered ? 'hidden' : ''}`}>
            <Link href={'/grant-elections/register'} passHref>
              <a className="button button-secondary w-full mt-4">
                Register for Election
              </a>
            </Link>
          </span>

          <span
            className={`flex flex-row items-center pt-8 ${
              alreadyRegistered ? '' : 'hidden'
            }`}
          >
            <p className="text-lg text-black-700 font-bold gray-color">
              You are registered for this election
            </p>
            <div className="h-10 w-10 mr-2 rounded-full border-4 gray-color flex items-center justify-center flex-shrink-0">
              <Check size={32} className="gray-color" />
            </div>
          </span>
        </>
      )}
      {election && 'voting' == election.electionStateStringShort && (
        <figure className="bg-white rounded-xl p-6 mb-8">
          <div className="space-y-4">
            <blockquote>
              <p className="text-lg font-semibold">🚀</p>
              <p className="text-md">Grant elections are currently active! </p>
            </blockquote>
            <figcaption className="text-sm">
              <div>
                Vote for your favorite organizations to receive funding!
              </div>
            </figcaption>
          </div>
        </figure>
      )}
      {election && ['closed'].includes(election.electionStateStringShort) && (
        <figure className="bg-white rounded-xl p-6 mb-8">
          <div className="space-y-4">
            <blockquote>
              <p className="text-lg font-semibold pb-2">
                <img
                  src="/images/popcorn_v1_light_bg.png"
                  width="30"
                  className="inline-block"
                />{' '}
                +{' '}
                <img
                  className="h-12 inline-block"
                  src="/images/partners/chainlink.svg"
                  alt="Chainlink"
                  width="85"
                />{' '}
              </p>
              <p className="text-md">
                This grant election is {election.electionStateStringShort}.{' '}
              </p>
            </blockquote>
            <figcaption className="text-sm">
              <div>
                Sit tight, winners will be announced soon using your votes and
                Chainlink VRF!
              </div>
            </figcaption>{' '}
          </div>
        </figure>
      )}
      {election && ['finalized'].includes(election.electionStateStringShort) && (
        <figure className="bg-white rounded-xl p-6 mb-8">
          <div className="space-y-4">
            <blockquote>
              <p className="text-lg font-semibold">🏆</p>
              <p className="text-md">
                This grant election is {election.electionStateStringShort}.{' '}
              </p>
            </blockquote>
            <figcaption className="text-sm">
              <div>
                The winners have been awarded using your votes and Chainlink
                VRF.
                <p>
                  <img
                    src="/images/popcorn_v1_light_bg.png"
                    width="30"
                    className="inline-block"
                  />{' '}
                  +{' '}
                  <img
                    className="h-12 inline-block"
                    src="/images/partners/chainlink.svg"
                    alt="Chainlink"
                    width="85"
                  />{' '}
                </p>
              </div>
            </figcaption>
          </div>
        </figure>
      )}
      {election && 'voting' == election.electionStateStringShort && (
        <>
          <VoteCounter
            election={election}
            maxVotes={voiceCredits}
            pendingVotes={pendingVotes}
            voiceCredits={voiceCredits}
          />
          <ActionButton
            election={election}
            hasLockedPop={voiceCredits > 0}
            isWalletConnected={isWalletConnected}
            connectWallet={connectWallet}
            submitVotes={submitVotes}
          />
        </>
      )}
      <ul className="mt-4">
        {/** 
        {grantYears?.map((grantYear, i) => (
          <YearSpoiler
            key={grantYear}
            year={grantYear}
            grantRounds={grantRounds.filter(
              (grantRound) => grantRound.year === grantYear,
            )}
            scrollToGrantRound={scrollToGrantRound}
            opened={i === 0}
            grantRoundFilter={grantRoundFilter}
          />
        ))}
            **/}
      </ul>
    </div>
  );
}
