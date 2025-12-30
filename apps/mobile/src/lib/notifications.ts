import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "./supabase";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Register for push notifications
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications only work on physical devices");
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permissions not granted");
    return null;
  }

  // Get Expo push token
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    // Configure Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#10b981",
      });

      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Signature Reminders",
        description: "Reminders to sign contracts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#f59e0b",
      });
    }

    // Save token to user profile
    await savePushToken(token.data);

    return token.data;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

// Save push token to Supabase user profile
async function savePushToken(token: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update user metadata with push token
    await supabase.auth.updateUser({
      data: {
        push_token: token,
        push_token_platform: Platform.OS,
        push_token_updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}

// Handle notification response (when user taps notification)
export function setupNotificationResponseHandler() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;

    // Handle different notification types
    if (data?.type === "signature_reminder" && data?.contractId) {
      router.push(`/contracts/${data.contractId}`);
    } else if (data?.type === "contract_signed" && data?.contractId) {
      router.push(`/contracts/${data.contractId}`);
    } else if (data?.type === "sign_request" && data?.token) {
      router.push(`/sign/${data.token}`);
    }
  });

  return subscription;
}

// Handle notifications received while app is in foreground
export function setupNotificationReceivedHandler() {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log("Notification received:", notification.request.content);
  });

  return subscription;
}

// Schedule a local notification (for testing)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  delaySeconds = 5
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: {
      seconds: delaySeconds,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    },
  });
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get badge count
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Set badge count
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

// Clear badge
export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
