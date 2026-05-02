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
  suggestRecipe,
  updateItem,
  type RecipeResponse,
} from '../../lib/api';

const ACCENT = '#d97706'; // amber — used to highlight the expiring ingredient

export default function Recipe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setRecipe(await suggestRecipe(String(id)));
    } catch (err: any) {
      setError(err?.message || 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onCookedIt() {
    try {
      await updateItem(String(id), { status: 'used' });
      router.back();
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Could not mark used');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.dim}>Asking Claude for a recipe…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Try again" onPress={load} />
      </View>
    );
  }
  if (!recipe) return null;

  if (recipe.type === 'reminder') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.reminderCard}>
          <Text style={styles.reminderText}>{recipe.tip}</Text>
        </View>
        <View style={{ height: 16 }} />
        <Button title="Mark used" onPress={onCookedIt} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{recipe.title}</Text>
      <Text style={styles.meta}>
        {recipe.time} · {recipe.difficulty}
      </Text>

      <Section label="Ingredients">
        {recipe.ingredients.map((ing, idx) => (
          <View key={idx} style={styles.ingredientRow}>
            <Text style={[styles.ingredientName, ing.expiring && styles.expiring]}>
              {ing.expiring ? '★ ' : ''}{ing.name}
            </Text>
            <Text style={styles.ingredientAmount}>{ing.amount}</Text>
          </View>
        ))}
      </Section>

      <Section label="Steps">
        {recipe.steps.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <Text style={styles.stepNum}>{idx + 1}.</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </Section>

      <View style={styles.actions}>
        <Button title="Cooked it" onPress={onCookedIt} />
        <Button title="Get another recipe" onPress={load} />
      </View>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, paddingBottom: 32 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 12 },
  dim:       { color: '#888', marginTop: 8 },
  error:     { color: '#a00', textAlign: 'center' },

  title: { fontSize: 22, fontWeight: '600' },
  meta:  { fontSize: 13, color: '#666', marginBottom: 8 },

  section: { marginTop: 12, gap: 6 },
  sectionLabel: { fontSize: 13, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody:  { gap: 6 },

  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  ingredientName:   { fontSize: 15 },
  ingredientAmount: { fontSize: 14, color: '#666' },
  expiring:         { color: ACCENT, fontWeight: '600' },

  stepRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  stepNum: { width: 22, color: '#666', fontVariant: ['tabular-nums'] },
  stepText:{ flex: 1, fontSize: 15, lineHeight: 22 },

  actions: { marginTop: 24, gap: 8 },

  reminderCard: {
    backgroundColor: '#fff8e0',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  reminderText: { fontSize: 15, lineHeight: 22 },
});
