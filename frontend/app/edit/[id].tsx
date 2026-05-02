import { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { getItem, updateItem, type ItemLocation, type Item } from '../../lib/api';
import { CATEGORY_OPTIONS } from '../../lib/shelfLifeData';
import { colors, fonts, space } from '../../lib/theme';
import { Button } from '../../components/Button';

const LOCATIONS: ItemLocation[] = ['fridge', 'freezer', 'counter', 'pantry'];

export default function EditItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Item | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<ItemLocation>('fridge');
  const [opened, setOpened] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const fetched = await getItem(String(id));
        setItem(fetched);
        setName(fetched.name);
        setBarcode(fetched.barcode || '');
        setCategory(fetched.category || '');
        setLocation(fetched.location);
        setOpened(fetched.opened);
        setQuantity(String(fetched.quantity));
        setExpiryDate(new Date(fetched.expiry_date + 'T00:00:00'));
      } catch (err: any) {
        Alert.alert('Failed to load', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the item a name first.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      Alert.alert('Invalid quantity', 'Quantity must be a positive whole number.');
      return;
    }
    setSaving(true);
    try {
      // Note: opened/opened_at can't be patched here — those are managed via
      // the Mark Opened action on the Item Detail screen to keep the
      // opened-iff-opened_at invariant simple.
      await updateItem(String(id), {
        name: name.trim(),
        category: category || null,
        quantity: qty,
        location,
        expiry_date: toIsoDate(expiryDate),
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Could not save item');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (!item) return null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Edit item</Text>
      <Text style={styles.sub}>
        Fix any mistakes. To mark this item as opened or used, use the buttons on
        the item detail screen.
      </Text>

      <Field label="Name">
        <TextInput value={name} onChangeText={setName} placeholderTextColor={colors.muted} style={styles.input} />
      </Field>

      <Field label="Barcode (optional)">
        <TextInput
          value={barcode}
          onChangeText={setBarcode}
          placeholder="e.g. 0048001234"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          autoCapitalize="none"
          style={styles.input}
        />
      </Field>

      <Field label="Category">
        <View style={styles.pickerWrap}>
          <Picker selectedValue={category} onValueChange={setCategory}>
            <Picker.Item label="— select —" value="" />
            {CATEGORY_OPTIONS.map((opt) => (
              <Picker.Item key={opt.value} label={`${opt.emoji}  ${opt.label}`} value={opt.value} />
            ))}
          </Picker>
        </View>
      </Field>

      <Field label="Location">
        <View style={styles.pickerWrap}>
          <Picker selectedValue={location} onValueChange={(v) => setLocation(v as ItemLocation)}>
            {LOCATIONS.map((loc) => (<Picker.Item key={loc} label={cap(loc)} value={loc} />))}
          </Picker>
        </View>
      </Field>

      <Field label="Quantity">
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          style={styles.input}
        />
      </Field>

      <View style={styles.switchRow}>
        <Text style={styles.label}>Opened</Text>
        <Switch value={opened} disabled trackColor={{ true: colors.muted }} />
      </View>
      <Text style={styles.dim}>Toggle this from the item detail screen — it triggers the engine's expiry recompute.</Text>

      <Field label="Expiry date">
        {Platform.OS === 'android' && (
          <Button title={toIsoDate(expiryDate)} variant="secondary" onPress={() => setShowDatePicker(true)} />
        )}
        {showDatePicker && (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            onChange={(_event, d) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (d) setExpiryDate(d);
            }}
          />
        )}
      </Field>

      <View style={{ height: space.lg }} />
      <Button title={saving ? 'Saving…' : 'Save changes'} onPress={onSave} disabled={saving} />
      <View style={{ height: space.sm }} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space.xl, paddingBottom: 60, gap: space.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  heading: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginBottom: space.lg, lineHeight: 18 },
  field: { gap: 6, marginTop: space.sm },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: space.md, paddingVertical: 12,
    fontFamily: fonts.body, fontSize: 15, color: colors.ink,
  },
  pickerWrap: {
    backgroundColor: colors.paper,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.md, paddingVertical: space.sm,
  },
  dim: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, lineHeight: 14, marginTop: -space.xs },
});
