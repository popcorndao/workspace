import { ProposalType } from '@popcorn/utils';
import ProposalGrid from 'components/Proposals/ProposalGrid';

export default function TakedownPage(): JSX.Element {
  return <ProposalGrid proposalType={ProposalType.Nomination} />;
}
