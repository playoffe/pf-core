'use strict';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { createSupabaseClient } from '@/lib/supabase';

// Configure notification handler (call once at app start)
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Request permission + get token + store in Supabase
export async function registerPushToken(userId: string): Promise<string | null> {
  try {
    // 1. On Android, set notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16a34a',
      });
    }

    // 2. Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // 3. Get Expo push token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenData.data;

    // 4. Try to update players table with push_token, ignore error if column doesn't exist
    try {
      const supabase = createSupabaseClient();
      await supabase
        .from('players')
        .update({ push_token: token } as any)
        .eq('id', userId);
    } catch {
      // Column may not exist yet — safe to ignore
    }

    // 5. Return token
    return token;
  } catch {
    return null;
  }
}

// Schedule a local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds = 0
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: delaySeconds > 0 ? ({ seconds: delaySeconds } as any) : null,
  });
}
