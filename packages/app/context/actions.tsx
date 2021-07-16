import React from 'react';
import { Link } from '@material-ui/core';
import {
  SingleActionModalProps,
  DefaultSingleActionModalProps,
} from 'components/Modal/SingleActionModal';
import { DualActionModalProps } from 'components/Modal/DualActionModal';
import { DefaultDualActionModalProps } from '../components/Modal/DualActionModal';
import { Notification } from '../components/Notifications/NotificationsContainer';
import {
  DefaultDualActionWideModalProps,
  DualActionWideModalProps,
} from 'components/Modal/DualActionWideModal';

export const PUSH_NOTIFICATION = 'notifications/PUSH_NOTIFICATION';
export const UNSET_NOTIFICATION = 'notifications/UNSET_NOTIFICATION';
export const HIDE_NOTIFICATION = 'notifications/HIDE_NOTIFICATION';
export const CLEAR_NOTIFICATIONS = 'notifications/CLEAR_NOTIFICATIONS';
export const SINGLE_ACTION_MODAL = 'modals/SINGLE_ACTION_MODAL';
export const DUAL_ACTION_MODAL = 'modals/DUAL_ACTION_MODAL';
export const DUAL_ACTION_WIDE_MODAL = 'modals/DUAL_ACTION_WIDE_MODAL';

export type AppActions =
  | PushNotificationAction
  | UnsetNotificationAction
  | HideNotificationAction
  | ClearNotificationsAction
  | SetSingleActionModalAction
  | SetDualActionModalAction
  | SetDualActionWideModalAction;

export interface PushNotificationAction {
  type: typeof PUSH_NOTIFICATION;
  payload: Notification;
}
export const pushNotification = (
  notification: Partial<Notification>,
): PushNotificationAction => {
  return {
    type: PUSH_NOTIFICATION,
    payload: { ...notification, visible: true } as Notification,
  };
};

export interface UnsetNotificationAction {
  type: typeof UNSET_NOTIFICATION;
  payload: number;
}

export const unsetNotification = (id: number): UnsetNotificationAction => {
  return {
    type: UNSET_NOTIFICATION,
    payload: id,
  };
};

export interface HideNotificationAction {
  type: typeof HIDE_NOTIFICATION;
  payload: number;
}
export const hideNotification = (id: number): HideNotificationAction => {
  return {
    type: HIDE_NOTIFICATION,
    payload: id,
  };
};

export interface ClearNotificationsAction {
  type: typeof CLEAR_NOTIFICATIONS;
}

export const clearNotifications = (): ClearNotificationsAction => {
  return {
    type: CLEAR_NOTIFICATIONS,
  };
};

export interface SetSingleActionModalAction {
  type: typeof SINGLE_ACTION_MODAL;
  payload: SingleActionModalProps;
}

export const setSingleActionModal = (
  props: Partial<SingleActionModalProps> | false,
): SetSingleActionModalAction => {
  if (!props) {
    return {
      type: SINGLE_ACTION_MODAL,
      payload: {
        ...DefaultSingleActionModalProps,
        visible: false,
      },
    };
  }
  return {
    type: SINGLE_ACTION_MODAL,
    payload: {
      ...DefaultSingleActionModalProps,
      visible: true,
      ...props,
    },
  };
};

export interface SetDualActionModalAction {
  type: typeof DUAL_ACTION_MODAL;
  payload: DualActionModalProps;
}
export const setDualActionModal = (
  props: Partial<DualActionModalProps> | false,
): SetDualActionModalAction => {
  console.log(props)
  if (!props) {
    return {
      type: DUAL_ACTION_MODAL,
      payload: {
        ...DefaultDualActionModalProps,
        visible: false,
      },
    };
  }
  return {
    type: DUAL_ACTION_MODAL,
    payload: {
      ...DefaultDualActionModalProps,
      visible: true,
      ...props,
    },
  };
};

export interface SetDualActionWideModalAction {
  type: typeof DUAL_ACTION_WIDE_MODAL;
  payload: DualActionWideModalProps;
}
export const setDualActionWideModal = (
  props: Partial<DualActionWideModalProps> | false,
): SetDualActionWideModalAction => {
  if (!props) {
    return {
      type: DUAL_ACTION_WIDE_MODAL,
      payload: {
        ...DefaultDualActionWideModalProps,
        visible: false,
      },
    };
  }
  return {
    type: DUAL_ACTION_WIDE_MODAL,
    payload: {
      ...DefaultDualActionWideModalProps,
      visible: true,
      ...props,
    },
  };
};
