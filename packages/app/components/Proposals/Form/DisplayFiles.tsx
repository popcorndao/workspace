import { DocumentReportIcon } from '@heroicons/react/outline';

interface DisplayFilesProps {
  localState: string | string[];
}

export const DisplayImages: React.FC<DisplayFilesProps> = ({
  localState,
}): JSX.Element => {
  return (
    <div className="grid justify-items-stretch">
      <p className="my-4 max-w-3xl mx-auto text-center text-xl text-gray-500 w-1/3 justify-self-center">
        Image Preview
      </p>
      {Array.isArray(localState) ? (
        <div className="flex flex-row justify-evenly my-4 mx-16">
          {localState.map((imgHash) => {
            return (
              <div key={imgHash}>
                <img
                    src={
                        imgHash.length > 0 &&
                        'https://gateway.pinata.cloud/ipfs/' + imgHash
                    }
                    />
              </div>
            );
          })}
        </div>
      ) : (
        <img
            className="w-1/4 justify-self-center"
            src={
                localState.length > 0 &&
                'https://gateway.pinata.cloud/ipfs/' + localState
            }
            />
      )}
    </div>
  );
};

export const DisplayVideo: React.FC<DisplayFilesProps> = ({
  localState,
}): JSX.Element => {
  return (
    localState !== '' && (
      <div className="grid justify-items-stretch">
        <p className="my-4 max-w-3xl mx-auto text-center text-xl text-gray-500 w-1/3 justify-self-center">
          Video Preview
        </p>
        <video className="w-1/4 justify-self-center" controls>
          <source
            src={'https://gateway.pinata.cloud/ipfs/' + localState}
            type="video/mp4"
          />
          Sorry, your browser doesn't support embedded videos.
        </video>
      </div>
    )
  );
};

export const DisplayPDFs: React.FC<DisplayFilesProps> = ({
  localState,
}): JSX.Element => {
  return (
    <>
      <p className="my-4 max-w-3xl mx-auto text-center text-xl text-gray-500 w-1/3 justify-self-center">
        {localState.length ? 'Document Preview' : ''}
      </p>
      {Array.isArray(localState) ? (
        <div>
          {localState.map((IpfsHash, i) => {
            return (
              <div key={IpfsHash} className="flex flex-row items-center">
                <a
                  className="mx-2 justify-self-center mt-4 inline-flex px-4 py-1"
                  href={'https://gateway.pinata.cloud/ipfs/' + IpfsHash}
                >
                  {'Impact Report/Audit ' + i + ': '}
                  <DocumentReportIcon className="inline ml-2 h-5 w-5" />
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <p>None</p>
        </div>
      )}
    </>
  );
};
