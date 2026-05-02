import { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import { suggestRecipe, updateItem, type RecipeResponse } from '../../lib/api';
import { colors, fonts, space, cardBase } from '../../lib/theme';
import { Button } from '../../components/Button';

export default function Recipe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try { setRecipe(await suggestRecipe(String(id))); }
    catch (err: any) { setError(err?.message || 'Failed to load recipe'); }
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onCookedIt() {
    try { await updateItem(String(id), { status: 'used' }); router.back(); }
    catch (err: any) { Alert.alert('Failed', err?.message || 'Could not mark used'); }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.dim}>Asking Claude for a recipe…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Try again" variant="secondary" onPress={load} />
      </View>
    );
  }
  if (!recipe) return null;

  if (recipe.type === 'reminder') {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.flag}>⚡ Use up</Text>
          <Text style={styles.title}>{recipe.title}</Text>
        </View>
        <View style={cardBase}>
          <Text style={styles.body}>{recipe.tip}</Text>
        </View>
        <View style={{ marginTop: space.lg }}>
          <Button title="Mark used" onPress={onCookedIt} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.flag}>⚡ Use today</Text>
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>⏱ {recipe.time}</Text>
          <Text style={styles.metaItem}>🔥 {recipe.difficulty}</Text>
        </View>
      </View>

      <Text style={styles.section}>Ingredients</Text>
      <View>
        {recipe.ingredients.map((ing, idx) => (
          <View key={idx} style={styles.ingredientRow}>
            <View style={[styles.dot, ing.expiring && { backgroundColor: colors.accent }]} />
            <Text style={[styles.ingredientText, ing.expiring && styles.expiring]}>
              {ing.amount} {ing.name}
              {ing.expiring && <Text style={styles.expiringTag}>  · expiring</Text>}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>Steps</Text>
      <View>
        {recipe.steps.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{idx + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: space.lg, gap: space.sm + 2 }}>
        <Button title="Cooked it · mark used →" onPress={onCookedIt} />
        <Button title="Get another recipe" variant="secondary" onPress={load} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: { padding: space.lg, paddingTop: space.xl, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg, gap: space.md, backgroundColor: colors.bg },
  dim: { color: colors.muted, fontFamily: fonts.body, marginTop: space.sm },
  error: { color: colors.red, textAlign: 'center', fontFamily: fonts.body },

  hero: {
    backgroundColor: colors.urgentBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: space.lg,
  },
  flag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    color: '#ffffff',
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    marginBottom: space.sm + 2,
    overflow: 'hidden',
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
    color: colors.ink,
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: space.sm },
  metaItem: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },

  section: {
    fontFamily: fonts.serifSemi, fontSize: 14, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    color: colors.ink, marginTop: space.lg, marginBottom: space.sm,
  },

  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  ingredientText: { fontSize: 14, color: colors.ink, fontFamily: fonts.body, flex: 1 },
  expiring: { color: colors.accent, fontFamily: fonts.bodyMedium },
  expiringTag: { fontFamily: fonts.body, fontSize: 11, color: colors.accent },

  stepRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.serifSemi, color: colors.paper, fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.ink },

  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
});
