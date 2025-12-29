import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Subscription } from "expo-notifications";
import {
  registerForPushNotifications,
  setupNotificationResponseHandler,
  setupNotificationReceivedHandler,
} from "@/lib/notifications";
import "../src/styles/global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const notificationResponseListener = useRef<Subscription>();
  const notificationReceivedListener = useRef<Subscription>();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Set up notification handlers
    notificationResponseListener.current = setupNotificationResponseHandler();
    notificationReceivedListener.current = setupNotificationReceivedHandler();

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
      if (notificationReceivedListener.current) {
        notificationReceivedListener.current.remove();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#ffffff" },
              animation: "slide_from_right",
            }}
          />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
