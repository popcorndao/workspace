import React from 'react';
import IpfsUpload from './IpfsUpload';
import { FormStepProps } from 'pages/proposals/propose';

export default function AdditionalImages({
  form,
  navigation,
  visible,
}: FormStepProps): JSX.Element {
  const [formData, setFormData] = form;
  function updateAdditionalImages(additionalImages) {
    setFormData({
      ...formData,
      files: { ...formData.files, additionalImages },
    });
  }
  return (
    visible && (
      <IpfsUpload
        stepName={'7 - Upload Additional Images'}
        localState={formData.files.additionalImages}
        setLocalState={updateAdditionalImages}
        imageDescription={'Additional Images'}
        imageInstructions={
          'The ideal image size and aspect ratio are 1200px X 675px and 16:9, respectively.'
        }
        fileType={'image/*'}
        numMaxFiles={4}
        navigation={navigation}
      />
    )
  );
}
