import { BigNumber } from 'ethers';

export enum Status {
  Open,
  Challenge,
  Completed,
  Passed,
  Failed,
  All,
}

export enum ProposalType {
  Nomination,
  Takedown,
}

export interface BeneficiaryImage {
  image: string;
  description: string;
}

export interface BeneficiaryApplication {
  organizationName: string;
  projectName?: string;
  missionStatement: string;
  beneficiaryAddress: string;
  files: {
    profileImage: BeneficiaryImage;
    headerImage?: BeneficiaryImage;
    impactReports?: string[];
    additionalImages?: BeneficiaryImage[];
    video: string;
  };
  links: {
    twitterUrl?: string;
    linkedinUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    githubUrl?: string;
    proofOfOwnership?: string;
    contactEmail: string;
    website: string;
  };
  version: string;
}

export interface Proposal {
  application: BeneficiaryApplication;
  id: string;
  status: Status;
  stageDeadline: Date;
  proposalType: ProposalType;
  votes: {
    for: BigNumber;
    against: BigNumber;
  };
}
