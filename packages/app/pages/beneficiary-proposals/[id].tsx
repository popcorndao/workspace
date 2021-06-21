import ProposalPage from 'components/Proposals/ProposalPage';
import { ContractsContext } from 'context/Web3/contracts';
import { BeneficiaryProposal } from 'interfaces/proposals';
import router from 'next/router';
import { useContext, useEffect, useState } from 'react';
import { getProposal } from 'utils/getProposals';

export default function SingleBeneficiaryProposalPage(): JSX.Element {
  const { contracts } = useContext(ContractsContext);
  const [proposal, setProposal] = useState<BeneficiaryProposal>();

  useEffect(() => {
    if (contracts) {
      getProposal(contracts, router.query.id as string).then((res) =>
        setProposal(res),
      );
    }
  }, [contracts]);

  return (
    <ProposalPage
      displayData={proposal as BeneficiaryProposal}
      isProposal={true}
      isTakedown={false}
    />
  );
}
