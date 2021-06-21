import ImageHeader from 'components/CommonComponents/ImageHeader';
import ImpactReportLinks from 'components/CommonComponents/ImpactReportLinks';
import MissionStatement from 'components/CommonComponents/MissionStatement';
import PhotoSideBar from 'components/CommonComponents/PhotoSideBar';
import SocialMedia from 'components/CommonComponents/SocialMedia';
import TriggerTakedownProposal from 'components/CommonComponents/TriggerTakedownProposal';
import Verification from 'components/CommonComponents/Verification';
import NavBar from 'components/NavBar/NavBar';
import { Beneficiary } from 'interfaces/beneficiaries';
import { BeneficiaryProposal } from 'interfaces/proposals';
import Voting from './Voting/Voting';

interface BeneficiaryPageProps {
  displayData: Beneficiary | BeneficiaryProposal;
  isTakedown?: boolean;
}

export default function ProposalPage({
  displayData,
  isTakedown = false,
}: BeneficiaryPageProps): JSX.Element {
  return (
    <div className="flex flex-col h-full w-full pb-16 ">
      <NavBar />
      <ImageHeader {...displayData} />
      <Voting
        displayData={displayData as BeneficiaryProposal}
        isTakedown={isTakedown}
      />
      <div className="grid grid-cols-8 gap-4 space-x-12 mx-48 my-8">
        <PhotoSideBar {...(displayData as BeneficiaryProposal)} />
        <MissionStatement missionStatement={displayData?.missionStatement} />
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-300" />
        </div>
      </div>
      <div className="mx-48 my-8">
        <Verification {...(displayData as BeneficiaryProposal)} />
        <ImpactReportLinks {...displayData} />
        <SocialMedia {...displayData} />
      </div>
    </div>
  );
}