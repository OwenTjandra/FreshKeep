import { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { getMe, type Me } from '../../lib/api';
import { colors, fonts, cardBase, sectionLabel, space } from '../../lib/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/Button';

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setMe(await getMe());
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!me && !error) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader title="Profile" subtitle={me?.email || 'demo user'} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={sectionLabel}>Fridge</Text>
      <View style={cardBase}>
        <Text style={styles.kvKey}>Temperature</Text>
        <Text style={styles.kvVal}>{me?.fridge_temp_setting ?? 37}°F</Text>
        <Text style={styles.kvHint}>Used by the engine to scale shelf-life. Tap below to recalibrate.</Text>
      </View>

      <View style={{ marginTop: space.md }}>
        <Button title="Re-run onboarding" variant="secondary" onPress={() => router.push('/onboarding')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space['2xl'], paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  error: { color: colors.red, fontFamily: fonts.body },
  kvKey: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  kvVal: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 2 },
  kvHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: space.sm },
});
