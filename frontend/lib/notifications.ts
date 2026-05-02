// Frontend notifications setup (Step 14).
//
// On app launch:
//   1. Set the foreground handler so heads-up alerts work while the app is open.
//   2. Request notification permission.
//   3. If granted, fetch the FCM device push token and register it with the backend.
//
// Tap behavior: notifications carry data.deep_link (e.g. freshkeep://item/<id>).
// expo-router auto-handles deep links registered via the "scheme" in app.json,
// so opening a notification while the app is closed deep-links into Item Detail.
//
// Without google-services.json + Firebase plugin in app.json, push tokens won't
// resolve on Android. This is the user's TODO and is documented in the README.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { registerFcmToken } from './api';

let didSetUp = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Request permission + register the device token. Safe to call multiple times.
 * Returns the registered token, or null if registration was skipped.
 */
export async function setUpNotifications(): Promise<string | null> {
  if (didSetUp) return null;
  didSetUp = true;

  if (!Device.isDevice) {
    console.log('[notifications] simulator/emulator — push tokens not available');
    return null;
  }

  // Permission
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    console.log('[notifications] permission denied');
    return null;
  }

  // Android channel — required for Android 8+ before any notification can show.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('freshkeep-default', {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
    });
  }

  // Get the device token (FCM on Android, APNS on iOS).
  let token: string;
  try {
    const result = await Notifications.getDevicePushTokenAsync();
    token = result.data;
  } catch (e) {
    console.warn('[notifications] could not fetch device token:', e);
    return null;
  }

  // Send to backend.
  try {
    await registerFcmToken(token, `${Platform.OS} dev build`);
    console.log('[notifications] token registered');
  } catch (e) {
    console.warn('[notifications] backend registration failed:', e);
  }
  return token;
}
