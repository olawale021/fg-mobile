import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase/client';

/**
 * Configure notification handling
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get Expo push token
  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) {
      console.error('Missing EXPO_PUBLIC_PROJECT_ID — push token registration skipped');
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save push token to user profile in database
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Error saving push token:', error);
      throw error;
    }

    console.log('Push token saved successfully');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Register push notifications and save token for a user
 */
export async function setupPushNotifications(userId: string): Promise<void> {
  const token = await registerForPushNotifications();
  if (token) {
    await savePushToken(userId, token);
  }
}

/**
 * Configure Android notification channel (required for Android)
 */
export async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-lessons', {
      name: 'Daily Lessons',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#01B2FE',
      sound: 'default',
    });
  }
}

/**
 * Handle notification received while app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification response (user tapped on notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your daily lesson is ready!',
      body: 'Start learning today',
      data: { type: 'daily-lesson' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}
