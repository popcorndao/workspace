import React, { useContext } from 'react';
import SingleActionModal from './SingleActionModal';
import { store } from '../../context/store';

export const SingleActionModalContainer: React.FC = () => {
  const {
    state: { singleActionModal },
  } = useContext(store);
  return (
    <SingleActionModal
      visible={singleActionModal.visible}
      title={singleActionModal.title}
      content={singleActionModal.content}
      type={singleActionModal.type}
      onConfirm={singleActionModal.onConfirm}
    />
  );
};
