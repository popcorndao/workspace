import { ExclamationCircleIcon } from '@heroicons/react/outline';
import { useState } from 'react';

interface ControlledTextInputProps {
  inputValue: string;
  id: string;
  placeholder: string;
  errorMessage: string;
  isValid: (input: string) => boolean;
  updateInput: (value: string, index?: number) => void;
  inputIndex?: number;
}

export default function ControlledTextInput({
  inputValue,
  id,
  placeholder,
  errorMessage,
  isValid,
  updateInput,
  inputIndex,
}: ControlledTextInputProps): JSX.Element {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  return (
    <>
      <div className="mt-1 relative rounded-md shadow-sm">
        <input
          type="text"
          name={id}
          id={id}
          value={inputValue}
          onChange={(e) => {
            if (!isDirty) setIsDirty(true);
            inputIndex == undefined
              ? updateInput(e.target.value)
              : updateInput(e.target.value, inputIndex);
          }}
          className={`block w-full shadow-sm sm:text-sm rounded-md ${
            isValid(inputValue) || !isDirty
              ? 'focus:ring-indigo-500 focus:border-indigo-500 border-gray-300'
              : 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
          } `}
          placeholder={placeholder}
        />
        {!isValid(inputValue) && isDirty && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {!isValid(inputValue) && isDirty && (
        <p className="mt-2 text-sm text-red-600" id="email-error">
          {errorMessage}
        </p>
      )}
    </>
  );
}
