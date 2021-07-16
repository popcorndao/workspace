import { ElectionMetadata } from '@popcorn/utils/Contracts';
import { ContractsContext } from '../../context/Web3/contracts';
import { useContext, useEffect, useState } from 'react';
import { Check } from 'react-feather';
import { BeneficiaryApplication } from '@popcorn/utils';

interface GrantFundedProps {
  beneficiary: BeneficiaryApplication;
  election: ElectionMetadata;
  totalVotes: number;
}

export default function GrantFunded({
  election,
  beneficiary,
  totalVotes,
}: GrantFundedProps): JSX.Element {
  const { contracts } = useContext(ContractsContext);
  const [awarded, setAwarded] = useState(false);

  const isBeneficiaryGrantRecipient = async () => {
    const awarded = (
      await contracts.grant.getActiveAwardees(election.electionTerm)
    ).map((a) => a.toLowerCase());
    if (awarded.includes(beneficiary.beneficiaryAddress)) {
      setAwarded(true);
    }
  };

  useEffect(() => {
    if (contracts?.grant) {
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
        <p className="text-gray-700 text-base">{totalVotes || 0} votes</p>
      </div>
    </span>
  );
}
