import React from 'react';
import { FormStepProps } from 'pages/proposals/propose';
import ControlledTextInput from './ControlledTextInput';

export default function ProofOfOwnership({
  form,
  navigation,
  visible,
}: FormStepProps): JSX.Element {
  const [formData, setFormData] = form;
  function updateProofOfOwnership(proofOfOwnership: string): void {
    setFormData({
      ...formData,
      links: { ...formData.links, proofOfOwnership },
    });
  }

  function isValid(name: string): boolean {
    return name.length > 0;
  }

  return (
    visible && (
      <div className="mx-auto content-center justify-items-center px-10">
        <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide uppercase">
          4 - Proof of ownership
        </h2>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Input the Ethereum address shared in step 2 on the beneficiary's
          website or a tweet on the beneficiary's official Twitter account.
        </label>
        <ControlledTextInput
          inputValue={formData.links.proofOfOwnership}
          id="proofofownership"
          placeholder="Proof of Ownership"
          errorMessage="The proof of ownership cannot be left blank."
          updateInput={updateProofOfOwnership}
          isValid={isValid}
          navigation={navigation}
        />
      </div>
    )
  );
}
