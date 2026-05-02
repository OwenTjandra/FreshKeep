import { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import {
  getItem, updateItem, markItemOpened, markItemStillFine, deleteItem, type Item,
} from '../../lib/api';
import {
  colors, fonts, cardBase, space, bucketForAction, bucketBg, bucketBadgeBg,
} from '../../lib/theme';
import { Button } from '../../components/Button';

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
      setItem(await getItem(String(id)));
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); await load(); }
    catch (err: any) { Alert.alert('Action failed', err?.message || 'Unknown error'); }
    finally { setBusy(false); }
  }

  async function onMarkOpened()    { await withBusy(() => markItemOpened(String(id))); }
  async function onMarkFrozen()    { await withBusy(() => updateItem(String(id), { location: 'freezer' })); }
  async function onMarkUsed()      { await withBusy(() => updateItem(String(id), { status: 'used' })); }
  async function onTossIt()        { await withBusy(() => updateItem(String(id), { status: 'tossed' })); }
  async function onStillLooksFine(){ await withBusy(() => markItemStillFine(String(id))); }

  async function onDelete() {
    Alert.alert('Delete item?', 'This removes the item from history entirely.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => withBusy(async () => {
        await deleteItem(String(id));
        router.back();
      })},
    ]);
  }

  if (!item && !error) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Retry" variant="secondary" onPress={load} />
      </View>
    );
  }
  if (!item) return null;

  const bucket = bucketForAction(item.recommended_action);
  const showMarkOpened = !item.opened && item.status === 'active';
  const showMarkFrozen = item.location !== 'freezer' && item.freezable !== false && item.status === 'active';
  const showMarkUsed   = item.status === 'active';
  const showTossIt     = item.status === 'active';
  const showStillFine  = item.days_until_expiry < 0 && item.status === 'active'
                         && !isWithinFineGrace(item.user_marked_fine_at);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>
        {formatDays(item.days_until_expiry)} · {item.location}{item.opened ? ' · opened' : ''}
      </Text>

      {item.recommended_action && (
        <View style={[styles.actionCard, { backgroundColor: bucketBg(bucket) }]}>
          <View style={[styles.pill, { backgroundColor: bucketBadgeBg(bucket) }]}>
            <Text style={styles.pillText}>{labelForAction(item.recommended_action)}</Text>
          </View>
          {item.action_reason && <Text style={styles.actionReason}>{item.action_reason}</Text>}
        </View>
      )}

      <View style={styles.actions}>
        {showMarkOpened && <Button title="Mark opened"      onPress={onMarkOpened}     disabled={busy} />}
        {showMarkFrozen && <Button title="Mark frozen"      variant="secondary" onPress={onMarkFrozen}     disabled={busy} />}
        {showStillFine  && <Button title="Still looks fine" variant="secondary" onPress={onStillLooksFine} disabled={busy} />}
        {showMarkUsed   && <Button title="Mark used"        variant="secondary" onPress={onMarkUsed}       disabled={busy} />}
        {showTossIt     && <Button title="Toss it"          variant="secondary" onPress={onTossIt}         disabled={busy} />}
        <Button title="Edit details"  variant="ghost" onPress={() => router.push(`/edit/${item.id}`)} disabled={busy} />
      </View>

      <Text style={styles.section}>Details</Text>
      <View style={cardBase}>
        <KV k="Category"  v={item.category || '—'} />
        <KV k="Barcode"   v={item.barcode  || '—'} />
        <KV k="Expiry"    v={item.expiry_date} />
        <KV k="Opened at" v={item.opened_at || '—'} />
        <KV k="Freezable" v={item.freezable === null ? 'unknown' : item.freezable ? 'yes' : 'no'} />
      </View>

      <View style={{ marginTop: space.lg }}>
        <Button title="Delete from history" variant="ghost" onPress={onDelete} disabled={busy} />
      </View>
    </ScrollView>
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
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space.xl, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg, gap: space.md, backgroundColor: colors.bg },
  error: { color: colors.red, fontFamily: fonts.body },

  name: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginBottom: space.lg },

  actionCard: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 16,
    padding: space.lg, marginBottom: space.lg, gap: space.sm,
  },
  pill: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 100, borderWidth: 1.5, borderColor: colors.border,
  },
  pillText: { fontFamily: fonts.serifSemi, fontSize: 12, fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionReason: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 20 },

  actions: { gap: space.sm + 2, marginBottom: space.xl },

  section: { fontFamily: fonts.body, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: colors.muted, marginBottom: space.sm },
  kv: { flexDirection: 'row', paddingVertical: 6, gap: space.sm, borderBottomColor: 'rgba(0,0,0,0.08)' },
  kvKey: { width: 90, color: colors.muted, fontSize: 13, fontFamily: fonts.body },
  kvVal: { flex: 1, fontSize: 13, color: colors.ink, fontFamily: fonts.body },
});
