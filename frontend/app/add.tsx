import { useState } from 'react';
import { View, Text, TextInput, Switch, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { createItem, type ItemLocation } from '../lib/api';
import { CATEGORY_OPTIONS, findShelfLife } from '../lib/shelfLifeData';
import { colors, fonts, cardBase, space } from '../lib/theme';
import { Button } from '../components/Button';

const LOCATIONS: ItemLocation[] = ['fridge', 'freezer', 'counter', 'pantry'];

export default function AddItem() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [location, setLocation] = useState<ItemLocation>('fridge');
  const [opened, setOpened] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date>(daysFromNow(7));
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [saving, setSaving] = useState(false);

  // When the user picks a category, pre-fill expiry from USDA shelf-life.
  function onCategoryChange(value: string) {
    setCategory(value);
    if (value) {
      const row = findShelfLife(value, location, opened);
      if (row) setExpiryDate(daysFromNow(row.days_typical));
    }
  }

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the item a name first.');
      return;
    }
    setSaving(true);
    try {
      await createItem({
        name: name.trim(),
        category: category || null,
        location,
        opened,
        expiry_date: toIsoDate(expiryDate),
        quantity: 1,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Could not save item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Add an item</Text>
      <Text style={styles.sub}>Pick a category and we'll suggest an expiry date from USDA data. You can override anything.</Text>

      <Field label="Name">
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Whole milk" placeholderTextColor={colors.muted} style={styles.input} />
      </Field>

      <Field label="Category">
        <View style={styles.pickerWrap}>
          <Picker selectedValue={category} onValueChange={onCategoryChange}>
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

      <View style={styles.switchRow}>
        <Text style={styles.label}>Already opened?</Text>
        <Switch value={opened} onValueChange={setOpened} trackColor={{ true: colors.accent }} />
      </View>

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
      <Button title={saving ? 'Saving…' : 'Add to fridge'} onPress={onSave} disabled={saving} />
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

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space.xl, paddingBottom: 60, gap: space.sm },
  heading: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginBottom: space.lg },
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
});
