module.exports = {
  GrantElectionAdapter: (contract) => {
    return {
      electionDefaults: async (electionId) => {
        const response = await contract.electionDefaults(electionId);
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
        }
      },

      getElectionMetadata: async (electionId) => {
        /**
        * returns a nice object like:
        * {
          electionTerm: GRANT_TERM.QUARTER,
          registeredBeneficiaries: [],
          electionState: ElectionState.Registration,
          configuration: {
            awardees: 2,
            ranking: 5
          },
          useChainlinkVRF: true,
          periods: {
            cooldownPeriod: 83 * 86400, // 83 days
            registrationPeriod: 14 * 86400, // 14 days
            votingPeriod: 14 * 86400, // 14 days
          },
          startTime: 1625097601,
        }
       */
        const mapping = [
          ["votes", (value) => value.reduce(
              (votes, v, i) => [...votes, {
                  voter: v[0],
                  beneficiary: v[1],
                  weight: v[2],
                }],
              [],
            )
          ],
          ["electionTerm", (value) => value],
          ["registeredBeneficiaries", (value) => value],
          ["electionState", (value) => value],
          [
            "configuration",
            (value) => ({ awardees: value[0], ranking: value[1] }),
          ],
          ["useChainlinkVRF", (value) => value],
          [
            "periods",
            (value) => ({
              cooldownPeriod: Number(value[0].toString()),
              registrationPeriod: Number(value[1].toString()),
              votingPeriod: Number(value[2].toString()),
            }),
          ],
          ["startTime", (value) => Number(value.toString())],
          [
            'bondRequirements',
            (value) => ({ required: value[0], amount: value[1] }),
          ],
          ['shareType', (value) => value],
          ['randomNumber', (value) => Number(value.toString())],
        ];
        return (await contract.getElectionMetadata(electionId)).reduce(
          (metadata, value, i) => {
            metadata[mapping[i][0]] = mapping[i][1](value);
            return metadata;
          },
          {}
        );
      },
    };
  },
};
