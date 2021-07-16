import { CheckIcon, XIcon } from '@heroicons/react/solid';
import { DocumentReportIcon } from '@heroicons/react/outline';
import { Navigation } from 'pages/proposals/propose';

interface DisplayFilesProps {
  localState: string | string[];
  setLocalState:
    | React.Dispatch<React.SetStateAction<string>>
    | React.Dispatch<React.SetStateAction<string[]>>;
  navigation: Navigation;
}

function ActionButtons({ setLocalState, navigation }): JSX.Element {
  const { setCurrentStep, currentStep, setStepLimit } = navigation;
  return (
    <div className="row-auto my-2 justify-self-center">
      <button
        onClick={() => setLocalState([])}
        className="mx-2 justify-self-center mt-4 inline-flex px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Remove
        <XIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
      </button>
      <button
        onClick={() => {
          setStepLimit(currentStep + 1);
          setCurrentStep(currentStep + 1);
        }}
        className="mx-2 justify-self-center mt-4 inline-flex px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        OK
        <CheckIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export const DisplayImages: React.FC<DisplayFilesProps> = ({
  localState,
  setLocalState,
  navigation,
}): JSX.Element => {
  return (
    <div className="grid justify-items-stretch">
      <p className="my-4 max-w-3xl mx-auto text-center text-xl text-gray-500 w-1/3 justify-self-center">
        Image Preview
      </p>
      {Array.isArray(localState) ? (
        <div className="my-4 grid grid-cols-4 gap-8 mx-16">
          {localState.map((imgHash) => {
            return (
              <div key={imgHash}>
                <img src={'https://gateway.pinata.cloud/ipfs/' + imgHash}></img>
              </div>
            );
          })}
        </div>
      ) : (
        <img
          className="w-1/4 justify-self-center"
          src={'https://gateway.pinata.cloud/ipfs/' + localState}
        ></img>
      )}
      <ActionButtons setLocalState={setLocalState} navigation={navigation} />
    </div>
  );
};

export const DisplayPDFs: React.FC<DisplayFilesProps> = ({
  localState,
  setLocalState,
  navigation,
}): JSX.Element => {
  return (
    <div className="grid justify-items-stretch">
      <p className="my-4 max-w-3xl mx-auto text-center text-xl text-gray-500 w-1/3 justify-self-center">
        {localState.length ? 'Document Preview' : ''}
      </p>
      {Array.isArray(localState) ? (
        <div>
          {localState.map((IpfsHash, i) => {
            return (
              <div key={IpfsHash} className="row-auto justify-self-center">
                <a
                  className="mx-2 justify-self-center mt-4 inline-flex px-4 py-1"
                  href={'https://gateway.pinata.cloud/ipfs/' + IpfsHash}
                >
                  {'Impact Report/Audit ' + i + ': '}
                  <DocumentReportIcon className="ml-2 h-5 w-5" />
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
      <ActionButtons setLocalState={setLocalState} navigation={navigation} />
    </div>
  );
};
