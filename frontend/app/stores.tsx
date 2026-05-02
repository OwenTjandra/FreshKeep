import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';

import { colors, fonts, space, hardShadow, cardBase } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';

// Store integrations — prototype only. The buttons don't actually connect
// to any retailer; the *flow* is what we're showing. The Costco mock
// connector lives in the backend (services/storeConnectors/costcoMock.js)
// and is wired up to be invocable as soon as we want the full pipeline.

type Store = {
  slug: string;
  name: string;
  logo: string;        // 2-letter abbrev for the bordered tile
  logoBg: string;
  status: string;
  connected?: boolean;
};

const CONNECTED: Store[] = [
  { slug: 'costco', name: 'Costco', logo: 'CO', logoBg: '#d8ebd9', status: 'Last sync · 2 hrs ago · 14 items', connected: true },
];

const AVAILABLE: Store[] = [
  { slug: 'whole-foods',   name: 'Whole Foods',   logo: 'WF', logoBg: '#fff4d6', status: 'Via Amazon account' },
  { slug: 'trader-joes',   name: "Trader Joe's",  logo: 'TJ', logoBg: '#ffe5dc', status: 'Receipt scan only' },
  { slug: 'safeway',       name: 'Safeway',       logo: 'SF', logoBg: '#e8e0f5', status: 'Via loyalty card' },
  { slug: 'walmart',       name: 'Walmart',       logo: 'WM', logoBg: '#dceaf8', status: 'Via Walmart+ account' },
  { slug: 'kroger',        name: 'Kroger',        logo: 'KR', logoBg: '#fbe5e7', status: 'Via Kroger Plus card' },
];

export default function Stores() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader
        title="Skip scanning"
        subtitle="Connect a store and your groceries land here automatically."
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          <Text style={styles.bold}>How it works.</Text> When you check out, the store
          sends your purchase list to FreshKeep with default expiry dates. You confirm,
          you're done. <Text style={styles.muted}>(Connections are visual-only in this prototype.)</Text>
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Connected</Text>
      {CONNECTED.length === 0
        ? <Text style={styles.empty}>None yet.</Text>
        : CONNECTED.map(s => <StoreRow key={s.slug} store={s} />)}

      <Text style={styles.sectionLabel}>Available</Text>
      {AVAILABLE.map(s => <StoreRow key={s.slug} store={s} />)}

      <Pressable
        onPress={() => Alert.alert('Request a store', 'Tell us where you shop and we\'ll prioritize it.')}
        style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.logo, { backgroundColor: colors.bg, borderStyle: 'dashed' }]}>
          <Text style={styles.logoTextMuted}>+</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.requestName}>Request another store</Text>
          <Text style={styles.statusLine}>Tell us where you shop</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </Pressable>
    </ScrollView>
  );
}

function StoreRow({ store }: { store: Store }) {
  function onTap() {
    if (store.connected) {
      Alert.alert('Already connected', `${store.name} synced 2 hours ago.`);
    } else {
      Alert.alert('Connect ' + store.name, 'Real connection arrives in a future build. Mock connector is wired up on the backend.');
    }
  }
  return (
    <Pressable onPress={onTap} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={[styles.logo, { backgroundColor: store.logoBg }]}>
        <Text style={styles.logoText}>{store.logo}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{store.name}</Text>
        <Text style={styles.statusLine}>{store.status}</Text>
      </View>
      <View style={[styles.btn, store.connected && styles.btnConnected]}>
        <Text style={[styles.btnText, store.connected && styles.btnTextConnected]}>
          {store.connected ? 'Synced' : 'Connect'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space.xl, paddingBottom: 60 },

  infoBox: {
    backgroundColor: colors.soonBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: space.md,
    marginBottom: space.md,
  },
  infoText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.ink },
  bold: { fontFamily: fonts.bodySemi, fontWeight: '600' },
  muted: { color: colors.muted },

  sectionLabel: {
    fontFamily: fonts.bodyMedium, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 1.2, color: colors.muted, marginTop: 18, marginBottom: 10,
  },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginBottom: space.sm },

  card: {
    ...cardBase,
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    marginBottom: space.sm + 2,
  },
  requestCard: {
    ...cardBase,
    borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    marginTop: space.md,
  },

  logo: {
    width: 44, height: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoText: {
    fontFamily: fonts.serif, fontSize: 14, fontWeight: '800', color: colors.ink,
  },
  logoTextMuted: { fontSize: 22, color: colors.muted },

  info: { flex: 1 },
  name: { fontFamily: fonts.bodySemi, fontWeight: '600', fontSize: 15, color: colors.ink },
  requestName: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.muted },
  statusLine: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },

  btn: {
    backgroundColor: colors.ink,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, ...hardShadow(2),
  },
  btnText: {
    color: colors.paper,
    fontFamily: fonts.bodySemi, fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  btnConnected: { backgroundColor: colors.green },
  btnTextConnected: { color: '#ffffff' },

  arrow: { fontSize: 18, color: colors.muted },
});
