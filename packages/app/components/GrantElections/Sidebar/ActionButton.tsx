import { useRouter } from 'next/router';
import { ElectionMetadata } from '@popcorn/utils/Contracts';

interface ISidebarActionButton {
  election: ElectionMetadata;
  hasLockedPop: boolean;
  isWalletConnected: boolean;
  connectWallet: () => void;
  submitVotes: Function;
}

export default function SidebarActionButton({
  election,
  hasLockedPop,
  isWalletConnected,
  connectWallet,
  submitVotes,
}: ISidebarActionButton): JSX.Element {
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
}
