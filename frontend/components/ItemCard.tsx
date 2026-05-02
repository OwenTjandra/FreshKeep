import { View, Text, Pressable, StyleSheet } from 'react-native';

import {
  colors,
  fonts,
  radii,
  space,
  bucketForAction,
  bucketBg,
  bucketBadgeBg,
} from '../lib/theme';
import type { Item } from '../lib/api';

export function ItemCard({
  item,
  emoji,
  onPress,
}: {
  item: Item;
  emoji: string;
  onPress?: () => void;
}) {
  const bucket = bucketForAction(item.recommended_action);
  const iconBg = bucketBg(bucket);
  const badgeBg = bucketBadgeBg(bucket);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Text style={styles.iconText}>{emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {qtyLabel(item.quantity)} · {capitalize(item.location)}{item.opened ? ' · opened' : ''}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={styles.badgeText}>{badgeLabel(item.days_until_expiry)}</Text>
      </View>
    </Pressable>
  );
}

function qtyLabel(q: number): string {
  return q === 1 ? '1' : `${q}×`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function badgeLabel(d: number): string {
  if (d < 0) return `${-d}d past`;
  if (d === 0) return 'Today';
  if (d === 1) return '1 day';
  if (d < 7) return `${d} days`;
  if (d < 14) return '1 wk';
  if (d < 21) return '2 wks';
  if (d < 28) return '3 wks';
  return `${Math.round(d / 30)} mo`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: space.sm + 2,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.bodySemi,
    fontWeight: '600',
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  badgeText: {
    fontFamily: fonts.serifSemi,
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
