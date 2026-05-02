import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import * as storage from '../../lib/storage';
import { colors, fonts, cardBase, sectionLabel, space } from '../../lib/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<storage.StoredUser | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const u = await storage.getMe();
    setMe(u);
    setKeyInput(u.anthropic_api_key || '');
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveKey() {
    setBusy(true);
    try {
      await storage.updateMe({ anthropic_api_key: keyInput.trim() || null });
      Alert.alert('Saved', 'Recipe button will work now.');
      await load();
    } catch (err: any) {
      Alert.alert('Failed', err.message);
    } finally { setBusy(false); }
  }

  async function loadDemoItems() {
    setBusy(true);
    try {
      for (const seed of DEMO_SEEDS) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + seed.days);
        await storage.createItem({
          name: seed.name,
          category: seed.category,
          location: seed.location,
          opened: seed.opened,
          expiry_date: expiry.toISOString().slice(0, 10),
          quantity: 1,
        });
      }
      Alert.alert('Done', `${DEMO_SEEDS.length} demo items added.`);
    } catch (err: any) {
      Alert.alert('Failed', err.message);
    } finally { setBusy(false); }
  }

  async function resetAll() {
    Alert.alert('Reset everything?', 'Deletes all items and your saved API key.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await storage.resetAll();
        await load();
      }},
    ]);
  }

  if (!me) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader title="Profile" subtitle="Local prototype — your data stays on this device." />

      <Text style={sectionLabel}>Fridge</Text>
      <View style={cardBase}>
        <Text style={styles.kvKey}>Temperature</Text>
        <Text style={styles.kvVal}>{me.fridge_temp_setting}°F</Text>
        <Text style={styles.kvHint}>Used by the engine to scale shelf-life. Tap below to recalibrate.</Text>
      </View>

      <Text style={sectionLabel}>Recipe AI</Text>
      <View style={cardBase}>
        <Text style={styles.kvKey}>Anthropic API key</Text>
        <TextInput
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder="sk-ant-..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
        />
        <Text style={styles.kvHint}>
          Get one at console.anthropic.com → API Keys. Stored only on this device.
        </Text>
        <View style={{ marginTop: space.sm }}>
          <Button title={busy ? 'Saving…' : 'Save key'} variant="secondary" onPress={saveKey} disabled={busy} />
        </View>
      </View>

      <Text style={sectionLabel}>Quick start</Text>
      <View style={{ gap: space.sm }}>
        <Button title="Load 10 demo items" variant="secondary" onPress={loadDemoItems} disabled={busy} />
        <Button title="Re-run onboarding" variant="ghost" onPress={() => router.push('/onboarding')} />
        <Button title="Reset everything" variant="ghost" onPress={resetAll} />
      </View>
    </ScrollView>
  );
}

// Mirrors backend seed.js sample items.
const DEMO_SEEDS: Array<{ name: string; category: string; location: storage.StoredItem['location']; opened: boolean; days: number }> = [
  { name: 'Whole milk',     category: 'dairy_milk',         location: 'fridge',  opened: true,  days:   3 },
  { name: 'Greek yogurt',   category: 'dairy_yogurt',       location: 'fridge',  opened: false, days:   8 },
  { name: 'Chicken breast', category: 'meat_chicken',       location: 'fridge',  opened: false, days:   1 },
  { name: 'Spinach',        category: 'produce_leafy',      location: 'fridge',  opened: true,  days:   2 },
  { name: 'Strawberries',   category: 'produce_berries',    location: 'fridge',  opened: false, days:   0 },
  { name: 'Eggs (dozen)',   category: 'eggs',               location: 'fridge',  opened: false, days:  21 },
  { name: 'Sourdough loaf', category: 'bread',              location: 'counter', opened: true,  days:  -1 },
  { name: 'Ground beef',    category: 'meat_beef_ground',   location: 'freezer', opened: false, days:  90 },
  { name: 'Apples',         category: 'produce_hard_fruit', location: 'fridge',  opened: false, days:  14 },
  { name: 'Cheddar cheese', category: 'dairy_cheese_hard',  location: 'fridge',  opened: true,  days:  25 },
];

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space['2xl'], paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  kvKey: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  kvVal: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 2 },
  kvHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: space.sm },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: space.md, paddingVertical: 10,
    fontFamily: fonts.body, fontSize: 14, color: colors.ink,
    marginTop: space.sm,
  },
});
