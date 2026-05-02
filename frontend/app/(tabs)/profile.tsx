import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Slider from '@react-native-community/slider';

import * as storage from '../../lib/storage';
import { colors, fonts, cardBase, sectionLabel, space } from '../../lib/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<storage.StoredUser | null>(null);
  const [tempDraft, setTempDraft] = useState(37);
  const [keyInput, setKeyInput] = useState('');
  const [stats, setStats] = useState({ tracked: 0, saved: 0, wasted: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const u = await storage.getMe();
    setMe(u);
    setTempDraft(u.fridge_temp_setting);
    setKeyInput(u.anthropic_api_key || '');
    const all = await storage.listItems({ status: 'all' });
    setStats({
      tracked: all.items.length,
      saved: all.items.filter(i => i.status === 'used').length,
      wasted: all.items.filter(i => i.status === 'tossed').length,
    });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveTemp(value: number) {
    setBusy(true);
    try {
      await storage.updateMe({ fridge_temp_setting: value });
      await load();
    } finally { setBusy(false); }
  }

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
      await load();
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

  const tempBand = bandForTemp(tempDraft);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader title="Profile" subtitle="Local prototype — your data stays on this device." />

      {/* ─── Stats ─────────────────────────────────────────────── */}
      <Text style={sectionLabel}>Your impact</Text>
      <View style={styles.statsRow}>
        <StatCell n={stats.tracked} label="Tracked" bg={colors.paper} />
        <StatCell n={stats.saved}   label="Saved"   bg={colors.freshBg} />
        <StatCell n={stats.wasted}  label="Wasted"  bg={colors.urgentBg} />
      </View>
      <Text style={styles.dim}>
        Tap "Mark used" on items you eat — it bumps Saved.
        Tap "Toss it" if it spoiled — it bumps Wasted.
      </Text>

      {/* ─── Fridge temperature ─────────────────────────────────── */}
      <Text style={sectionLabel}>Fridge</Text>
      <View style={cardBase}>
        <Text style={styles.kvKey}>Temperature</Text>
        <Text style={styles.kvVal}>{tempDraft}°F</Text>
        <Text style={[styles.tempBandTag, { backgroundColor: tempBand.color }]}>{tempBand.label}</Text>
        <Slider
          style={{ marginTop: space.md, height: 36 }}
          minimumValue={32}
          maximumValue={42}
          step={1}
          value={tempDraft}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor="#e5dccd"
          thumbTintColor={colors.ink}
          onValueChange={setTempDraft}
          onSlidingComplete={saveTemp}
          disabled={busy}
        />
        <View style={styles.tempScale}>
          <Text style={styles.tempTick}>32°</Text>
          <Text style={styles.tempTick}>37°</Text>
          <Text style={styles.tempTick}>42°</Text>
        </View>
        <Text style={styles.kvHint}>
          The engine multiplies shelf life by {bandMultiplier(tempBand.key)}× based on this — colder = items last longer.
        </Text>
      </View>

      {/* ─── Recipe AI ──────────────────────────────────────────── */}
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

      {/* ─── Notification preview ─────────────────────────────── */}
      <Text style={sectionLabel}>What notifications look like</Text>
      <Text style={styles.dim}>
        Coming once we wire Firebase. Morning-only (8–10am local), one push per day max.
      </Text>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <NotifPreview
          icon="🥣"
          title="Open it for breakfast"
          body="You haven't opened that yogurt yet — it expires today. Have it for breakfast?"
        />
        <NotifPreview
          icon="🧊"
          title="Freeze your bread"
          body="Save it for later — tap to mark frozen."
        />
        <NotifPreview
          icon="🍴"
          title="Sourdough loaf is past its date"
          body="Check it carefully — or toss it."
        />
      </View>

      {/* ─── Quick start ────────────────────────────────────────── */}
      <Text style={sectionLabel}>Quick start</Text>
      <View style={{ gap: space.sm }}>
        <Button title="Load 10 demo items" variant="secondary" onPress={loadDemoItems} disabled={busy} />
        <Button title="Re-run onboarding" variant="ghost" onPress={() => router.push('/onboarding')} />
        <Button title="Reset everything" variant="ghost" onPress={resetAll} />
      </View>
    </ScrollView>
  );
}

