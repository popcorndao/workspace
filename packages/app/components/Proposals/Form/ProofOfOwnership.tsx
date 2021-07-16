import React from 'react';
import { FormStepProps } from 'pages/proposals/propose';
import ControlledTextInput from './ControlledTextInput';
import inputExists from 'utils/isValidInput';
import ContinueButton from './ContinueButton';

const ProofOfOwnership: React.FC<FormStepProps> = ({
  form,
  navigation,
  visible,
}) => {
  const [formData, setFormData] = form;

  function updateProofOfOwnership(proofOfOwnership: string): void {
    setFormData({
      ...formData,
      links: { ...formData.links, proofOfOwnership },
    });
  }

  return (
    visible && (
      <div className="mx-auto content-center justify-items-center px-10">
        <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide uppercase">
        {navigation.currentStep} - Proof of ownership
        </h2>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Input the Ethereum address shared in step 2 on the beneficiary's
          website or a tweet on the beneficiary's official Twitter account.
        </label>
        <ControlledTextInput
          inputValue={formData?.links?.proofOfOwnership}
          id="proofofownership"
          placeholder="Proof of Ownership"
          errorMessage="The proof of ownership cannot be left blank."
          updateInput={updateProofOfOwnership}
          isValid={inputExists}
        />
        {inputExists(formData?.links?.proofOfOwnership) && (
          <ContinueButton navigation={navigation} />
        )}
      </div>
    )
  );
};
export default ProofOfOwnership
