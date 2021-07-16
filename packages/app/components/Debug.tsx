import { store } from '../context/store';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';
import { setDualActionWideModal } from '../context/actions';
export function Debug() {
  const { dispatch } = useContext(store);
  const router = useRouter();
  useEffect(() => {
    if (router?.query?.showDebug) {
      const envVars = {
        CHAIN_ID: process.env.CHAIN_ID,
        ADDR_STAKING: process.env.ADDR_STAKING,
        ADDR_POP: process.env.ADDR_POP,
        ADDR_GRANT_REGISTRY: process.env.ADDR_GRANT_REGISTRY,
        ADDR_BENEFICIARY_REGISTRY: process.env.ADDR_BENEFICIARY_REGISTRY,
        ADDR_GRANT_ELECTION: process.env.ADDR_GRANT_ELECTION,
        ADDR_PRIVATE_SALE: process.env.ADDR_PRIVATE_SALE,
        ADDR_USDC: process.env.ADDR_USDC,
        ADDR_TREASURY: process.env.ADDR_TREASURY,
      };
      console.log('env vars', envVars);
      setTimeout(() => {
        dispatch(
          setDualActionWideModal({
            title: 'Debug Info',
            content: JSON.stringify(envVars),
            onConfirm: {
              label: 'Close',
              onClick: () => dispatch(setDualActionWideModal(false)),
            },
          }),
        );
      }, 2000);
    }
  }, [router]);
  return <></>;
}
