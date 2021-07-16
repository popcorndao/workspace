import { InfoIconWithModal } from 'components/InfoIconWithModal';
import { setDualActionModal } from 'context/actions';
import { store } from 'context/store';
import { useContext } from 'react';

const TriggerTakedownProposal: React.FC = () => {
  const { dispatch } = useContext(store);
  const triggerTakedownProposal = () => {
    dispatch(
      setDualActionModal({
        visible: true,
        progress: true,
      }),
    );
  };
  return (
    <footer className="bg-white py-4">
      <div className="flex justify-center space-x-6 md:order-2 items-center">
        <button
          type="button"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          onClick={() => {
            dispatch(
              setDualActionModal({
                content:
                  'You are about to submit your vote. You will not be able to vote again for this proposal after you submit your vote. \
                     Confirm to continue.',
                title: 'Trigger Takedown Proposal',
                onConfirm: {
                  label: 'Confirm Takedown Proposal',
                  onClick: () => {
                    triggerTakedownProposal();
                    dispatch(setDualActionModal(false));
                  },
                },
                onDismiss: {
                  label: 'Cancel Takedown Proposal',
                  onClick: () => dispatch(setDualActionModal(false)),
                },
              }),
            );
          }}
        >
          Trigger Takedown Proposal
        </button>
        <InfoIconWithModal title="What is a Takedown Proposal?">
          <div>
            <p>
              Triggering a Takedown Proposal begins the process to remove an
              organization from Popcorn.
            </p>{' '}
            <br />
            <p>
              This need may be required if the organization's actions violate
              the principles and values stated in the Popcorn Foundation
              charter.{' '}
            </p>
            <p>
              In the event that an eligible beneficiary violates the principles
              and values in the Popcorn Foundation charter, or if allocation of
              funds is not consistent with the charter’s criteria, a Beneficiary
              Takedown Proposal may be raised, which upon successful execution
              will remove a beneficiary address from the registry.
            </p>
          </div>
        </InfoIconWithModal>
      </div>
    </footer>
  );
};
export default TriggerTakedownProposal
