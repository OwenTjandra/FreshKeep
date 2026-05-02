import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { setUpNotifications } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    // Step 14 — request permission + register FCM token on app launch.
    // Idempotent; safe to call on every cold start.
    setUpNotifications().catch((err) => console.warn('notification setup:', err));
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="item/[id]" options={{ headerShown: true, title: 'Item' }} />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: true, title: 'Recipe' }} />
        <Stack.Screen name="scan/details" options={{ headerShown: true, title: 'Set Details' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
