import { Tabs } from 'expo-router';

// Bottom tab navigator. The "scanner" tab in the middle gets distinct styling
// in a later step (Step 9 dashboard work) — for now it's just a default tab.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index"   options={{ title: 'Home' }} />
      <Tabs.Screen name="scanner" options={{ title: 'Scan' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
