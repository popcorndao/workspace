import { Web3Provider } from '@ethersproject/providers';
import { useWeb3React } from '@web3-react/core';
import { ContractsContext } from '../../context/Web3/contracts';
import Navbar from 'components/NavBar/NavBar';
import { connectors } from '../../context/Web3/connectors';
import { useEffect } from 'react';
import { useState } from 'react';
import { useContext } from 'react';
import SingleActionModal, {
  DefaultSingleActionModalProps,
} from 'components/Modal/SingleActionModal';
import Icon from 'components/Icon';
import { ElectionsContext } from '../../context/Web3/elections';
import { store } from '../../context/store';
import { setSingleActionModal } from '../../context/actions';

export default function Register(): JSX.Element {
  const context = useWeb3React<Web3Provider>();
  const { library, account, activate } = context;
  const { contracts } = useContext(ContractsContext);
  const { elections } = useContext(ElectionsContext);
  const { dispatch } = useContext(store);
  const [wait, setWait] = useState<boolean>(false);
  const [registerStatus, setRegisterStatus] = useState<
    'success' | 'error' | 'none'
  >('none');
  const [allowedToRegister, setRegistrationAllowance] = useState<boolean[]>([
    false,
    false,
    false,
  ]);

  function registerForElection(grant_term) {
    // Register for selected election
    setWait(true);
    let connected = contracts.election.connect(library.getSigner());
    connected
      .registerForElection(account, grant_term)
      .then((res) => {
        dispatch(
          setSingleActionModal({
            content: `You have successfully registered for this grant election`,
            title: 'Success!',
            visible: true,
            type: 'info',
            onConfirm: {
              label: 'Done',
              onClick: () =>
                dispatch(
                  setSingleActionModal({ ...DefaultSingleActionModalProps }),
                ),
            },
          }),
        );
        setWait(false);
      })
      .catch((err) => {
        dispatch(
          setSingleActionModal({
            content: `There was an error registering you for this election: ${err.message}`,
            title: 'Error',
            visible: true,
            type: 'error',
            onConfirm: {
              label: 'Go Back',
              onClick: () =>
                dispatch(
                  setSingleActionModal({ ...DefaultSingleActionModalProps }),
                ),
            },
          }),
        );
        setWait(false);
      });
  }

  async function checkRegistrationAllowance(): Promise<void> {
    setRegistrationAllowance(
      await Promise.all(
        [0, 1, 2].map(
          async (term) =>
            (await contracts.beneficiary.beneficiaryExists(account)) &&
            !elections[term].registeredBeneficiaries.includes(account),
        ),
      ),
    );
  }

  useEffect(() => {
    if (account && contracts?.beneficiary) {
      checkRegistrationAllowance();
    }
  }, [account, contracts]);

  return (
    <div className="w-full h-screen">
      <SingleActionModal
        visible={registerStatus === 'success'}
        title="=Success"
        content="You are registered for the election."
        type={'info'}
        onConfirm={{ label: 'ok', onClick: () => setRegisterStatus('none') }}
      />
      <SingleActionModal
        visible={registerStatus === 'error'}
        title={'Error'}
        content={'There was an error registering you for the election.'}
        type={'error'}
        onConfirm={{ label: 'ok', onClick: () => setRegisterStatus('none') }}
      />
      <Navbar />
      {elections.length && (
        <div className="bg-gray-900 h-full">
          <div className="pt-12 px-4 sm:px-6 lg:px-8 lg:pt-20">
            <div className="text-center">
              <h2 className="text-lg leading-6 font-semibold text-gray-300 uppercase tracking-wider"></h2>
              <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                Register for an Election
              </p>
              <p className="mt-3 max-w-4xl mx-auto text-xl text-gray-300 sm:mt-5 sm:text-2xl">
                Choose a grant election to register for.
              </p>
            </div>
          </div>
          <div className="mt-16 pb-12 lg:mt-20 lg:pb-20">
            <div className="relative z-0">
              <div className="absolute inset-0 h-5/6 bg-gray-900 lg:h-2/3"></div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative lg:grid lg:grid-cols-7">
                  <div className="mx-auto max-w-md lg:mx-0 lg:max-w-none lg:col-start-1 lg:col-end-3 lg:row-start-2 lg:row-end-3">
                    <div className="h-full flex flex-col rounded-lg shadow-lg overflow-hidden lg:rounded-none lg:rounded-l-lg">
                      <div className="flex-1 flex flex-col">
                        <div className="bg-white px-6 py-10">
                          <div>
                            <h3
                              className="text-center text-2xl font-medium text-gray-900"
                              id="tier-hobby"
                            >
                              Monthly Grant Election
                            </h3>
                            <div className="mt-4 flex items-center justify-center">
                              <span className="px-3 flex items-start text-6xl tracking-tight text-gray-900">
                                <span className="mt-2 mr-2 text-4xl font-medium">
                                  $
                                </span>
                                <span className="font-extrabold">244,503</span>
                              </span>
                              <span className="text-xl font-medium text-gray-500">
                                (est.)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-between border-t-2 border-gray-100 p-6 bg-gray-50 sm:p-10 lg:p-6 xl:p-10">
                          <div className="flex  flex-shrink-0 items-start">
                            {elections[0].electionState === 0 ? (
                              <Icon type="check" />
                            ) : (
                              <Icon type="x" />
                            )}
                            <p className="ml-3 text-base font-medium text-gray-500">
                              Registration{' '}
                              {elections[0].electionState === 0
                                ? 'Open'
                                : 'Closed'}
                            </p>
                          </div>
                          <div className="mt-4">
                            <div className="rounded-lg shadow-md">
                              <button
                                className="block w-full text-center rounded-lg border border-transparent bg-white px-6 py-3 text-base font-medium text-indigo-600 hover:bg-gray-50 disabled:opacity-50"
                                aria-describedby="tier-scale"
                                onClick={() => registerForElection(0)}
                                disabled={
                                  elections[0].electionState > 0 ||
                                  !allowedToRegister[0] ||
                                  wait
                                }
                              >
                                Register for Election
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 max-w-lg mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-start-3 lg:col-end-6 lg:row-start-1 lg:row-end-4">
                    <div className="relative z-10 rounded-lg shadow-xl">
                      <div
                        className="pointer-events-none absolute inset-0 rounded-lg border-2 border-indigo-600"
                        aria-hidden="true"
                      ></div>
                      <div className="bg-white rounded-t-lg px-6 pt-12 pb-10">
                        <div>
                          <h3
                            className="text-center text-3xl font-semibold text-gray-900 sm:-mx-6"
                            id="tier-growth"
                          >
                            Yearly Grant Election
                          </h3>
                          <div className="mt-4 flex items-center justify-center">
                            <span className="px-3 flex items-start text-6xl tracking-tight text-gray-900 sm:text-6xl">
                              <span className="mt-2 mr-2 text-4xl font-medium">
                                $
                              </span>
                              <span className="font-extrabold">2.9M</span>
                            </span>
                            <span className="text-2xl font-medium text-gray-500">
                              (est.)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t-2 border-gray-100 rounded-b-lg pt-10 pb-8 px-6 bg-gray-50 sm:px-10 sm:py-10">
                        <div className="flex  flex-shrink-0 items-start">
                          {elections[2].electionState === 0 ? (
                            <Icon type="check" />
                          ) : (
                            <Icon type="x" />
                          )}
                          <p className="ml-3 text-base font-medium text-gray-500">
                            Registration{' '}
                            {elections[2].electionState === 0
                              ? 'Open'
                              : 'Closed'}
                          </p>
                        </div>
                        <div className="mt-6">
                          <div className="rounded-lg shadow-md">
                            {account ? (
                              <button
                                className="block w-full text-center rounded-lg border border-transparent bg-indigo-600 px-6 py-4 text-xl leading-6 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                aria-describedby="tier-growth"
                                disabled={
                                  elections[2].electionState !== 0 ||
                                  !allowedToRegister[2] ||
                                  wait
                                }
                                onClick={() => registerForElection(2)}
                              >
                                Register for Election
                              </button>
                            ) : (
                              <button
                                className="block w-full text-center rounded-lg border border-transparent bg-indigo-600 px-6 py-4 text-xl leading-6 font-medium text-white hover:bg-indigo-700 disabled:opacity:50"
                                aria-describedby="tier-growth"
                                onClick={() => activate(connectors.Injected)}
                              >
                                Connect Wallet
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 mx-auto max-w-md lg:m-0 lg:max-w-none lg:col-start-6 lg:col-end-8 lg:row-start-2 lg:row-end-3">
                    <div className="h-full flex flex-col rounded-lg shadow-lg overflow-hidden lg:rounded-none lg:rounded-r-lg">
                      <div className="flex-1 flex flex-col">
                        <div className="bg-white px-6 py-10">
                          <div>
                            <h3
                              className="text-center text-2xl font-medium text-gray-900"
                              id="tier-scale"
                            >
                              Quarterly Grant Election
                            </h3>
                            <div className="mt-4 flex items-center justify-center">
                              <span className="px-3 flex items-start text-6xl tracking-tight text-gray-900">
                                <span className="mt-2 mr-2 text-4xl font-medium">
                                  $
                                </span>
                                <span className="font-extrabold">733,509</span>
                              </span>
                              <span className="text-xl font-medium text-gray-500">
                                (est.)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-between border-t-2 border-gray-100 p-6 bg-gray-50 sm:p-10 lg:p-6 xl:p-10">
                          <div className="flex  flex-shrink-0 items-start">
                            {elections[1].electionState === 0 ? (
                              <Icon type="check" />
                            ) : (
                              <Icon type="x" />
                            )}
                            <p className="ml-3 text-base font-medium text-gray-500">
                              Registration{' '}
                              {elections[1].electionState === 0
                                ? 'Open'
                                : 'Closed'}
                            </p>
                          </div>
                          <div className="mt-4">
                            <div className="rounded-lg shadow-md">
                              <button
                                className="block w-full text-center rounded-lg border border-transparent bg-white px-6 py-3 text-base font-medium text-indigo-600 hover:bg-gray-50 disabled:opacity-50"
                                aria-describedby="tier-scale"
                                onClick={() => registerForElection(1)}
                                disabled={
                                  elections[1].electionState > 0 ||
                                  !allowedToRegister[1] ||
                                  wait
                                }
                              >
                                Register for Election
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
