import React, { useContext } from 'react';
import DualActionWideModal from './DualActionWideModal';
import { store } from '../../context/store';

export const DualActionWideModalContainer: React.FC = () => {
  const {
    state: {
      dualActionWideModal: {
        visible,
        title,
        content,
        progress,
        onDismiss,
        onConfirm,
      },
    },
  } = useContext(store);
  return (
    <DualActionWideModal
      visible={visible}
      title={title}
      content={content}
      progress={progress}
      onDismiss={onDismiss}
      onConfirm={onConfirm}
    />
  );
};
export default DualActionWideModalContainer;
