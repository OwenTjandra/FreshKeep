import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, fonts, space, cardBase } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button } from '../components/Button';

export default function Onboarding() {
  const router = useRouter();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader
        title="Welcome to FreshKeep"
        subtitle="Track what's in your fridge. Get smart nudges before things spoil."
      />
      <View style={cardBase}>
        <Text style={styles.h}>How it works</Text>
        <Text style={styles.p}>
          Scan barcodes or import groceries from a connected store. We watch what's expiring
          and tell you whether to eat it, freeze it, or cook it tonight.
        </Text>
      </View>

      <View style={{ marginTop: space.lg }}>
        <Button title="Continue to app" onPress={() => router.replace('/(tabs)')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space['2xl'], gap: space.md },
  h: { fontFamily: fonts.serifSemi, fontSize: 18, color: colors.ink, marginBottom: space.sm },
  p: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 20 },
});
