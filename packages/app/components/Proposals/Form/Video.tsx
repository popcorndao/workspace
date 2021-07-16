import { FormStepProps } from 'pages/proposals/propose';
import React from 'react';
import IpfsUpload from './IpfsUpload';
import ActionButtons from './IpfsUploadActionButtons';

export default function ProfileImage({
  form,
  navigation,
  visible,
}: FormStepProps) {
  const [formData, setFormData] = form;
  function updateVideo(video) {
    setFormData({ ...formData, files: { ...formData.files, video } });
  }
  const maxVideoSizeMB = 30;
  function clearLocalState(): void {
    setFormData({
      ...formData,
      files: {
        ...formData.files,
        video: '',
      },
    });
  }
  
  return (
    visible && (
      <>
        <IpfsUpload
          stepName={`${navigation.currentStep} - UPLOAD VIDEO`}
          localState={formData.files.video}
          setLocalState={updateVideo}
          fileDescription={'a Video'}
          fileInstructions={`Video must be less than ${maxVideoSizeMB}mb`}
          fileType={'video/*'}
          numMaxFiles={1}
          maxFileSizeMB={maxVideoSizeMB}
        />
        {formData?.files?.video !== '' && (
          <ActionButtons
            clearLocalState={clearLocalState}
            navigation={navigation}
          />
        )}
      </>
    )
  );
}
