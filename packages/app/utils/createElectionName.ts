import { ElectionMetadata } from '@popcorn/utils/Contracts';

export default function createElectionName(election: ElectionMetadata): string {
  const grantTerm = ['Monthly', 'Quarterly', 'Yearly'];
  const startDate = new Date(Number(election.startTime) * 1000);
  return `${grantTerm[election.electionTerm]} Grant`;
}
