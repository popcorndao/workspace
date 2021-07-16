import { FormStepProps } from 'pages/proposals/propose';
import inputExists from 'utils/isValidInput';
import ControlledTextInput from './ControlledTextInput';
import { DisplayImages } from './DisplayFiles';
import IpfsUpload from './IpfsUpload';
import ActionButtons from './IpfsUploadActionButtons';

export default function HeaderImage({
  form,
  navigation,
  visible,
}: FormStepProps) {
  const [formData, setFormData] = form;

  function updateHeaderImage(headerImage: string): void {
    setFormData({
      ...formData,
      files: {
        ...formData.files,
        headerImage: {
          image: headerImage,
          description: formData?.files?.headerImage?.description,
        },
      },
    });
  }

  function updateHeaderImageDescription(description: string): void {
    setFormData({
      ...formData,
      files: {
        ...formData.files,
        headerImage: {
          image: formData?.files?.headerImage?.image,
          description: description,
        },
      },
    });
  }

  function clearLocalState(): void {
    setFormData({
      ...formData,
      files: {
        ...formData.files,
        headerImage: {
          image: '',
          description: formData?.files?.headerImage?.description,
        },
      },
    });
  }

  return (
    visible && (
      <>
        <IpfsUpload
          stepName={`${navigation.currentStep} - UPLOAD HEADER IMAGE`}
          localState={formData?.files?.headerImage?.image}
          setLocalState={updateHeaderImage}
          fileDescription={'a Header Image'}
          fileInstructions={
            'Ideal dimensions - 1500px x 500px and less than 5mb'
          }
          fileType={'image/*'}
          numMaxFiles={1}
          maxFileSizeMB={5}
        />
        <DisplayImages localState={formData?.files?.headerImage?.image} />
        <div className="mt-8 w-80">
          <p>Image Description</p>
          <ControlledTextInput
            inputValue={formData?.files?.headerImage?.description}
            id="headerImageDescription"
            placeholder="Image Description"
            errorMessage="Image Description cannot be blank."
            updateInput={updateHeaderImageDescription}
            isValid={inputExists}
          />
        </div>
        {formData?.files?.headerImage?.image !== '' &&
          formData?.files?.headerImage?.description !== '' && (
            <ActionButtons
              clearLocalState={clearLocalState}
              navigation={navigation}
            />
          )}
      </>
    )
  );
}
