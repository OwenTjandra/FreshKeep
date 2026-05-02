import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import {
  getItem,
  updateItem,
  markItemOpened,
  markItemStillFine,
  deleteItem,
  type Item,
} from '../../lib/api';

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const fetched = await getItem(String(id));
      setItem(fetched);
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Wraps each action: set busy, run, refetch on success.
  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err: any) {
      Alert.alert('Action failed', err?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function onMarkOpened()    { await withBusy(() => markItemOpened(String(id))); }
  async function onMarkFrozen()    { await withBusy(() => updateItem(String(id), { location: 'freezer' })); }
  async function onMarkUsed()      { await withBusy(() => updateItem(String(id), { status: 'used' })); }
  async function onTossIt()        { await withBusy(() => updateItem(String(id), { status: 'tossed' })); }
  async function onStillLooksFine(){ await withBusy(() => markItemStillFine(String(id))); }

  async function onDelete() {
    Alert.alert('Delete item?', 'This removes the item from history entirely.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => withBusy(async () => {
          await deleteItem(String(id));
          router.back();
        }),
      },
    ]);
  }

  if (!item && !error) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Retry" onPress={load} />
      </View>
    );
  }
  if (!item) return null;

  // ────── Action button visibility per spec + engine state ──────
  const showMarkOpened = !item.opened && item.status === 'active';
  const showMarkFrozen = item.location !== 'freezer'
                         && item.freezable !== false
                         && item.status === 'active';
  const showMarkUsed   = item.status === 'active';
  const showTossIt     = item.status === 'active';
  const showStillFine  = item.days_until_expiry < 0
                         && item.status === 'active'
                         && !isWithinFineGrace(item.user_marked_fine_at);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>
        {formatDays(item.days_until_expiry)}
        {' · '}{item.location}
        {item.opened ? ' · opened' : ''}
        {item.quantity > 1 ? ` · qty ${item.quantity}` : ''}
        {' · '}{item.status}
      </Text>

      {item.recommended_action && (
        <View style={styles.actionCard}>
          <Text style={styles.actionLabel}>{labelForAction(item.recommended_action)}</Text>
          {item.action_reason && <Text style={styles.actionReason}>{item.action_reason}</Text>}
        </View>
      )}

      <View style={styles.actions}>
        {showMarkOpened && <Button title="Mark opened"      onPress={onMarkOpened}     disabled={busy} />}
        {showMarkFrozen && <Button title="Mark frozen"      onPress={onMarkFrozen}     disabled={busy} />}
        {showStillFine  && <Button title="Still looks fine" onPress={onStillLooksFine} disabled={busy} />}
        {showMarkUsed   && <Button title="Mark used"        onPress={onMarkUsed}       disabled={busy} />}
        {showTossIt     && <Button title="Toss it"          onPress={onTossIt}         disabled={busy} />}
        <View style={{ height: 16 }} />
        <Button title="Delete from history" color="#a00" onPress={onDelete} disabled={busy} />
      </View>

      <View style={{ height: 24 }} />
      <Section label="Details">
        <KV k="Category"    v={item.category || '—'} />
        <KV k="Barcode"     v={item.barcode  || '—'} />
        <KV k="Expiry"      v={item.expiry_date} />
        <KV k="Opened at"   v={item.opened_at || '—'} />
        <KV k="Freezable"   v={item.freezable === null ? 'unknown' : item.freezable ? 'yes' : 'no'} />
      </Section>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBox}>{children}</View>
    </View>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

function formatDays(d: number): string {
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} past`;
  if (d === 0) return 'expires today';
  if (d === 1) return 'expires tomorrow';
  return `expires in ${d} days`;
}

function labelForAction(a: NonNullable<Item['recommended_action']>): string {
  switch (a) {
    case 'eat_now':       return 'Eat today';
    case 'eat_soon':      return 'Use this week';
    case 'freeze_now':    return 'Freeze now to save';
    case 'use_in_recipe': return 'Cook tonight';
    case 'monitor':       return 'Past date — recheck';
    case 'compost':       return 'Past date — toss it';
    case 'safe':          return 'All good';
  }
}

function isWithinFineGrace(ts: string | null): boolean {
  if (!ts) return false;
  const ms = Date.now() - new Date(ts).getTime();
  return ms >= 0 && ms < 24 * 60 * 60 * 1000;
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 12 },
  error:     { color: '#a00' },

  name: { fontSize: 22, fontWeight: '600' },
  meta: { fontSize: 14, color: '#666' },

  actionCard: {
    backgroundColor: '#f3f8ff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    gap: 4,
  },
  actionLabel:  { fontSize: 16, fontWeight: '600' },
  actionReason: { fontSize: 13, color: '#555', fontStyle: 'italic' },

  actions: { gap: 8 },

  sectionLabel: { fontSize: 13, color: '#666', marginTop: 12 },
  sectionBox: { backgroundColor: '#fafafa', borderRadius: 6, padding: 12, gap: 4 },
  kv: { flexDirection: 'row', gap: 8 },
  kvKey: { width: 90, color: '#666', fontSize: 13 },
  kvVal: { flex: 1, fontSize: 13 },
});
