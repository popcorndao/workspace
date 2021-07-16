import React from 'react';
import { FormStepProps } from 'pages/proposals/propose';
import ControlledTextInput from './ControlledTextInput';
import inputExists from 'utils/isValidInput';
import ContinueButton from './ContinueButton';

const MissionStatement: React.FC<FormStepProps> = ({
  form,
  navigation,
  visible,
}) => {
  const [formData, setFormData] = form;
  function updateMissionStatement(value: string): void {
    setFormData({ ...formData, missionStatement: value });
  }

  return (
    visible && (
      <div className="mx-auto content-center justify-items-center">
        <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide uppercase">
          {navigation.currentStep} - Please share the organization's mission statement
        </h2>
        <ControlledTextInput
          inputValue={formData?.missionStatement}
          id="missionstatement"
          placeholder="Mission Statement"
          errorMessage="The mission statement cannot be blank."
          updateInput={updateMissionStatement}
          isValid={inputExists}
        />
        {inputExists(formData?.missionStatement) && (
          <ContinueButton navigation={navigation} />
        )}
      </div>
    )
  );
};
export default MissionStatement
