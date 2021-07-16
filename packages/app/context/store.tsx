import { DefaultSingleActionModalProps } from 'components/Modal/SingleActionModal';
import React, { createContext, useReducer } from 'react';
import { SingleActionModalProps } from '../components/Modal/SingleActionModal';
import { Notification } from '../components/Notifications/NotificationsContainer';
import {
  DefaultDualActionModalProps,
  DualActionModalProps,
} from '../components/Modal/DualActionModal';
import {
  AppActions,
  PUSH_NOTIFICATION,
  UNSET_NOTIFICATION,
  HIDE_NOTIFICATION,
  CLEAR_NOTIFICATIONS,
  SINGLE_ACTION_MODAL,
  DUAL_ACTION_MODAL,
  DUAL_ACTION_WIDE_MODAL,
} from './actions';
import {
  DefaultDualActionWideModalProps,
  DualActionWideModalProps,
} from 'components/Modal/DualActionWideModal';

interface DefaultState {
  notifications: Notification[];
  singleActionModal: SingleActionModalProps;
  dualActionModal: DualActionModalProps;
  dualActionWideModal: DualActionWideModalProps;
}

const initialState: DefaultState = {
  notifications: [],
  singleActionModal: {
    ...DefaultSingleActionModalProps,
  },
  dualActionModal: {
    ...DefaultDualActionModalProps,
  },
  dualActionWideModal: {
    ...DefaultDualActionWideModalProps,
  },
};

const store = createContext(
  (initialState as unknown) as {
    state: DefaultState;
    dispatch: React.Dispatch<any>;
  },
);
const { Provider } = store;

const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(
    (state: DefaultState, action: AppActions) => {
      switch (action.type) {
        case PUSH_NOTIFICATION:
          return {
            ...state,
            notifications: [...state.notifications, action.payload],
          };
        case HIDE_NOTIFICATION:
          return {
            ...state,
            notifications: [
              ...state.notifications.map((notification) => {
                if (notification.id == action.payload) {
                  notification.visible = false;
                }
                return notification;
              }),
            ],
          };
        case UNSET_NOTIFICATION:
          return {
            ...state,
            notifications: [
              ...state.notifications.filter(
                (notification) => notification.id !== action.payload,
              ),
            ],
          };
        case CLEAR_NOTIFICATIONS:
          return {
            ...state,
            notifications: [
              ...state.notifications.map((notification) => {
                notification.visible = false;
                return notification;
              }),
            ],
          };
        case SINGLE_ACTION_MODAL:
          return {
            ...state,
            singleActionModal: {
              ...action.payload,
            },
          };
        case DUAL_ACTION_MODAL:
          return {
            ...state,
            dualActionModal: {
              ...action.payload,
            },
          };
        case DUAL_ACTION_WIDE_MODAL:
          return {
            ...state,
            dualActionWideModal: {
              ...action.payload,
            },
          };
        default:
          return {
            ...state,
          };
      }
    },
    initialState,
  );

  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export { store, StateProvider };
