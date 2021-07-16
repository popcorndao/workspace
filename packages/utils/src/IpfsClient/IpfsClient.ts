import axios from 'axios';
import { BeneficiaryApplication } from '../';
import { getIpfsHashFromBytes32 } from '../ipfsHashManipulation';

export interface IIpfsClient {
  get: (cid: string) => Promise<BeneficiaryApplication>;
  add: (beneficiaryApplication: BeneficiaryApplication) => Promise<string>;
  upload: (
    file: File,
    setUploadProgress?: (progress: number) => void,
  ) => Promise<string>;
}

export const IpfsClient = (): IIpfsClient => {
  return {
    get: async (cid: string): Promise<BeneficiaryApplication> => {
      const beneficiaryApplication: BeneficiaryApplication = await fetch(
        `${process.env.IPFS_URL}${getIpfsHashFromBytes32(cid)}`,
      ).then((response) => response.json());
      return beneficiaryApplication;
    },

    add: async (
      beneficiaryApplication: BeneficiaryApplication,
    ): Promise<string> => {
      var myHeaders = new Headers();
      myHeaders.append('pinata_api_key', process.env.PINATA_API_KEY);
      myHeaders.append('pinata_secret_api_key', process.env.PINATA_API_SECRET);
      myHeaders.append('Content-Type', 'application/json');
      var raw = JSON.stringify(beneficiaryApplication);
      const cid = await fetch(process.env.IPFS_GATEWAY_PIN, {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      })
        .then((response) => response.text())
        .then((result) => {
          return JSON.parse(result).IpfsHash;
        })
        .catch((error) => {
          console.error(error);
        });
      return cid;
    },

    upload: async (
      file: File,
      setUploadProgress?: (progress: number) => void,
    ): Promise<string> => {
      var data = new FormData();
      data.append('file', file, file.name);
      const headers = {
        'Content-Type': `multipart/form-data;`,
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
      };
      const config = setUploadProgress
        ? {
            headers,
            onUploadProgress: (progressEvent) => {
              var percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadProgress(percentCompleted);
            },
          }
        : {
            headers,
          };
      return await axios
        .post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, config)
        .then((result) => {
          return result.data.IpfsHash;
        })
        .catch((error) => {
          console.log(error);
          return error;
        });
    },
  };
};
