import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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
