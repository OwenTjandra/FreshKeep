import { useState, useMemo } from 'react';
import { View, Text, TextInput, Button, Switch, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { createItem, type ScanResult, type ItemLocation } from '../../lib/api';

const LOCATIONS: ItemLocation[] = ['fridge', 'freezer', 'counter', 'pantry'];

// Set Details screen — review/edit the scanned product before saving.
// Receives `result` (JSON-encoded ScanResult) and `barcode` as params.
export default function SetDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ result?: string; barcode?: string }>();

  const scan: (ScanResult & { error?: string }) | null = useMemo(() => {
    if (!params.result) return null;
    try { return JSON.parse(params.result as string); } catch { return null; }
  }, [params.result]);

  const found = !!scan && scan.found === true;
  const initialDays = found && scan.shelf_life ? scan.shelf_life.days_typical : 7;

  const [name, setName] = useState<string>(found ? (scan.name || '') : '');
  const [category, setCategory] = useState<string>(found ? (scan.category || '') : '');
  const [location, setLocation] = useState<ItemLocation>('fridge');
  const [opened, setOpened] = useState<boolean>(false);
  const [expiryDate, setExpiryDate] = useState<Date>(daysFromNow(initialDays));
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios'); // iOS uses inline; Android uses dialog
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the item a name first.');
      return;
    }
    setSaving(true);
    try {
      await createItem({
        name: name.trim(),
        category: category.trim() || null,
        barcode: (params.barcode as string) || null,
        location,
        opened,
        expiry_date: toIsoDate(expiryDate),
        quantity: 1,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Could not save item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Set Details</Text>

      {scan?.error && (
        <Text style={styles.warn}>Scan service error: {scan.error}. You can still enter manually.</Text>
      )}
      {!found && (
        <Text style={styles.warn}>
          {scan?.barcode ? `Barcode ${scan.barcode} not in Open Food Facts.` : 'Manual entry.'}
        </Text>
      )}

      <Field label="Name">
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Whole milk" style={styles.input} />
      </Field>

      <Field label="Category">
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. dairy_milk"
          autoCapitalize="none"
          style={styles.input}
        />
      </Field>

      <Field label="Location">
        <Picker selectedValue={location} onValueChange={(v) => setLocation(v as ItemLocation)}>
          {LOCATIONS.map((loc) => (
            <Picker.Item key={loc} label={loc} value={loc} />
          ))}
        </Picker>
      </Field>

      <Field label="Already opened?">
        <Switch value={opened} onValueChange={setOpened} />
      </Field>

      <Field label="Expiry date">
        {Platform.OS === 'android' && (
          <Button title={toIsoDate(expiryDate)} onPress={() => setShowDatePicker(true)} />
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

      <View style={{ height: 16 }} />
      <Button title={saving ? 'Saving…' : 'Save'} onPress={onSave} disabled={saving} />
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

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function toIsoDate(d: Date): string {
  // YYYY-MM-DD in local time (matches the backend's DATE column).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  heading: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  field: { gap: 4 },
  label: { fontSize: 14, color: '#666', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  warn: { color: '#a40', backgroundColor: '#fff6e0', padding: 8, borderRadius: 6 },
});
