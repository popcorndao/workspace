// Displays a beneficiary or a preview of a proposal

import { BeneficiaryApplication } from '@popcorn/utils';
import BeneficiaryInformation from 'components/CommonComponents/BeneficiaryInformation';
import ImageHeader from 'components/CommonComponents/ImageHeader';
import VideoSideBar from 'components/CommonComponents/VideoSideBar';
import NavBar from 'components/NavBar/NavBar';
import PhotoSideBar from '../CommonComponents/PhotoSideBar';
import TriggerTakedownProposal from '../CommonComponents/TriggerTakedownProposal';

export interface BeneficiaryPageProps {
  beneficiary: BeneficiaryApplication;
  isProposalPreview?: boolean;
}

const BeneficiaryPage: React.FC<BeneficiaryPageProps> = ({
  beneficiary,
  isProposalPreview = false,
}: BeneficiaryPageProps): JSX.Element => {
    return(
        <div className="relative">
            {!isProposalPreview && <NavBar/>}
            <ImageHeader beneficiary={beneficiary}/>
            <div className="grid grid-cols-8 gap-4 space-x-12 mx-auto px-8">
                <div className="col-span-2 space-y-4">
                    <VideoSideBar {...beneficiary} />
                    <PhotoSideBar {...beneficiary} />
                </div>
                <BeneficiaryInformation beneficiary={beneficiary} />
            </div>
            {!isProposalPreview && <TriggerTakedownProposal/>}
        </div>
    );
};
export default BeneficiaryPage
