import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useWeb3React } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { connectors } from '../../context/Web3/connectors';
import ElectionSection from 'components/GrantElections/ElectionSection';
import NavBar from '../../components/NavBar/NavBar';
import { ContractsContext } from '../../context/Web3/contracts';

import { BigNumber, utils } from 'ethers';
import capitalize from '@popcorn/utils/capitalize';
import GrantElectionAdapter, {
  ElectionTerm,
  ElectionTermIntToName,
} from '@popcorn/utils/Contracts/GrantElection/GrantElectionAdapter';
import { ElectionsContext } from '../../context/Web3/elections';
import { store } from '../../context/store';
import {
  setDualActionModal,
  setSingleActionModal,
} from '../../context/actions';

export interface IGrantRoundFilter {
  active: boolean;
  closed: boolean;
}

export interface Vote {
  address: string;
  votes: number;
}
export interface Votes {
  [key: string]: number;
  total: number;
  // address: votes
}

export interface PendingVotes {
  [key: number]: {
    total: number;
    lastAddress: string;
    lastAmount: number;
    votes: {
      [key: string]: number;
    };
  };
  // grant election: Vote;
}

const defaultPendingVotes = {
  [ElectionTerm.Monthly]: {
    total: 0,
    lastAddress: '',
    lastAmount: 0,
    votes: {},
  },
  [ElectionTerm.Quarterly]: {
    total: 0,
    lastAddress: '',
    lastAmount: 0,
    votes: {},
  },
  [ElectionTerm.Yearly]: {
    total: 0,
    lastAddress: '',
    lastAmount: 0,
    votes: {},
  },
};

const getSelectedGrantTermsFromQuery = (type: string): number[] => {
  if (type == 'all') {
    return [0, 1, 2];
  }
  return type && [ElectionTerm[capitalize(type as string)]];
};

const getOtherGrantElections = (currentGrantElection: number[]): number[] => {
  return [0, 1, 2].filter((x) => !currentGrantElection.includes(x));
};

