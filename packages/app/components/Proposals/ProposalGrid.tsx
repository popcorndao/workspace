import { useContext, useEffect, useState } from 'react';
import { ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/solid';
import CardGridHeader from 'components/CardGridHeader';
import Navbar from 'components/NavBar/NavBar';
import { setSingleActionModal } from 'context/actions';
import { store } from 'context/store';
import ProposalCard from './ProposalCard';
import { ContractsContext } from 'context/Web3/contracts';
import {
  Proposal,
  ProposalType,
  Status,
  IpfsClient,
  BeneficiaryGovernanceAdapter,
} from '@popcorn/utils';
import {
  ProposalStageExplanations,
  TakedownStageExplanations,
} from './StageExplanations';

export interface ProposalGridProps {
    proposalType: ProposalType
}

const ProposalGrid: React.FC<ProposalGridProps> = ({
  proposalType,
}) => {
  const { dispatch } = useContext(store);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Status>(Status.All);
  const { contracts } = useContext(ContractsContext);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  useEffect(() => {
    if (contracts) {
      BeneficiaryGovernanceAdapter(contracts.beneficiaryGovernance, IpfsClient)
        .getAllProposals(proposalType)
        .then((res) => setProposals(res));
    }
  }, [contracts]);
  return (
    <div className="w-full bg-gray-900 pb-16">
      <Navbar />
      <CardGridHeader
        title={
          proposalType === ProposalType.Nomination
            ? 'Beneficiary Nomination Proposals'
            : 'Beneficiary Takedown Proposals'
        }
        subtitle={
          proposalType === ProposalType.Nomination
            ? `You choose which social initiatives become eligible for grant
            elections. Browse and vote on beneficiary nominations.`
            : `Takedowns which, if successful, would result in organizations
            becoming ineligible for grants, have been triggered against the
            following beneficiaries. Browse and vote in takedown elections.`
        }
      />
      <div className="grid grid-cols-2 gap-4 items-center justify-start ml-36 mr-36 h-1/2">
        <div className="sm:w-full sm:max-w-md lg:mt-0 lg:flex-1">
          <form className="sm:flex">
            <input
              type="search"
              name="searchfilter"
              className="w-full border-white px-5 py-3 placeholder-warm-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cyan-700 focus:ring-white rounded-md"
              placeholder={
                'Search ' +
                `${
                  proposalType === ProposalType.Nomination
                    ? 'Eligible Beneficiaries'
                    : 'Takedown Proposals'
                }`
              }
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </form>
        </div>
        <span className="flex flex-row justify-end">
          <div className="mt-10 w-full max-w-xs mb-10">
            <label
              htmlFor="status"
              className="block text-base font-medium text-gray-200"
            >
              <div className="flex">
                Stage Filter
                <InformationCircleIcon
                  onClick={() => {
                    dispatch(
                      setSingleActionModal({
                        title: 'Beneficiary Nomination Proposal Timeline',
                        content:
                          proposalType === ProposalType.Nomination ? (
                            <ProposalStageExplanations />
                          ) : (
                            <TakedownStageExplanations />
                          ),
                        visible: true,
                        onConfirm: {
                          label: 'Close',
                          onClick: () => {
                            dispatch(setSingleActionModal(false));
                          },
                        },
                      }),
                    );
                  }}
                  className="h-5 w-5 text-white mx-2"
                />
              </div>
            </label>
            <div className="mt-1.5 relative">
              <select
                id="status"
                name="status"
                className="appearance-none block w-full bg-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-base text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                defaultValue={'All'}
                value={Status[statusFilter]}
                onChange={(e) => {
                  const status = e.target.value;
                  setStatusFilter(Status[status]);
                }}
              >
                {new Array(6).fill(undefined).map((x, status) => {
                  return (
                    <option value={Status[status]}>{Status[status]}</option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 px-2 flex items-center">
                <ChevronDownIcon
                  className="h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </span>
      </div>
      <ul className="sm:grid sm:grid-cols-2 gap-x-2 gap-y-12 lg:grid-cols-3 mx-36">
        {proposals
          ?.filter((proposal) => {
            return proposal.application.organizationName
              .toLowerCase()
              .includes(searchFilter.toLowerCase());
          })
          .filter((proposal) => {
            return (
              (proposal as Proposal)?.status === statusFilter ||
              statusFilter === Status.All
            );
          })
          .map((proposal) => (
            <ProposalCard proposal={proposal} proposalType={proposalType} />
          ))}
      </ul>
    </div>
  );
};
export default ProposalGrid
