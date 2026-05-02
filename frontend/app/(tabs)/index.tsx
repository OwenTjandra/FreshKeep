import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { listItems, updateItem, type Item } from '../../lib/api';
import { writeWidgetCache } from '../../lib/widgetCache';
import { colors, fonts, hardShadow, sectionLabel, space } from '../../lib/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StatCard } from '../../components/StatCard';
import { ItemCard } from '../../components/ItemCard';
import { Button } from '../../components/Button';

// Map our category taxonomy → emoji for the item-card icons.
const CATEGORY_EMOJI: Record<string, string> = {
  dairy_milk: '🥛', dairy_yogurt: '🥄', dairy_cheese_hard: '🧀', dairy_cheese_soft: '🧀',
  dairy_butter: '🧈', meat_chicken: '🍗', meat_beef: '🥩', meat_beef_ground: '🥩',
  meat_pork: '🥓', meat_fish: '🐟', produce_leafy: '🥬', produce_hard_veg: '🥕',
  produce_soft_fruit: '🍑', produce_hard_fruit: '🍎', produce_berries: '🍓',
  eggs: '🥚', bread: '🍞', deli: '🥪', pantry_dry_goods: '🌾', pantry_canned: '🥫',
};

type SectionKey = 'eat_now' | 'eat_soon' | 'freeze_now' | 'use_in_recipe' | 'past' | 'safe';
const SECTIONS: Array<{
  key: SectionKey;
  title: string;
  actions: Array<NonNullable<Item['recommended_action']>>;
}> = [
  { key: 'eat_now',       title: 'Eat today',            actions: ['eat_now'] },
  { key: 'eat_soon',      title: 'Use this week',        actions: ['eat_soon'] },
  { key: 'freeze_now',    title: 'Freeze now to save',   actions: ['freeze_now'] },
  { key: 'use_in_recipe', title: 'Cook tonight',         actions: ['use_in_recipe'] },
  { key: 'past',          title: 'Past date — check it', actions: ['compost', 'monitor'] },
  { key: 'safe',          title: 'All good',             actions: ['safe'] },
];

function emojiFor(category: string | null): string {
  if (!category) return '🍽️';
  return CATEGORY_EMOJI[category] ?? '🍽️';
}

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await listItems({ status: 'active' });
      setItems(r.items);
      writeWidgetCache(r.items).catch((e) => console.warn('widget cache write failed:', e));
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
      setItems([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function markFrozen(item: Item) {
    try {
      await updateItem(item.id, { location: 'freezer' });
      await load();
    } catch (err: any) {
      Alert.alert('Failed to mark frozen', err?.message || 'Unknown error');
    }
  }

  if (items === null && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Bucket items.
  const grouped: Record<SectionKey, Item[]> = {
    eat_now: [], eat_soon: [], freeze_now: [], use_in_recipe: [], past: [], safe: [],
  };
  for (const item of items || []) {
    const a = item.recommended_action;
    const sec = a ? SECTIONS.find(s => (s.actions as string[]).includes(a)) : undefined;
    if (sec) grouped[sec.key].push(item);
    else grouped.safe.push(item);
  }

  const urgent =
    grouped.eat_now.length +
    grouped.use_in_recipe.filter(i => i.action_priority === 1).length +
    grouped.past.filter(i => i.recommended_action === 'compost').length;
  const thisWeek =
    grouped.eat_soon.length +
    grouped.freeze_now.length +
    grouped.use_in_recipe.filter(i => i.action_priority === 2).length;
  const fresh = grouped.safe.length;

  const totalTracked = items?.length ?? 0;
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <ScreenHeader
            title="Your kitchen"
            subtitle={`${todayLabel} · ${totalTracked} item${totalTracked === 1 ? '' : 's'} tracked`}
          />
        </View>
        <Pressable
          onPress={() => router.push('/add')}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatCard num={urgent}   label="Today"     variant="urgent" />
        <StatCard num={thisWeek} label="This week" variant="soon" />
        <StatCard num={fresh}    label="Fresh"     variant="fresh" />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {SECTIONS.map(sec => {
        const list = grouped[sec.key];
        if (list.length === 0) return null;
        return (
          <View key={sec.key} style={{ marginTop: space.md }}>
            <Text style={sectionLabel}>{sec.title}</Text>
            {list.map(item => (
              <View key={item.id}>
                <ItemCard
                  item={item}
                  emoji={emojiFor(item.category)}
                  onPress={() => router.push(`/item/${item.id}`)}
                />
                {sec.key === 'freeze_now' && (
                  <View style={styles.inlineAction}>
                    <Button title="Mark frozen" variant="secondary" onPress={() => markFrozen(item)} />
                  </View>
                )}
                {sec.key === 'use_in_recipe' && (
                  <View style={styles.inlineAction}>
                    <Button title="Get recipe →" variant="secondary" onPress={() => router.push(`/recipe/${item.id}`)} />
                  </View>
                )}
              </View>
            ))}
          </View>
        );
      })}

      {(items?.length ?? 0) === 0 && !error && (
        <Text style={styles.empty}>
          No items yet. Tap the orange button below to scan one.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space['2xl'], paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  statsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },

  error: {
    color: colors.red,
    backgroundColor: colors.urgentBg,
    padding: space.sm + 2,
    borderRadius: 6,
    marginTop: space.md,
    fontFamily: fonts.body,
  },

  empty: {
    color: colors.muted,
    fontFamily: fonts.body,
    textAlign: 'center',
    marginTop: 60,
  },

  inlineAction: {
    marginTop: -space.xs,
    marginBottom: space.sm + 2,
    marginLeft: space.lg + 32,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.accent,
    marginTop: 6,
    ...hardShadow(2),
  },
  addBtnText: {
    color: '#ffffff',
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
