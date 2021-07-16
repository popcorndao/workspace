import { InjectedConnector } from '@web3-react/injected-connector';
import { NetworkConnector } from '@web3-react/network-connector';

export const networkMap = {
  1: 'mainnet',
  4: 'Rinkeby',
  1337: 'localhost',
  31337: 'localhost',
};

const Injected = new InjectedConnector({
  supportedChainIds: [1, 4, 31337, 1337],
});

const Network = new NetworkConnector({
  urls: {
    [+process.env.CHAIN_ID]: process.env.RPC_URL,
  },
  defaultChainId: +process.env.CHAIN_ID,
});

export const connectors = { Injected, Network };
