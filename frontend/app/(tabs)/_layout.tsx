import { Tabs } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';

import { colors, fonts, hardShadow } from '../../lib/theme';

// Bottom tab nav with the center scan FAB. Only three logical tabs
// (Home / Scan / Profile) — the prototype shows five (adds Items + Recipes)
// but those are stack views inside Home for the moment.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: '',
          tabBarLabelStyle: { display: 'none' },
          tabBarIcon: () => <ScanFab />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} />,
        }}
      />
    </Tabs>
  );
}

function ScanFab() {
  // Plain View — the parent Tabs cell is what receives the tap and routes
  // to the Scanner screen. Wrapping in Pressable would steal the tap.
  return (
    <View style={styles.fab}>
      <Text style={styles.fabIcon}>≡</Text>
    </View>
  );
}

function TabIcon({ name, color }: { name: 'home' | 'profile'; color: string }) {
  // Glyph fallback so we don't depend on an icon font; readable at 22px.
  const glyph = name === 'home' ? '⌂' : '◯';
  return (
    <Text style={[styles.tabIcon, { color }]}>{glyph}</Text>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.paper,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingBottom: 14,
    height: 70,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabIcon: {
    fontSize: 22,
    lineHeight: 24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -12 }],
    ...hardShadow(3),
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
});
