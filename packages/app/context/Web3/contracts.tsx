import { Web3Provider } from '@ethersproject/providers';
import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core';
import React, { useContext, useEffect } from 'react';
import { createContext, useState } from 'react';
import { connectors, networkMap } from './connectors';
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected,
} from '@web3-react/injected-connector';
import { store } from '../store';
import { setSingleActionModal } from '../actions';

import {
  GrantElections,
  GrantElections__factory,
  GrantRegistry,
  GrantRegistry__factory,
  Staking,
  Staking__factory,
  BeneficiaryRegistry,
  BeneficiaryRegistry__factory,
  ERC20,
  ERC20__factory,
  BeneficiaryGovernance,
  BeneficiaryGovernance__factory,
} from '@popcorn/contracts/typechain';

export interface Contracts {
  staking: Staking;
  beneficiary: BeneficiaryRegistry;
  election: GrantElections;
  pop: ERC20;
  grant: GrantRegistry;
  beneficiaryGovernance: BeneficiaryGovernance;
}

interface ContractsContext {
  contracts: Contracts;
  setContracts: React.Dispatch<Contracts>;
}

export const ContractsContext = createContext<ContractsContext>(null);

interface ContractsWrapperProps {
  children: React.ReactNode;
}

function getErrorMessage(error: Error) {
  if (error instanceof NoEthereumProviderError) {
    return 'No Ethereum browser extension detected, install MetaMask on desktop or visit from a dApp browser on mobile.';
  } else if (error instanceof UnsupportedChainIdError) {
    return `You're connected to an unsupported network. Please connect to ${
      networkMap[Number(process.env.CHAIN_ID)]
    }.`;
  } else if (error instanceof UserRejectedRequestErrorInjected) {
    return 'Please authorize this website to access your Ethereum account.';
  } else {
    console.error(error);
    return 'An unknown error occurred. Check the console for more details.';
  }
}

export default function ContractsWrapper({
  children,
}: ContractsWrapperProps): JSX.Element {
  const context = useWeb3React<Web3Provider>();
  const {
    connector,
    library,
    chainId,
    account,
    activate,
    deactivate,
    active,
    error,
  } = context;
  const [contracts, setContracts] = useState<Contracts>();
  const { dispatch } = useContext(store);

  useEffect(() => {
    if (!active) {
      activate(connectors.Network);
    }
  }, [active]);

  useEffect(() => {
    if (error) {
      dispatch(
        setSingleActionModal({
          content: getErrorMessage(error),
          title: 'Wallet Error',
          visible: true,
          type: 'error',
          onConfirm: {
            label: 'Close',
            onClick: () => dispatch(setSingleActionModal(false)),
          },
        }),
      );
    }
  }, [error]);

  useEffect(() => {
    if (!library) {
      return;
    }
    setContracts({
      staking: Staking__factory.connect(process.env.ADDR_STAKING, library),
      beneficiary: BeneficiaryRegistry__factory.connect(
        process.env.ADDR_BENEFICIARY_REGISTRY,
        library,
      ),
      election: GrantElections__factory.connect(
        process.env.ADDR_GRANT_ELECTION,
        library,
      ),
      pop: ERC20__factory.connect(process.env.ADDR_POP, library),
      grant: GrantRegistry__factory.connect(
        process.env.ADDR_GRANT_REGISTRY,
        library,
      ),
      beneficiaryGovernance: BeneficiaryGovernance__factory.connect(
        process.env.ADDR_BENEFICIARY_GOVERNANCE,
        library,
      ),
    });
  }, [library, active]);

  return (
    <ContractsContext.Provider
      value={{
        contracts,
        setContracts,
      }}
    >
      {children}
    </ContractsContext.Provider>
  );
}
