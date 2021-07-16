import { FormStepProps } from 'pages/proposals/propose';
import React from 'react';
import inputExists from 'utils/isValidInput';
import ContinueButton from './ContinueButton';
import ControlledTextInput from './ControlledTextInput';

const Website: React.FC<FormStepProps> = ({
  form,
  navigation,
  visible,
}) => {
  const [formData, setFormData] = form;

  function isValid(website): boolean {
    return website.length > 0;
  }
  function updateWebsite(value: string): void {
    setFormData({ ...formData, links: { ...formData.links, website: value } });
  }

  return (
    visible && (
      <div className="mx-auto content-center justify-items-center">
        <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide uppercase">
          {navigation.currentStep + 1} - What is the name of your website?
        </h2>
        <ControlledTextInput
          inputValue={formData?.links?.website}
          id="website"
          placeholder="Website"
          errorMessage="Website URL cannot be blank."
          updateInput={updateWebsite}
          isValid={isValid}
        />
        {inputExists(formData.organizationName) && (
          <ContinueButton navigation={navigation} />
        )}
      </div>
    )
  );
};
export default Website
