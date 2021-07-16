import React, { useContext } from 'react';
import DualActionModal from './DualActionModal';
import { store } from '../../context/store';

export const DualActionModalContainer: React.FC = () => {
  const {
    state: { dualActionModal },
  } = useContext(store);
  return (
    <DualActionModal
      visible={dualActionModal.visible}
      title={dualActionModal.title}
      content={dualActionModal.content}
      progress={dualActionModal.progress}
      onDismiss={dualActionModal.onDismiss}
      onConfirm={dualActionModal.onConfirm}
    />
  );
};
export default DualActionModalContainer;
