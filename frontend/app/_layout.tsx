import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Fraunces_600SemiBold, Fraunces_800ExtraBold } from '@expo-google-fonts/fraunces';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { View, ActivityIndicator } from 'react-native';

import { setUpNotifications } from '../lib/notifications';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_800ExtraBold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  });

  useEffect(() => {
    // Step 14 — request permission + register FCM token on app launch.
    setUpNotifications().catch((err) => console.warn('notification setup:', err));
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="item/[id]"   options={{ headerShown: true, title: 'Item',   headerStyle: { backgroundColor: colors.bg } }} />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: true, title: 'Recipe', headerStyle: { backgroundColor: colors.bg } }} />
        <Stack.Screen name="scan/details" options={{ headerShown: true, title: 'Set Details', headerStyle: { backgroundColor: colors.bg } }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
