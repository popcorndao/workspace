import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { DisplayImages, DisplayPDFs } from './DisplayFiles';
import * as Icon from 'react-feather';
import { Navigation } from 'pages/proposals/propose';

const FIVE_MB = 5 * 1000 * 1024;

function imageSizeValidator(file) {
  if (file.size > FIVE_MB) {
    uploadError('File size is greater than 5mb limit');
    return {
      code: 'file-too-large',
      message: `Size is larger than ${FIVE_MB} bytes`,
    };
  }
  return null;
}

const success = () => toast.success('Successful upload to IPFS');
const loading = () => toast.loading('Uploading to IPFS...');
const uploadError = (errMsg: string) => toast.error(errMsg);

export const uploadImageToPinata = (files, setProfileImage) => {
  var myHeaders = new Headers();
  myHeaders.append('pinata_api_key', process.env.PINATA_API_KEY);
  myHeaders.append('pinata_secret_api_key', process.env.PINATA_API_SECRET);
  files.forEach((file) => {
    var formdata = new FormData();
    formdata.append('file', file, 'download.png');
    loading();
    fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: myHeaders,
      body: formdata,
      redirect: 'follow',
    })
      .then((response) => response.text())
      .then((result) => {
        const hash = JSON.parse(result).IpfsHash;
        setProfileImage(hash);
        toast.dismiss();
        success();
      })
      .catch((error) => {
        uploadError('Error uploading to IPFS');
      });
  });
};

function uploadMultipleImagesToPinata(files, localState, setLocalState) {
  toast.dismiss();
  var myHeaders = new Headers();
  myHeaders.append('pinata_api_key', process.env.PINATA_API_KEY);
  myHeaders.append('pinata_secret_api_key', process.env.PINATA_API_SECRET);
  let newImageHashes = [];
  files.forEach((file) => {
    var formdata = new FormData();
    formdata.append('file', file, 'download.png');
    loading();
    fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: myHeaders,
      body: formdata,
      redirect: 'follow',
    })
      .then((response) => response.text())
      .then((result) => {
        const hash = JSON.parse(result).IpfsHash;
        newImageHashes.push(hash);
        setLocalState(newImageHashes);
        toast.dismiss();
        success();
      })
      .catch((error) => {
        uploadError('Error uploading to IPFS');
      });
  });
}

interface IpfsProps {
  stepName: string;
  localState: string | string[];
  setLocalState:
    | React.Dispatch<React.SetStateAction<string>>
    | React.Dispatch<React.SetStateAction<string[]>>;
  imageDescription: string;
  imageInstructions: string;
  fileType: string;
  numMaxFiles: number;
  navigation: Navigation;
}

export default function IpfsUpload({
  stepName,
  localState,
  setLocalState,
  imageDescription,
  imageInstructions,
  fileType,
  numMaxFiles,
  navigation,
}: IpfsProps) {
  const [files, setFiles] = useState([]);
  const {
    acceptedFiles,
    fileRejections,
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    accept: fileType,
    maxFiles: numMaxFiles,
    validator: imageSizeValidator,
    onDrop: (acceptedFiles) => {
      if (fileRejections.length) {
        toast.error(`Maximum number of files to be uploaded is ${numMaxFiles}`);
      } else {
        if (numMaxFiles === 1) {
          uploadImageToPinata(acceptedFiles, setLocalState);
        } else {
          uploadMultipleImagesToPinata(
            acceptedFiles,
            localState,
            setLocalState,
          );
        }
      }

      setFiles(
        acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          }),
        ),
      );
    },
  });

  const rootProps = getRootProps() as any;
  return (
    <div className="mx-auto content-center grid justify-items-stretch">
      <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide uppercase">
        {stepName}
      </h2>
      {!localState || localState.length === 0 ? (
        <div {...rootProps}>
          <input {...getInputProps()} />
          <div className="mt-1 sm:mt-0 sm:col-span-2">
            <div className="max-w-lg flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {fileType === 'image/*' ? (
                  <Icon.Image className="mx-auto h-12 w-12 text-gray-400" />
                ) : (
                  <Icon.FilePlus className="mx-auto h-12 w-12 text-gray-400" />
                )}
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">
                    or drag and drop {imageDescription.toLowerCase()}
                  </p>
                </div>
                <p className="text-xs text-gray-500">{imageInstructions}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div></div>
      )}
      {numMaxFiles === 1 && localState && fileType === 'image/*' ? (
        <DisplayImages
          localState={localState}
          setLocalState={setLocalState}
          navigation={navigation}
        />
      ) : (
        <> </>
      )}
      {numMaxFiles > 1 && localState.length > 0 && fileType === 'image/*' ? (
        <DisplayImages
          localState={localState}
          setLocalState={setLocalState}
          navigation={navigation}
        />
      ) : (
        <> </>
      )}
      {numMaxFiles > 1 && localState.length > 0 && fileType === '.pdf' ? (
        <DisplayPDFs
          localState={localState}
          setLocalState={setLocalState}
          navigation={navigation}
        />
      ) : (
        <> </>
      )}
    </div>
  );
}
