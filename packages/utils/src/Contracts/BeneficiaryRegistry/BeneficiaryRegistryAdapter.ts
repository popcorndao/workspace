import { BeneficiaryRegistry } from '@popcorn/contracts/typechain';
import { BeneficiaryApplication } from '../../';
import { IIpfsClient } from '../../IpfsClient/IpfsClient';

export const BeneficiaryRegistryAdapter = (
  contract: BeneficiaryRegistry,
  IpfsClient: () => IIpfsClient,
) => {
  return {
    getBeneficiaryApplication: async (
      id: string,
    ): Promise<BeneficiaryApplication> => {
      const ipfsHash = await contract.getBeneficiary(id);
      const beneficiaryApplication = await IpfsClient().get(ipfsHash);
      return beneficiaryApplication;
    },
    getAllBeneficiaryApplications: async (): Promise<
      BeneficiaryApplication[]
    > => {
      const beneficiaryAddresses = await contract.getBeneficiaryList();
      const ipfsHashes = await Promise.all(
        beneficiaryAddresses.map(async (address) => {
          return contract.getBeneficiary(address);
        }),
      );
      const beneficiaryData = await (
        await Promise.all(
          ipfsHashes.map(async (cid) => await IpfsClient().get(cid)),
        )
      ).map((beneficiaryApplication) => {
        // TODO: Remove temporary address assignment
        beneficiaryApplication.beneficiaryAddress = beneficiaryAddresses[0];
        return beneficiaryApplication;
      });
      return beneficiaryData;
    },
  };
};
