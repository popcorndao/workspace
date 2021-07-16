import { IpfsClient } from '@popcorn/utils';
import ProgressBar from 'components/ProgressBar';
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as Icon from 'react-feather';
import toast from 'react-hot-toast';
import { DisplayVideo } from './DisplayFiles';

const success = () => toast.success('Successful upload to IPFS');
const loading = () => toast.loading('Uploading to IPFS...');
const uploadError = (errMsg: string) => toast.error(errMsg);

export const uploadSingleFile = async (
  files: File[],
  setVideo: (input: string | string[]) => void,
  setUploadProgress?: (progress: number) => void,
) => {
  loading();
  const hash = await IpfsClient().upload(files[0], setUploadProgress);
  setVideo(hash);
  toast.dismiss();
  success();
};

async function uploadMultipleFiles(
  files: File[],
  setLocalState: (input: string[]) => void,
) {
  loading();
  const IpfsHashes = await Promise.all(
    files.map((file) => {
      return IpfsClient().upload(file);
    }),
  );
  setLocalState(IpfsHashes);
  toast.dismiss();
  success();
}

interface IpfsProps {
  stepName: string;
  localState: string | string[];
  fileDescription: string;
  fileInstructions: string;
  fileType: string;
  maxFileSizeMB?: number;
  numMaxFiles: number;
  setLocalState: (input: string | string[]) => void;
}

const isValidFileSize = (file: File, maxFileSizeMB: number) => {
  const maxFileSizeBytes = maxFileSizeMB * 1000 * 1024;
  if (file.size > maxFileSizeBytes) {
    uploadError(`File size is greater than ${maxFileSizeMB}mb limit`);
    return {
      code: 'file-too-large',
      message: `File is larger than ${maxFileSizeMB} MB`,
    };
  }
  return null;
};

const videoUploading = (uploadProgress: number, fileType: string): boolean => {
  return uploadProgress > 0 && uploadProgress < 100 && fileType === 'video/*';
};

export default function IpfsUpload({
  stepName,
  localState,
  fileDescription,
  fileInstructions,
  fileType,
  numMaxFiles,
  maxFileSizeMB,
  setLocalState,
}: IpfsProps) {
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
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
    validator: (file: File) => {
      return maxFileSizeMB ? isValidFileSize(file, maxFileSizeMB) : null;
    },
    onDrop: (acceptedFiles) => {
      if (fileRejections.length) {
        toast.error(`Maximum number of files to be uploaded is ${numMaxFiles}`);
      } else {
        if (numMaxFiles === 1 && fileType === 'image/*') {
          uploadSingleFile(acceptedFiles, setLocalState);
        } else if (fileType === 'video/*') {
          uploadSingleFile(acceptedFiles, setLocalState, setUploadProgress);
        } else {
          uploadMultipleFiles(acceptedFiles, setLocalState);
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
    <div className="mx-auto">
      <h2 className="text-center text-base text-indigo-600 font-semibold tracking-wide">
        {stepName}
      </h2>
      {(!localState || localState.length === 0) &&
      !videoUploading(uploadProgress, fileType) ? (
        <div {...rootProps}>
          <input {...getInputProps()} />
          <button
            type="button"
            className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {fileType === 'image/*' ? (
              <Icon.Image className="mx-auto h-12 w-12 text-gray-400" />
            ) : (
              <Icon.FilePlus className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <span className="mt-2 block">
              <div className="flex">
                <label
                  htmlFor="file-upload"
                  className="pl-1 mt-2 block text-sm font-medium text-indigo-500"
                >
                  <span>Upload</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                  />{' '}
                </label>
                <p className="pl-1 mt-2 block text-sm font-medium text-gray-900">
                  or drag and drop {fileDescription.toLowerCase()}
                </p>
              </div>
            </span>
          </button>
          <div className="mt-1 text-center">
            <p className="text-xs text-gray-500">{fileInstructions}</p>
          </div>
        </div>
      ) : (
        <></>
      )}
      {videoUploading(uploadProgress, fileType) && (
        <div className="grid my-2 justify-items-stretch">
          <span className="mx-4  w-1/2 justify-self-center flex flex-row justify-between  pb-2">
            <ProgressBar
              progress={uploadProgress}
              progressColor={'bg-green-300'}
            />
          </span>
        </div>
      )}
      {localState && fileType === 'video/*' ? (
        <DisplayVideo localState={localState} />
      ) : (
        <> </>
      )}
    </div>
  );
}
