/* This example requires Tailwind CSS v2.0+ */
import { Fragment, useContext, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/outline';
import { XIcon } from '@heroicons/react/solid';
import { store } from '../../context/store';
import { hideNotification, unsetNotification } from '../../context/actions';

export interface Notification {
  id: number;
  visible: boolean;
  type: 'success' | 'error' | 'waiting';
  title: string;
  isFlash?: boolean;
  content: string | React.ReactElement;
  backdrop?: boolean;
}

const Example: React.FC = () => {
  const {
    dispatch,
    state: { notifications },
  } = useContext(store);

  useEffect(() => {
    const timeouts = [];
    const intId = setInterval(() => {
      notifications.map((notification) => {
        if (notification.isFlash) {
          const id = setTimeout(() => {
            dispatch(hideNotification(notification.id));
          }, 7000);
          timeouts.push(id);
        }
      });
    }, 1000);

    return () => {
      clearInterval(intId);
      timeouts.map((timeout) => clearTimeout(timeout));
    };
  }, [notifications]);

  return (
    <>
      {/* Global notification live region, render this permanently at the end of the document */}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end  px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end"
      >
        {/* Notification panel, dynamically insert this into the live region when it needs to be displayed */}
        {notifications &&
          notifications.map((notification) => (
            <Transition
              appear={true}
              key={notification.id}
              show={notification.visible}
              as={Fragment}
              enter="transform ease-out duration-300 transition"
              enterFrom="translate-y-10 opacity-0 sm:translate-y-0 sm:translate-x-10"
              enterTo="translate-y-0 opacity-100 sm:translate-x-0"
              leave="transition ease-in duration-300 transition"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              afterLeave={() => {
                dispatch(unsetNotification(notification.id));
              }}
            >
              <div className="max-w-sm m-4 w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden block ">
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {notification.type == 'success' && (
                        <CheckCircleIcon
                          className="h-6 w-6 text-green-400"
                          aria-hidden="true"
                        />
                      )}
                      {notification.type == 'waiting' && (
                        <ClockIcon
                          className="h6 w-6 text-yellow-400"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {notification.content}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                      <button
                        className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={() => {
                          dispatch(hideNotification(notification.id));
                        }}
                      >
                        <span className="sr-only">Close</span>
                        <XIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          ))}
      </div>
    </>
  );
};
export default Example
