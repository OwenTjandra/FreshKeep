import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Button,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { listItems, updateItem, type Item } from '../../lib/api';
import { writeWidgetCache } from '../../lib/widgetCache';

// ───────────────────────────────────────────────────────────
// Section config — order matches the user's spec for Step 9.
// ───────────────────────────────────────────────────────────

type SectionKey = 'eat_now' | 'eat_soon' | 'freeze_now' | 'use_in_recipe' | 'past' | 'safe';

const SECTIONS: Array<{
  key: SectionKey;
  title: string;
  actions: Array<NonNullable<Item['recommended_action']>>;
  defaultCollapsed?: boolean;
}> = [
  { key: 'eat_now',       title: 'Eat today',            actions: ['eat_now'] },
  { key: 'eat_soon',      title: 'Use this week',        actions: ['eat_soon'] },
  { key: 'freeze_now',    title: 'Freeze now to save',   actions: ['freeze_now'] },
  { key: 'use_in_recipe', title: 'Cook tonight',         actions: ['use_in_recipe'] },
  { key: 'past',          title: 'Past date — check it', actions: ['compost', 'monitor'] },
  { key: 'safe',          title: 'All good',             actions: ['safe'], defaultCollapsed: true },
];

// ───────────────────────────────────────────────────────────
// Screen
// ───────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ safe: true });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await listItems({ status: 'active' });
      setItems(r.items);
      // Step 11: keep the widget's shared JSON in sync on every refresh.
      // Failures here are non-fatal — log and move on.
      writeWidgetCache(r.items).catch((e) => console.warn('widget cache write failed:', e));
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
      setItems([]);
    }
  }, []);

  // Reload on every focus — items change after Set Details / mark frozen / item detail actions.
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
        <ActivityIndicator />
      </View>
    );
  }

  // Bucket items into sections by their action.
  const grouped: Record<SectionKey, Item[]> = {
    eat_now: [], eat_soon: [], freeze_now: [], use_in_recipe: [], past: [], safe: [],
  };
  for (const item of items || []) {
    const a = item.recommended_action;
    const sec = a ? SECTIONS.find(s => (s.actions as string[]).includes(a)) : undefined;
    if (sec) grouped[sec.key].push(item);
    else grouped.safe.push(item); // null action falls through as safe-ish
  }

  // Stat cards. "Urgent" = priority-1 actions; "This week" = priority-2; "Fresh" = safe.
  const urgent =
    grouped.eat_now.length +
    grouped.use_in_recipe.filter(i => i.action_priority === 1).length +
    grouped.past.filter(i => i.recommended_action === 'compost').length;
  const thisWeek =
    grouped.eat_soon.length +
    grouped.freeze_now.length +
    grouped.use_in_recipe.filter(i => i.action_priority === 2).length;
  const fresh = grouped.safe.length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsRow}>
        <Stat label="Urgent" value={urgent} />
        <Stat label="This week" value={thisWeek} />
        <Stat label="Fresh" value={fresh} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {SECTIONS.map(sec => {
        const list = grouped[sec.key];
        if (list.length === 0) return null;
        const isCollapsed = collapsed[sec.key] ?? !!sec.defaultCollapsed;
        return (
          <View key={sec.key} style={styles.section}>
            <Pressable
              onPress={() => setCollapsed(c => ({ ...c, [sec.key]: !isCollapsed }))}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>{sec.title} ({list.length})</Text>
              <Text style={styles.sectionToggle}>{isCollapsed ? '▾' : '▴'}</Text>
            </Pressable>
            {!isCollapsed && list.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                onPress={() => router.push(`/item/${item.id}`)}
                onCookTonight={
                  sec.key === 'use_in_recipe'
                    ? () => router.push(`/recipe/${item.id}`)
                    : undefined
                }
                onMarkFrozen={
                  sec.key === 'freeze_now' ? () => markFrozen(item) : undefined
                }
              />
            ))}
          </View>
        );
      })}

      {(items?.length ?? 0) === 0 && !error && (
        <Text style={styles.empty}>
          No items yet. Tap the Scan tab to add one.
        </Text>
      )}
    </ScrollView>
  );
}

// ───────────────────────────────────────────────────────────
// Bits
// ───────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ItemRow({
  item,
  onPress,
  onMarkFrozen,
  onCookTonight,
}: {
  item: Item;
  onPress: () => void;
  onMarkFrozen?: () => void;
  onCookTonight?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemMeta}>
          {formatDays(item.days_until_expiry)}
          {item.opened ? ' · opened' : ''}
          {item.location !== 'fridge' ? ` · ${item.location}` : ''}
        </Text>
        {item.action_reason && (
          <Text style={styles.itemReason}>{item.action_reason}</Text>
        )}
      </View>
      {onMarkFrozen && <Button title="Mark frozen" onPress={onMarkFrozen} />}
      {onCookTonight && <Button title="Recipe" onPress={onCookTonight} />}
    </Pressable>
  );
}

function formatDays(d: number): string {
  if (d < 0) return `${-d}d past`;
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `${d}d left`;
}

// ───────────────────────────────────────────────────────────
// Styles — minimal; visual polish comes later.
// ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsRow: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1, padding: 12, backgroundColor: '#f3f3f3', borderRadius: 8, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '600' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },

  error: { color: '#a00', backgroundColor: '#fee', padding: 8, borderRadius: 6 },
  empty: { color: '#666', textAlign: 'center', marginTop: 32 },

  section: { gap: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  sectionToggle: { fontSize: 16, color: '#888' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemMeta: { fontSize: 13, color: '#666', marginTop: 2 },
  itemReason: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
});
