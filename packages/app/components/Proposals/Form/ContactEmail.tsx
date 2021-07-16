import { FormStepProps } from 'pages/proposals/propose';
import React from 'react';
import inputExists from 'utils/isValidInput';
import ContinueButton from './ContinueButton';
import ControlledTextInput from './ControlledTextInput';

const ContactEmail: React.FC<FormStepProps> = ({
  form,
  navigation,
  visible,
}) => {
  const [formData, setFormData] = form;

  function isValid(email): boolean {
    return email.length > 0;
  }
  function updateName(value: string): void {
    setFormData({
      ...formData,
      links: { ...formData.links, contactEmail: value },
    });
  }

  return (
    visible && (
      <div className="mx-auto content-center justify-items-center">
        <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide uppercase">
          {navigation.currentStep} - Please enter a contact email address
        </h2>
        <ControlledTextInput
          inputValue={formData?.links?.contactEmail}
          id="contactEmail"
          placeholder="Contact Email"
          errorMessage="Contact email cannot be blank."
          updateInput={updateName}
          isValid={isValid}
        />
        {inputExists(formData.organizationName) && (
          <ContinueButton {...navigation} />
        )}
      </div>
    )
  );
};
export default ContactEmail