function StatCell({ n, label, bg }: { n: number; label: string; bg: string }) {
  return (
    <View style={[styles.statCell, { backgroundColor: bg }]}>
      <Text style={styles.statNum}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NotifPreview({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.notif}>
      <View style={styles.notifIcon}><Text style={styles.notifIconText}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifApp}>FRESHKEEP</Text>
          <Text style={styles.notifTime}>now</Text>
        </View>
        <Text style={styles.notifTitle}>{title}</Text>
        <Text style={styles.notifBody}>{body}</Text>
      </View>
    </View>
  );
}

type TempBand = { key: 'cold' | 'ideal' | 'warm' | 'hot'; label: string; color: string };
function bandForTemp(t: number): TempBand {
  if (t <= 35) return { key: 'cold',  label: '❄️ Cold (1.15× shelf life)',     color: colors.blueBg };
  if (t <= 38) return { key: 'ideal', label: '✓ Ideal (1.0× — USDA recommended)', color: colors.freshBg };
  if (t <= 40) return { key: 'warm',  label: '⚠ Slightly warm (0.85×)',           color: colors.soonBg };
  return            { key: 'hot',   label: '🔥 Warm (0.7× — items spoil faster)', color: colors.urgentBg };
}
function bandMultiplier(k: TempBand['key']): string {
  return k === 'cold' ? '1.15' : k === 'ideal' ? '1.0' : k === 'warm' ? '0.85' : '0.7';
}

const DEMO_SEEDS: Array<{ name: string; category: string; location: storage.StoredItem['location']; opened: boolean; days: number }> = [
  { name: 'Whole milk',     category: 'dairy_milk',         location: 'fridge',  opened: true,  days:   0 },
  { name: 'Greek yogurt',   category: 'dairy_yogurt',       location: 'fridge',  opened: false, days:   3 },
  { name: 'Chicken breast', category: 'meat_chicken',       location: 'fridge',  opened: false, days:   1 },
  { name: 'Spinach',        category: 'produce_leafy',      location: 'fridge',  opened: true,  days:   2 },
  { name: 'Cheddar cheese', category: 'dairy_cheese_hard',  location: 'fridge',  opened: true,  days:   4 },
  { name: 'Sourdough loaf', category: 'bread',              location: 'counter', opened: true,  days:  -1 },
  { name: 'Eggs (dozen)',   category: 'eggs',               location: 'fridge',  opened: false, days:  21 },
  { name: 'Apples',         category: 'produce_hard_fruit', location: 'fridge',  opened: false, days:  14 },
  { name: 'Ground beef',    category: 'meat_beef_ground',   location: 'freezer', opened: false, days:  90 },
  { name: 'Strawberries',   category: 'produce_berries',    location: 'fridge',  opened: false, days:   8 },
];

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space['2xl'], paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  // Stats row
  statsRow: { flexDirection: 'row', gap: space.sm },
  statCell: {
    flex: 1, padding: space.md, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  statNum: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '800', color: colors.ink },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.muted, marginTop: 4 },

  // KV pairs
  kvKey: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  kvVal: { fontFamily: fonts.serif, fontSize: 36, fontWeight: '800', color: colors.ink, marginTop: 2, lineHeight: 40 },
  kvHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: space.sm, lineHeight: 16 },

  // Temperature band tag
  tempBandTag: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bodySemi, fontSize: 11, fontWeight: '700',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
    borderWidth: 1.5, borderColor: colors.border, color: colors.ink,
    marginTop: space.sm, overflow: 'hidden',
  },
  tempScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8, marginHorizontal: 6 },
  tempTick: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },

  // Input (Anthropic key)
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: space.md, paddingVertical: 10,
    fontFamily: fonts.body, fontSize: 14, color: colors.ink,
    marginTop: space.sm,
  },

  dim: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 16, marginTop: space.xs, marginBottom: space.sm },

  // Notification preview cards (Android-style heads-up)
  notif: {
    flexDirection: 'row',
    backgroundColor: '#1f1f1f',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  notifIcon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  notifIconText: { fontSize: 20 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  notifApp:  { fontFamily: fonts.bodyMedium, fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  notifTime: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  notifTitle:{ fontFamily: fonts.bodySemi, fontSize: 14, color: '#fff', fontWeight: '700' },
  notifBody: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 18 },
});
