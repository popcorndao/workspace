import React from 'react';
import IpfsUpload from './IpfsUpload';
import { FormStepProps } from 'pages/proposals/propose';

export default function HeaderImage({
  form,
  navigation,
  visible,
}: FormStepProps): JSX.Element {
  const [formData, setFormData] = form;
  function updateHeaderImage(headerImage) {
    setFormData({ ...formData, files: { ...formData.files, headerImage } });
  }
  return (
    visible && (
      <IpfsUpload
        stepName={'6 - UPLOAD HEADER IMAGE'}
        localState={formData.files.headerImage}
        setLocalState={updateHeaderImage}
        imageDescription={'a Header Image'}
        imageInstructions={
          'Ideal dimensions - 1500px x 500px and less than 5mb'
        }
        fileType={'image/*'}
        numMaxFiles={1}
        navigation={navigation}
      />
    )
  );
}
