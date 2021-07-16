import { useRouter } from 'next/router';
import { ElectionMetadata } from '@popcorn/utils/Contracts';
import React from "react";

interface SidebarActionButtonProps {
  election: ElectionMetadata;
  hasLockedPop: boolean;
  isWalletConnected: boolean;
  connectWallet: () => void;
  submitVotes: Function;
}

const SidebarActionButton: React.FC<SidebarActionButtonProps> = ({
  election,
  hasLockedPop,
  isWalletConnected,
  connectWallet,
  submitVotes,
}) => {
  const router = useRouter();

  if (!isWalletConnected) {
    return (
      <button className="button button-primary w-full" onClick={connectWallet}>
        Connect Wallet to Vote
      </button>
    );
  }
  if (hasLockedPop) {
    return (
      <button
        className="button button-primary w-full"
        onClick={() => submitVotes(election.electionTerm)}
      >
        Vote
      </button>
    );
  } else {
    return (
      <button
        className="button button-primary w-full"
        onClick={() => router.push('/staking')}
      >
        Lock POP to Vote
      </button>
    );
  }
};
export default SidebarActionButton
