import { BigNumber } from '@ethersproject/bignumber';

export enum ElectionTerm {
  Monthly,
  Quarterly,
  Yearly,
}
export enum ElectionState {
  Registration,
  Voting,
  Closed,
  FinalizationProposed,
  Finalized,
}

export enum ShareType {
  EqualWeight,
  DynamicWeight,
}

interface Vote {
  voter: string;
  beneficiary: string;
  weight: BigNumber;
}

export const ElectionTermIntToName = {
  0: 'monthly',
  1: 'quarterly',
  2: 'yearly',
};

type ElectionStateString = 'registration' | 'voting' | 'closed' | 'finalized';
interface ElectionStateMap {
  [key: number]: ElectionStateString;
}
const ElectionStateIntToName: ElectionStateMap = {
  0: 'registration',
  1: 'voting',
  2: 'closed',
  3: 'finalized',
};

export interface BondRequirements{
  required: boolean;
  amount: BigNumber;
}

export interface ElectionMetadata {
  votes: Vote[];
  electionTerm: ElectionTerm;
  registeredBeneficiaries: string[];
  electionState: ElectionState;
  electionStateStringShort: ElectionStateString;
  electionStateStringLong: string;
  configuration: {
    awardees: number;
    ranking: number;
  };
  useChainlinkVRF: boolean;
  periods: {
    cooldownPeriod: number;
    registrationPeriod: number;
    votingPeriod: number;
  };
  startTime: number;
  bondRequirements:BondRequirements;
  shareType: ShareType;
  randomNumber: number;
}

export type ElectionPeriod = 'voting' | 'registration' | 'closed' | 'finalized';

export const GrantElectionAdapter = function (contract?) {
  return {
    electionDefaults: async function (grantTerm) {
      const response = await contract.electionDefaults(grantTerm);
      return {
        useChainLinkVRF: response.useChainLinkVRF,
        ranking: response.ranking,
        awardees: response.awardees,
        registrationPeriod: Number(response.registrationPeriod.toString()),
        votingPeriod: Number(response.votingPeriod.toString()),
        cooldownPeriod: Number(response.cooldownPeriod.toString()),
        registrationBondRequired: response.bondRequirements.required,
        registrationBond: response.bondRequirements.amount,
        finalizationIncentive:response.finalizationIncentive,
        enabled:response.enabled,
        shareType:response.shareType
      };
    },

    getElectionStateStringLong: function (state: ElectionState): string {
      switch (ElectionStateIntToName[state]) {
        case 'registration':
          return 'open for registration';
        case 'voting':
          return 'open for voting';
        case 'closed':
        case 'finalized':
          return 'closed';
        default:
          return '';
      }
    },

    getElectionMetadata: async function (grantTerm): Promise<ElectionMetadata> {
      const mapping = [
        [
          'votes',
          (value) =>
            value.reduce(
              (votes, v, i) => [
                ...votes,
                {
                  voter: v[0],
                  beneficiary: v[1],
                  weight: v[2],
                },
              ],
              [],
            ),
        ],
        ['electionTerm', (value) => value],
        ['registeredBeneficiaries', (value) => value],
        ['electionState', (value) => value],
        [
          'configuration',
          (value) => ({ awardees: value[0], ranking: value[1] }),
        ],
        ['useChainlinkVRF', (value) => value],
        [
          'periods',
          (value) => ({
            cooldownPeriod: Number(value[0].toString()),
            registrationPeriod: Number(value[1].toString()),
            votingPeriod: Number(value[2].toString()),
          }),
        ],
        ['startTime', (value) => Number(value.toString())],
        [
          'bondRequirements',
          (value) => ({ required: value[0], amount: value[1] }),
        ],
        ['shareType', (value) => value],
        ['randomNumber', (value) => Number(value.toString())],
      ];
      const metadata = (await contract.getElectionMetadata(grantTerm)).reduce(
        (metadata, value, i) => {
          metadata[mapping[i][0] as string] = (mapping[i][1] as any)(value);
          return metadata;
        },
        {},
      ) as ElectionMetadata;
      metadata.electionStateStringShort =
        ElectionStateIntToName[metadata.electionState];
      metadata.electionStateStringLong = this.getElectionStateStringLong(
        metadata.electionState,
      );
      return metadata;
    },
    isActive: function (election: ElectionMetadata): boolean {
      return [ElectionState.Registration, ElectionState.Voting].includes(
        election.electionState,
      );
    },
  };
};
export default GrantElectionAdapter;
