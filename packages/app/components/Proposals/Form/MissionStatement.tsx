import React from 'react';
import { FormStepProps } from 'pages/proposals/propose';
import ControlledTextInput from './ControlledTextInput';

export default function MissionStatement({
  form,
  navigation,
  visible,
}: FormStepProps): JSX.Element {
  const [formData, setFormData] = form;
  function updateMissionStatement(value: string): void {
    setFormData({ ...formData, missionStatement: value });
  }

  function isValid(missionStatement: string): boolean {
    return missionStatement.length > 0;
  }

  return (
    visible && (
      <div className="mx-auto content-center justify-items-center">
        <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide uppercase">
          3 - Please share the beneficiary's mission statement
        </h2>
        <ControlledTextInput
          inputValue={formData.missionStatement}
          id="missionstatement"
          placeholder="Mission Statement"
          errorMessage="The mission statement cannot be blank."
          updateInput={updateMissionStatement}
          isValid={isValid}
          navigation={navigation}
        />
      </div>
    )
  );
}
