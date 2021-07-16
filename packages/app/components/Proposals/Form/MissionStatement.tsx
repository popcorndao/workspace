import { ExclamationCircleIcon } from '@heroicons/react/outline';
import { FormStepProps } from 'pages/proposals/propose';
import React, { useState } from 'react';
import inputExists from 'utils/isValidInput';
import ContinueButton from './ContinueButton';

export default function MissionStatement({
  form,
  navigation,
  visible,
}: FormStepProps): JSX.Element {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [formData, setFormData] = form;
  return (
    visible && (
      <div className="mx-auto content-center justify-items-center">
        <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide ">
          {navigation.currentStep} - Please share the organization's mission
          statement
        </h2>
        <div className="mt-1 relative rounded-md shadow-sm">
          <textarea
            name="missionstatement"
            id="missionstatement"
            rows={10}
            value={formData?.missionStatement}
            onChange={(event) => {
              if (!isDirty) setIsDirty(true);
              setFormData({
                ...formData,
                missionStatement: event.target.value,
              });
            }}
            className={
              formData?.missionStatement || !isDirty
                ? 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md'
                : 'block w-full pr-10 border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md'
            }
            placeholder="Mission Statement"
          />
          {!inputExists(formData?.missionStatement) && isDirty && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ExclamationCircleIcon
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {inputExists(formData?.missionStatement) && (
          <ContinueButton {...navigation} />
        )}
      </div>
    )
  );
}
