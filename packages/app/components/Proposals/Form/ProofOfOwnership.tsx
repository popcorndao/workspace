import { InfoIconWithModal } from 'components/InfoIconWithModal';
import { FormStepProps } from 'pages/proposals/propose';
import React from 'react';
import inputExists from 'utils/isValidInput';
import ContinueButton from './ContinueButton';
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

  return (
    visible && (
      <div className="mx-auto content-center justify-items-center px-10">
        <div className="flex justify-center space-x-2 md:order-2 items-center">
          <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide ">
            {navigation.currentStep} - Provide proof of ownership of the
            organizations Ethereum Address
          </h2>
          <InfoIconWithModal
            title={'Proof of ownership'}
            content={`Please share a link to either a page on the organisation's
            official website or a tweet from the organization'v verified Twitter
            account that contains the Etherum address to which grants will
            be distributed`}
          />
        </div>
        <ControlledTextInput
          inputValue={formData?.links?.proofOfOwnership}
          id="proofofownership"
          placeholder="Proof of Ownership"
          errorMessage="The proof of ownership cannot be left blank."
          updateInput={updateProofOfOwnership}
          isValid={inputExists}
        />
        {inputExists(formData?.links?.proofOfOwnership) && (
          <ContinueButton {...navigation} />
        )}
      </div>
    )
  );
}
