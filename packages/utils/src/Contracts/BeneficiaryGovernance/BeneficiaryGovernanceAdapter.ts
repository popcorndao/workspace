import { BeneficiaryGovernance } from '@popcorn/contracts/typechain';
import { BeneficiaryApplication, Proposal, ProposalType } from '../../';
import { IIpfsClient } from '../../IpfsClient/IpfsClient';

// given a function type, return either the type of the resolved promise if
// a promise is returned or the straight return type of the function.
type AsyncReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;

export const BeneficiaryGovernanceAdapter = (
  contract: BeneficiaryGovernance,
  IpfsClient: () => IIpfsClient,
) => {
  type ProposalContract = AsyncReturnType<typeof contract.proposals>;

  async function addIpfsDataToProposal(
    IpfsClient: () => IIpfsClient,
    proposal: ProposalContract,
    proposalIndex: number,
  ): Promise<Proposal> {
    const beneficiaryApplication: BeneficiaryApplication =
      await IpfsClient().get(proposal.applicationCid);
    const deadline = new Date(
      (Number(proposal.startTime.toString()) +
        Number(proposal.configurationOptions.votingPeriod.toString()) +
        Number(proposal.configurationOptions.vetoPeriod.toString())) *
        1000,
    );

    return {
      application: beneficiaryApplication,
      id: proposalIndex.toString(),
      proposalType: proposal.proposalType,
      status: Number(proposal.status.toString()),
      stageDeadline: deadline,
      votes: {
        for: proposal.yesCount,
        against: proposal.noCount,
      },
    };
  }
  return {
    getProposal: async (id: string): Promise<Proposal> => {
      const proposal = await contract.proposals(Number(id));
      return await addIpfsDataToProposal(IpfsClient, proposal, Number(id));
    },
    getAllProposals: async (
      proposalType: ProposalType,
    ): Promise<Proposal[]> => {
      const numProposals = await contract.getNumberOfProposals();
      const proposalIds = new Array(numProposals.toNumber()).fill(undefined);
      const proposalData: { proposal: ProposalContract; id: number }[] =
        await Promise.all(
          proposalIds.map(async (x, i) => {
            const proposal = await contract.proposals(i);
            return { proposal, id: i };
          }),
        );
      const filteredProposalData = proposalData.filter(
        (proposalData) => proposalData.proposal.proposalType === proposalType,
      );
      return await Promise.all(
        filteredProposalData.map(
          async (proposalData, index) =>
            await addIpfsDataToProposal(
              IpfsClient,
              proposalData.proposal,
              proposalData.id,
            ),
        ),
      );
    },
  };
};
