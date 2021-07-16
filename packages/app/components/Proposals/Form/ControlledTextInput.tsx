import { CheckIcon, ExclamationCircleIcon } from '@heroicons/react/outline';
import { Navigation } from 'pages/proposals/propose';


interface ControlledTextInputProps {
  inputValue: string;
  id: string;
  placeholder: string;
  errorMessage: string;
  updateInput: (value: string) => void;
  isValid: (input: string) => boolean;
  navigation: Navigation;
}

export default function ControlledTextInput({
  inputValue,
  id,
  placeholder,
  errorMessage,
  updateInput,
  isValid,
  navigation,
}: ControlledTextInputProps): JSX.Element {
  const { currentStep, setCurrentStep, setStepLimit } = navigation;
  return (
    <>
      <div className="mt-1 relative rounded-md shadow-sm">
        <input
          type="text"
          name={id}
          id={id}
          value={inputValue}
          onChange={(e) => updateInput(e.target.value)}
          className={`block w-full shadow-sm sm:text-sm rounded-md ${
            isValid(inputValue)
              ? 'focus:ring-indigo-500 focus:border-indigo-500 border-gray-300'
              : 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
          } `}
          placeholder={placeholder}
        />
        {!isValid(inputValue) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      {isValid(inputValue) ? (
        <div className="grid justify-items-stretch">
          <button
            onClick={() => {
              setStepLimit(currentStep + 1);
              setCurrentStep(currentStep + 1);
            }}
            className=" justify-self-center mt-4 inline-flex px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            OK
            <CheckIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-red-600" id="email-error">
          {errorMessage}
        </p>
      )}
    </>
  );
}
