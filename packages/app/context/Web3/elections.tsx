import { Contract } from '@ethersproject/contracts';
import React, { useContext, useEffect } from 'react';
import { createContext, useState } from 'react';

import { ContractsContext } from './contracts';
import { GrantElections } from '@popcorn/contracts/typechain';
import {
  ElectionMetadata,
  GrantElectionAdapter,
} from '@popcorn/utils/Contracts';

interface ElectionsContext {
  elections: ElectionMetadata[];
  refresh: Function;
}

export const ElectionsContext = createContext<ElectionsContext>(null);

interface ElectionsProviderProps {
  children: React.ReactNode;
}

export function ElectionsProvider({
  children,
}: ElectionsProviderProps): React.ReactElement {
  const { contracts } = useContext(ContractsContext);
  const [elections, setElections] = useState<ElectionMetadata[]>([]);
  const [shouldRefresh, refresh] = useState(false);

  async function getElectionMetadata(electionsContract: GrantElections) {
    setElections(
      await Promise.all(
        [0, 1, 2].map(
          async (term) =>
            await GrantElectionAdapter(electionsContract).getElectionMetadata(
              term,
            ),
        ),
      ),
    );
  }

  useEffect(() => {
    if (contracts?.election || shouldRefresh) {
      getElectionMetadata(contracts.election);
      refresh(false);
    }
  }, [contracts, shouldRefresh]);

  return (
    <ElectionsContext.Provider
      value={{
        elections: [...elections],
        refresh: () => refresh(true),
      }}
    >
      {children}
    </ElectionsContext.Provider>
  );
}

export default ElectionsProvider;
