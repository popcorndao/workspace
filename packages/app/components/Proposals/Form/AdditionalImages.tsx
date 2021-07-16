import { CheckIcon } from '@heroicons/react/solid';
import { FormStepProps } from 'pages/proposals/propose';
import React from 'react';
import inputExists from 'utils/isValidInput';
import ControlledTextInput from './ControlledTextInput';
import { DisplayImages } from './DisplayFiles';
import IpfsUpload from './IpfsUpload';
import ActionButtons from './IpfsUploadActionButtons';

export default function AdditionalImages({
  form,
  navigation,
  visible,
}: FormStepProps): JSX.Element {
  const [formData, setFormData] = form;
  const { setCurrentStep, currentStep, setStepLimit } = navigation;
  function updateAdditionalImages(additionalImages) {
    setFormData({
      ...formData,
      files: {
        ...formData.files,
        additionalImages: additionalImages.map((image) => {
          return { image: image, description: '' };
        }),
      },
    });
  }

  function updateImageDescription(description: string, index: number): void {
    const stateCopy = { ...formData };
    stateCopy.files.additionalImages[index].description = description;
    setFormData(stateCopy);
  }

  function clearLocalState(): void {
    setFormData({
      ...formData,
      files: { ...formData.files, additionalImages: [] },
    });
  }

  function isFilled(): boolean {
    return (
      formData?.files?.additionalImages?.length > 0 &&
      formData?.files?.additionalImages.every(
        (image) => image.image !== '' && image.description !== '',
      )
    );
  }

  return (
    visible && (
      <>
        <IpfsUpload
          stepName={`${navigation.currentStep} - Upload Additional Images (Optional)`}
          localState={formData?.files?.additionalImages?.map(
            (image) => image.image,
          )}
          setLocalState={updateAdditionalImages}
          fileDescription={'Additional Images'}
          fileInstructions={
            'Images should be 1200px X 675px and 16:9, and less than 5mb'
          }
          fileType={'image/*'}
          numMaxFiles={4}
          maxFileSizeMB={5}
        />
        <DisplayImages
          localState={formData?.files?.additionalImages?.map(
            (image) => image.image,
          )}
        />
        <div className="mt-8 w-80 mx-auto">
          {formData?.files?.additionalImages?.map((image, i) => (
            <div className="mb-4">
              <p>Image {i + 1} Description</p>
              <ControlledTextInput
                inputValue={image.description}
                id={`description ${i}`}
                placeholder={`Description for Image ${i + 1}`}
                errorMessage="Image description cannot be blank."
                updateInput={updateImageDescription}
                inputIndex={i}
                isValid={inputExists}
              />
            </div>
          ))}
        </div>
        {isFilled() ? (
          <ActionButtons
            clearLocalState={clearLocalState}
            navigation={navigation}
          />
        ) : (
          <button
            onClick={() => {
              setStepLimit(currentStep + 1);
              setCurrentStep(currentStep + 1);
            }}
            className="mx-auto justify-self-center inline-flex px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continue
            <CheckIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </>
    )
  );
}
