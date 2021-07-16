import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BeneficiaryApplication } from '@popcorn/utils';
import MissionStatement from 'components/Proposals/Form/MissionStatement';
import SocialMedia from 'components/Proposals/Form/SocialMedia';
import NavBar from 'components/NavBar/NavBar';
import AdditionalImages from 'components/Proposals/Form/AdditionalImages';
import BeneficiaryAddress from 'components/Proposals/Form/BeneficiaryAddress';
import HeaderImage from 'components/Proposals/Form/HeaderImage';
import ImpactReportsAudits from 'components/Proposals/Form/ImpactReportsAudits';
import Intro from 'components/Proposals/Form/Intro';
import Name from 'components/Proposals/Form/Name';
import NavigationButtons from 'components/Proposals/Form/NavigationButtons';
import Preview from 'components/Proposals/Form/Preview';
import ProfileImage from 'components/Proposals/Form/ProfileImage';
import ProofOfOwnership from 'components/Proposals/Form/ProofOfOwnership';
import { useRouter } from 'next/router';

export interface Navigation {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  stepLimit: number;
  setStepLimit: React.Dispatch<React.SetStateAction<number>>;
}

export interface FormStepProps {
  form: [
    BeneficiaryApplication,
    React.Dispatch<React.SetStateAction<BeneficiaryApplication>>,
  ];
  navigation: Navigation;
  visible: boolean;
}

export const defaultFormData: BeneficiaryApplication = {
  organizationName: '',
  missionStatement: '',
  beneficiaryAddress: '',
  files: {
    profileImage: '',
    headerImage: '',
    impactReports: [],
    additionalImages: [],
  },
  links: {
    twitterUrl: '',
    linkedinUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    githubUrl: '',
    proofOfOwnership: '',
  },
};

const stepOrder: string[] = [
  'intro',
  'name',
  'beneficiary-address',
  'mission-statement',
  'proof-of-ownership',
  'profile-image',
  'header-image',
  'additional-images',
  'impact-reports-audits',
  'social-media',
  'preview',
];

export default function BeneficiaryProposal(): JSX.Element {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [stepLimit, setStepLimit] = useState<number>(1);
  const [formData, setFormData] =
    useState<BeneficiaryApplication>(defaultFormData);
  const router = useRouter();
  useEffect(() => {
    const formData = localStorage.getItem('beneficiaryNominationProposal');
    const stepLimit = Number(localStorage.getItem('stepLimit'));
    if (formData !== null) setFormData(JSON.parse(formData));
    if (stepLimit !== null) setStepLimit(stepLimit);
  }, []);

  useEffect(() => {
    const stepName = router.query.step as string;
    const stepIndex = stepOrder.indexOf(stepName);
    if (stepName && stepIndex !== -1) {
      if (stepIndex && stepIndex !== currentStep && stepIndex < stepLimit)
        setCurrentStep(stepIndex);
      if (stepIndex && stepIndex !== currentStep && stepIndex >= stepLimit)
        setCurrentStep(stepLimit);
    }
  }, [router]);

  useEffect(() => {
    const stepName = stepOrder[currentStep];
    router.push(`/proposals/propose/?step=${stepName}`, undefined, {
      shallow: true,
    });
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem(
      'beneficiaryNominationProposal',
      JSON.stringify(formData),
    );
  }, [formData]);

  useEffect(() => {
    localStorage.setItem('stepLimit', String(stepLimit));
  }, [stepLimit]);

  const navigation: Navigation = {
    currentStep,
    setCurrentStep,
    stepLimit,
    setStepLimit,
  };
  return (
    <div className="flex flex-col h-screen justify-between">
      <NavBar />
      <Intro
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'intro'}
      />
      <Name
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'name'}
      />
      <BeneficiaryAddress
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'beneficiary-address'}
      />
      <MissionStatement
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'mission-statement'}
      />
      <ProofOfOwnership
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'proof-of-ownership'}
      />
      <ProfileImage
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'profile-image'}
      />
      <HeaderImage
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'header-image'}
      />
      <AdditionalImages
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'additional-images'}
      />
      <ImpactReportsAudits
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'impact-reports-audits'}
      />
      <SocialMedia
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'social-media'}
      />
      <Preview
        form={[formData, setFormData]}
        navigation={navigation}
        visible={stepOrder[currentStep] === 'preview'}
      />
      <NavigationButtons navigation={navigation} />
      <Toaster />
    </div>
  );
}
