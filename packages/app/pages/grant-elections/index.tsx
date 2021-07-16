import { CheckIcon, XIcon } from '@heroicons/react/solid';
import Navbar from 'components/NavBar/NavBar';
import { ElectionsContext } from 'context/Web3/elections';
import Link from 'next/link';
import React, { useContext } from 'react';

export interface IGrantRoundFilter {
  active: boolean;
  closed: boolean;
}

export interface Vote {
  address: string;
  votes: number;
}

export interface IElectionVotes {
  votes: Vote[];
}

export default function GrantOverview(): JSX.Element {
  const { elections } = useContext(ElectionsContext);
  return (
    <div className="w-full">
      <Navbar />
      <div className="bg-gray-900">
        <div className="pt-12 px-4 sm:px-6 lg:px-8 lg:pt-20">
          <div className="text-center">
            <h2 className="text-lg leading-6 font-semibold text-gray-300 uppercase tracking-wider"></h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              DeFi for the People.
            </p>
            <p className="mt-3 max-w-4xl mx-auto text-xl text-gray-300 sm:mt-5 sm:text-2xl">
              Our profits fund social iniatitives. You choose which.
            </p>
          </div>
        </div>

        <div className="mt-16 bg-white pb-12 lg:mt-20 lg:pb-20">
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
                        <ul className="space-y-4">
                          <li className="flex items-start">
                            <div className="flex-shrink-0">
                              <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            </div>
                            <p className="ml-3 text-base font-medium text-gray-500">
                              Vote for your favorite social impact organizations
                              to receive a share of fees earned this month
                            </p>
                          </li>

                          <li className="flex items-start">
                            <div className="flex-shrink-0">
                              {(elections[0] &&
                                ['closed', 'finalized'].includes(
                                  elections[0]?.electionStateStringShort,
                                ) && (
                                  <XIcon className="flex-shrink-0 h-6 w-6 text-red-500" />
                                )) || (
                                <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                              )}
                            </div>
                            <p className="ml-3 text-base font-medium text-gray-500">
                              Election is{' '}
                              {elections &&
                                elections[0]?.electionStateStringLong}
                              .
                            </p>
                          </li>

                          <li className="flex items-start">
                            <div className="flex-shrink-0">
                              <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            </div>
                            <p className="ml-3 text-base font-medium text-gray-500">
                              Receive POP tokens for participating
                            </p>
                          </li>
                        </ul>
                        <div className="mt-8">
                          <div className="rounded-lg shadow-md">
                            <Link href="/grant-elections/monthly" passHref>
                              <a
                                href="#"
                                className="button button-secondary bg-white"
                                aria-describedby="tier-hobby"
                              >
                                View Election
                              </a>
                            </Link>
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
                    <div className="absolute inset-x-0 top-0 transform translate-y-px">
                      <div className="flex justify-center transform -translate-y-1/2">
                        <span className="inline-flex rounded-full bg-indigo-600 px-4 py-1 text-sm font-semibold tracking-wider uppercase text-white"></span>
                      </div>
                    </div>
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
                      <ul className="space-y-4">
                        <li className="flex items-start">
                          <div className="flex-shrink-0">
                            <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                          </div>
                          <p className="ml-3 text-base font-medium text-gray-500">
                            Our profits this year will fund organizations of{' '}
                            <em>your</em> choice
                          </p>
                        </li>

                        <li className="flex items-start">
                          <div className="flex-shrink-0">
                            {(elections[2] &&
                              ['closed', 'finalized'].includes(
                                elections[2]?.electionStateStringShort,
                              ) && (
                                <XIcon className="flex-shrink-0 h-6 w-6 text-red-500" />
                              )) || (
                              <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            )}
                          </div>
                          <p className="ml-3 text-base font-medium text-gray-500">
                            Election is{' '}
                            {elections && elections[2]?.electionStateStringLong}
                            .
                          </p>
                        </li>

                        <li className="flex items-start">
                          <div className="flex-shrink-0">
                            <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                          </div>
                          <p className="ml-3 text-base font-medium text-gray-500">
                            Receive POP tokens for participating
                          </p>
                        </li>

                        <li className="flex items-start">
                          <div className="flex-shrink-0">
                            <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                          </div>
                          <p className="ml-3 text-base font-medium text-gray-500">
                            Support the environment, education and open source
                            initiatives globally
                          </p>
                        </li>
                      </ul>
                      <div className="mt-10">
                        <div className="rounded-lg shadow-md">
                          <Link href="/grant-elections/yearly" passHref>
                            <a
                              href="#"
                              className="button button-primary"
                              aria-describedby="tier-growth"
                            >
                              View Election
                            </a>
                          </Link>
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
                        <ul className="space-y-4">
                          <li className="flex items-start">
                            <div className="flex-shrink-0">
                              <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            </div>
                            <p className="ml-3 text-base font-medium text-gray-500">
                              Vote for your favorite social impact organizations
                              to receive a share of fees earned this quarter
                            </p>
                          </li>

                          <li className="flex items-start">
                            <div className="flex-shrink-0">
                              {(elections[1] &&
                                ['closed', 'finalized'].includes(
                                  elections[1]?.electionStateStringShort,
                                ) && (
                                  <XIcon className="flex-shrink-0 h-6 w-6 text-red-500" />
                                )) || (
                                <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                              )}
                            </div>
                            <p className="ml-3 text-base font-medium text-gray-500">
                              Election is{' '}
                              {elections &&
                                elections[1]?.electionStateStringLong}
                              .
                            </p>
                          </li>

                          <li className="flex items-start">
                            <div className="flex-shrink-0">
                              <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            </div>
                            <p className="ml-3 text-base font-medium text-gray-500">
                              Receive POP tokens for participating
                            </p>
                          </li>
                        </ul>
                        <div className="mt-8">
                          <div className="rounded-lg shadow-md">
                            <Link href="/grant-elections/quarterly" passHref>
                              <a
                                href="#"
                                className="button button-secondary bg-white"
                                aria-describedby="tier-scale"
                              >
                                View Election
                              </a>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-indigo-200 bg-opacity-25 mt-20">
            <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
              <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                <h2 className="max-w-md mx-auto text-3xl font-extrabold text-indigo-900 text-center lg:max-w-xl lg:text-left">
                  We're like a philanthropic bank partnering* with organizations
                  like:
                  <p className="text-xs">
                    * for demonstration purposes only. no such partnerships
                    exist yet
                  </p>
                </h2>

                <div className="flow-root self-center mt-8 lg:mt-0">
                  <div className="-mt-4 -ml-8 flex flex-wrap justify-between lg:-ml-4">
                    <div className="mt-4 ml-8 flex flex-grow flex-shrink-0 justify-center lg:flex-grow-0 lg:ml-4">
                      <img
                        className="h-12"
                        src="/images/partners/chainlink.svg"
                        alt="Chainlink"
                      />
                    </div>
                    <div className="mt-4 ml-8 flex flex-grow flex-shrink-0 justify-center lg:flex-grow-0 lg:ml-4">
                      <img
                        className="h-12"
                        src="/images/partners/olpc.svg"
                        alt="One Laptop Per Child"
                      />
                    </div>
                    <div className="mt-4 ml-8 flex flex-grow flex-shrink-0 justify-center lg:flex-grow-0 lg:ml-4">
                      <img
                        className="h-12"
                        src="/images/partners/unicef.svg"
                        alt="UNICEF"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