export default function AllGrants() {
  const router = useRouter();
  const context = useWeb3React<Web3Provider>();
  const { library, account, activate } = context;
  const { contracts } = useContext(ContractsContext);
  const { elections } = useContext(ElectionsContext);
  const { dispatch } = useContext(store);

  const [pendingVotes, setPendingVotes] = useState<PendingVotes>(
    defaultPendingVotes,
  );
  const [voiceCredits, setVoiceCredits] = useState(0);
  const [activeGrantRound, scrollToGrantRound] = useState<number>();
  const [grantRoundFilter, setGrantRoundFilter] = useState<IGrantRoundFilter>({
    active: true,
    closed: true,
  });
  const [electionsSignedUpFor, setElectionsSignedUpFor] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [beneficiaryExists, setBeneficiaryExists] = useState<boolean>(false);

  async function IsUserAlreadyRegistered() {
    const connected = contracts.election.connect(library.getSigner());
    const elections = [
      await connected._isEligibleBeneficiary(account, ElectionTerm.Monthly),
      await connected._isEligibleBeneficiary(account, ElectionTerm.Quarterly),
      await connected._isEligibleBeneficiary(account, ElectionTerm.Yearly),
    ];
    setElectionsSignedUpFor(elections);
  }

  useEffect(() => {
    // Call to see if user has already registered for election
    if (contracts?.election && account) {
      IsUserAlreadyRegistered();
    }
  }, [contracts, account]);

  useEffect(() => {
    // call to see if we are an eligible beneficiary
    if (contracts?.beneficiary && account) {
      let connected = contracts.beneficiary.connect(library.getSigner());
      connected
        .beneficiaryExists(account)
        .then((response) => setBeneficiaryExists(response))
        .catch((err) => console.log(err, 'beneficiary doesnt exist'));
    }
  }, [contracts, account]);

  function registerForElection(grant_term) {
    // Register for selected election
    let connected = contracts.election.connect(library.getSigner());
    connected
      .registerForElection(account, grant_term)
      .then((res) => {
        setSingleActionModal({
          content: `You have successfully registered for this grant election`,
          title: 'Success!',
          visible: true,
          type: 'info',
          onConfirm: {
            label: 'Done',
            onClick: () => dispatch(setSingleActionModal(false)),
          },
        });
        let newElectionSignedUpForArray = electionsSignedUpFor;
        newElectionSignedUpForArray[grant_term] = true;
        setElectionsSignedUpFor(newElectionSignedUpForArray);
      })
      .catch((err) => {
        setSingleActionModal({
          content: `There was an error registering you for this election: ${err.message}`,
          title: 'Error',
          visible: true,
          type: 'error',
          onConfirm: {
            label: 'Go Back',
            onClick: () => dispatch(setSingleActionModal(false)),
          },
        });
      });
  }
  const [selectedGrantTerms, setSelectedGrantTerms] = useState<number[]>([]);

  useEffect(() => {
    if (router?.query?.type) {
      setSelectedGrantTerms(
        getSelectedGrantTermsFromQuery(router.query.type as string),
      );
    }
  }, [router]);

  const getVoiceCredits = async (account) => {
    if (!account) return;
    const vCredits = await contracts.staking.getVoiceCredits(account);
    const vCreditsFormatted = +utils
      .formatEther(vCredits)
      .toString()
      .split('.')[0];
    setVoiceCredits(vCreditsFormatted);
  };

  useEffect(() => {
    if (contracts?.pop && account) {
      contracts.pop
        .balanceOf(account)
        .then((res) => console.log('POP Balance: ', res));
    }
  }, [contracts, account]);

  useEffect(() => {
    if (!contracts || !selectedGrantTerms.length) {
      return;
    }
    getVoiceCredits(account);
  }, [contracts, account, selectedGrantTerms]);

  useEffect(() => {
    if (!grantRoundFilter.active && !grantRoundFilter.closed) {
      setGrantRoundFilter({ active: true, closed: true });
    }
  }, [grantRoundFilter]);

  function connectWallet() {
    activate(connectors.Injected);
  }

  /**
   * Assigns votes
   * implements binary approach to improve performance and lagging so we're not
   * recalculating the totals every time the slider moves
   * @param grantTerm
   * @param vote
   */
  function assignVotes(grantTerm: number, vote: Vote): void {
    pendingVotes[grantTerm].votes[vote.address] = vote.votes;
    if (vote.address == pendingVotes[grantTerm].lastAddress) {
      pendingVotes[grantTerm].total -= pendingVotes[grantTerm].lastAmount;
      pendingVotes[grantTerm].total += vote.votes;
      pendingVotes[grantTerm].lastAmount = vote.votes;
    } else {
      pendingVotes[grantTerm].lastAddress = vote.address;
      pendingVotes[grantTerm].lastAmount = vote.votes;
      pendingVotes[grantTerm].total = Object.keys(
        pendingVotes[grantTerm].votes,
      ).reduce((total, address) => {
        total += pendingVotes[grantTerm].votes[address];
        return total;
      }, 0);
    }

    // this handles the case when a fast hand with the slider assigns more votes than allowed
    if (pendingVotes[grantTerm].total > voiceCredits) {
      pendingVotes[grantTerm].votes[vote.address] =
        vote.votes - (pendingVotes[grantTerm].total - voiceCredits);
      pendingVotes[grantTerm].lastAmount =
        pendingVotes[grantTerm].votes[vote.address];
      pendingVotes[grantTerm].total = voiceCredits;
    }

    setPendingVotes({ ...pendingVotes });
  }

  const submitVotes = async (grantTerm: ElectionTerm) => {
    dispatch(
      setDualActionModal({
        visible: true,
        progress: true,
      }),
    );

    const txArgs = Object.keys(pendingVotes[grantTerm].votes).reduce<
      [string[], BigNumber[], number]
    >(
      (txArgs, address) => {
        txArgs[0].push(address);
        txArgs[1].push(
          utils.parseEther(pendingVotes[grantTerm].votes[address].toString()),
        );
        return txArgs;
      },
      [[], [], grantTerm],
    );

    try {
      await contracts.election
        .connect(library.getSigner())
        .vote(txArgs[0], txArgs[1], txArgs[2]);

      dispatch(setDualActionModal(false));
      dispatch(
        setSingleActionModal({
          title: 'Success!',
          content: 'You have successfully voted in this election. Thank you!',
          visible: true,
          onConfirm: {
            label: 'Close',
            onClick: () => {
              dispatch(setSingleActionModal(false));
            },
          },
        }),
      );
      // todo: set succesful tx notification
      // setup listener for confirmation
    } catch (err) {
      dispatch(setDualActionModal(false));
      dispatch(
        setSingleActionModal({
          content: `There was an error processing this transaction: ${err.message}`,
          title: 'Transaction Failed',
          visible: true,
          type: 'error',
          onConfirm: {
            label: 'Close',
            onClick: () => dispatch(setSingleActionModal(false)),
          },
        }),
      );
    }
  };

  return (
    <div className="w-full bg-gray-900 pb-16">
      <NavBar />
      <div className="bg-indigo-200 bg-opacity-100 pt-20 pb-20">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            <h2 className="max-w-md mx-auto text-3xl font-extrabold text-indigo-900 text-center lg:max-w-xl lg:text-left">
              Popcorn's profits fund social and environmental initiatives.
            </h2>

            <div className="flow-root self-center mt-8 lg:mt-0">
              <div className="-mt-4 -ml-8 flex flex-wrap justify-between lg:-ml-4">
                <div className="mt-4 ml-8 flex flex-grow flex-shrink-0 justify-center lg:flex-grow-0 lg:ml-4">
                  <h2 className="max-w-md mx-auto text-3xl font-extrabold text-indigo-900 text-center lg:max-w-xl lg:text-left">
                    Your vote helps decide which get funded.
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-10/12 mx-auto mt-8">
        {[...elections]
          .filter(
            (election) =>
              (GrantElectionAdapter().isActive(election) &&
                grantRoundFilter.active) ||
              (!GrantElectionAdapter().isActive(election) &&
                grantRoundFilter.closed),
          )
          .filter((election) =>
            selectedGrantTerms.includes(election.electionTerm),
          )
          .sort(
            (election1, election2) =>
              Number(election2.startTime) + Number(election1.startTime),
          )
          .map((election) => (
            <ElectionSection
              id={election.electionTerm}
              key={election.electionTerm}
              pendingVotes={pendingVotes}
              election={election}
              voiceCredits={voiceCredits}
              isWalletConnected={library?.connection?.url === 'metamask'}
              grantRoundFilter={grantRoundFilter}
              assignVotes={assignVotes}
              connectWallet={connectWallet}
              submitVotes={(grantTerm) => {
                dispatch(
                  setDualActionModal({
                    content:
                      'You are about to submit your vote. You will not be able to vote again for this grant election after you submit your vote. \
                     Confirm to continue.',
                    title: 'Confirm Vote',
                    onConfirm: {
                      label: 'Confirm Vote',
                      onClick: () => {
                        submitVotes(grantTerm);
                      },
                    },
                    onDismiss: {
                      label: 'Cancel',
                      onClick: () => dispatch(setDualActionModal(false)),
                    },
                  }),
                );
              }}
              scrollToGrantRound={scrollToGrantRound}
              setGrantRoundFilter={setGrantRoundFilter}
              scrollToMe={election.electionTerm === activeGrantRound}
              userIsEligibleBeneficiary={beneficiaryExists}
              alreadyRegistered={electionsSignedUpFor[election.electionTerm]}
            />
          ))}
      </div>
      {getOtherGrantElections(selectedGrantTerms).length && (
        <div className="relative">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-gray-100 border-opacity-10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-lg font-medium rounded-md border border-gray-100 border-opacity-10 bg-gray-100">
              Other Grant Elections
            </span>
          </div>
        </div>
      )}
      {getOtherGrantElections(selectedGrantTerms).map((election) => (
        <div
          key={election}
          className="mt-8 pt-8 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:mt-5"
        >
          <div className="max-w-md mx-auto lg:max-w-5xl">
            <div className="rounded-lg bg-white px-6 py-8 sm:p-10 lg:flex lg:items-center">
              <div className="flex-1">
                <div>
                  <h3 className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-white text-gray-800">
                    🏆 {capitalize(ElectionTermIntToName[election])} Grant
                    Election
                  </h3>
                </div>
                <div className="mt-4 text-lg text-gray-600">
                  The {ElectionTermIntToName[election]} grant election is:{' '}
                  <span className="font-semibold text-gray-900">
                    {elections[election]?.electionStateStringLong}
                  </span>
                  .
                </div>
              </div>
              <div className="mt-6 rounded-md shadow lg:mt-0 lg:ml-10 lg:flex-shrink-0">
                <Link
                  href={`/grant-elections/${ElectionTermIntToName[election]}`}
                  passHref
                >
                  <a href="#" className="button button-secondary">
                    View {ElectionTermIntToName[election]} election
                  </a>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
