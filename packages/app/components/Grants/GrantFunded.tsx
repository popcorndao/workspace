import { BeneficiaryApplication } from '@popcorn/utils';
import { useContext, useEffect, useState } from 'react';
import { Check } from 'react-feather';
import { ContractsContext } from '../../context/Web3/contracts';
import { ElectionProps } from './BeneficiaryCardWithElectionData';

interface GrantFundedProps {
  beneficiary: BeneficiaryApplication;
  electionProps: ElectionProps;
}

const GrantFunded: React.FC<GrantFundedProps> = ({
  beneficiary,
  electionProps,
}) => {
  const { contracts } = useContext(ContractsContext);
  const [awarded, setAwarded] = useState(false);

  const isBeneficiaryGrantRecipient = async () => {
    const awarded = (
      await contracts.grant.getActiveAwardees(
        electionProps.election.electionTerm,
      )
    ).map((a) => a.toLowerCase());
    if (awarded.includes(beneficiary.beneficiaryAddress)) {
      setAwarded(true);
    }
  };

  useEffect(() => {
    if (contracts?.grant) {
      // FIXME: Promise being ignored
      isBeneficiaryGrantRecipient();
    }
  }, [contracts]);

  return (
    <span className="flex flex-row">
      {awarded && (
        <div className="h-12 w-12 mr-2 rounded-full border-4 border-green-400 flex items-center justify-center flex-shrink-0">
          <Check size={38} className="text-green-400" />
        </div>
      )}
      <div>
        {awarded && <p className="text-lg text-gray-700 font-bold">Awarded</p>}
        <p className="text-gray-700 text-base">
          {electionProps.totalVotes || 0} votes
        </p>
      </div>
    </span>
  );
};
export default GrantFunded
