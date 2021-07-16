// Displays a beneficiary or a preview of a proposal

import { BeneficiaryApplication } from '@popcorn/utils';
import BeneficiaryInformation from 'components/CommonComponents/BeneficiaryInformation';
import NavBar from 'components/NavBar/NavBar';
import ImageHeader from '../CommonComponents/ImageHeader';
import PhotoSideBar from '../CommonComponents/PhotoSideBar';
import TriggerTakedownProposal from '../CommonComponents/TriggerTakedownProposal';

interface BeneficiaryPageProps {
  beneficiary: BeneficiaryApplication;
  isProposalPreview?: boolean;
}

export default function BeneficiaryPage({
  beneficiary,
  isProposalPreview = false,
}: BeneficiaryPageProps): JSX.Element {
  return (
    <div className="relative">
      {!isProposalPreview && <NavBar />}
      <ImageHeader beneficiary={beneficiary} />
      <div className="grid grid-cols-8 gap-4 space-x-12 mx-auto px-8">
        <PhotoSideBar {...beneficiary} />
        <BeneficiaryInformation {...beneficiary} />
      </div>
      {!isProposalPreview && <TriggerTakedownProposal />}
    </div>
  );
}
