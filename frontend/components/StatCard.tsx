import { View, Text, StyleSheet } from 'react-native';

import { colors, fonts, radii, space } from '../lib/theme';

export function StatCard({
  num,
  label,
  variant,
}: {
  num: number;
  label: string;
  variant: 'urgent' | 'soon' | 'fresh';
}) {
  const bg = variant === 'urgent' ? colors.urgentBg
           : variant === 'soon'   ? colors.soonBg
           :                        colors.freshBg;
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={styles.num}>{num}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm + 2,
    alignItems: 'center',
  },
  num: {
    fontFamily: fonts.serif,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
    color: colors.ink,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.muted,
    marginTop: space.xs,
  },
});
