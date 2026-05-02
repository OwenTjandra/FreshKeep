import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fonts, space, hardShadow } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button } from '../components/Button';

// Receipt scanner — prototype-only landing screen. Real implementation
// (Claude Sonnet 4.5 vision API parsing the photo into line items) lands
// in a future commit. Manual entry is the working fallback.

export default function ScanReceipt() {
  const router = useRouter();
  return (
    <View style={styles.scroll}>
      <View style={styles.container}>
        <ScreenHeader
          title="Scan a receipt"
          subtitle="Snap your receipt and we'll add every item at once."
        />

        <Pressable
          onPress={() => Alert.alert(
            'Coming soon',
            'Receipt parsing via Claude vision is the next feature in. For now, tap "Add manually" below.',
          )}
          style={({ pressed }) => [styles.viewport, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.icon}>📷</Text>
          <Text style={styles.viewportTitle}>Tap to take a photo</Text>
          <Text style={styles.viewportHint}>Hold steady, frame the whole receipt</Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>COMING SOON</Text>
          </View>
        </Pressable>

        <Text style={styles.or}>or</Text>

        <Button title="Add an item manually" onPress={() => router.push('/add')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space.xl, gap: space.md },

  viewport: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: space.lg,
    ...hardShadow(3),
  },
  icon: { fontSize: 48, marginBottom: 6 },
  viewportTitle: { fontFamily: fonts.serifSemi, fontSize: 20, color: '#ffffff', fontWeight: '700' },
  viewportHint: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  tag: {
    marginTop: 12,
    backgroundColor: colors.accent,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 100,
  },
  tagText: {
    color: '#ffffff', fontFamily: fonts.bodySemi,
    fontSize: 10, fontWeight: '700',
    letterSpacing: 1,
  },

  or: {
    fontFamily: fonts.body, fontSize: 13, color: colors.muted,
    textAlign: 'center', marginVertical: space.md,
  },
});
