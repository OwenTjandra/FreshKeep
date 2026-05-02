import { View, Text, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 16 }}>
      <Text>Item Detail</Text>
      <Text style={{ color: '#888' }}>id: {String(id)}</Text>
      <Button
        title="Get recipe for this item"
        onPress={() => router.push(`/recipe/${id}`)}
      />
    </View>
  );
}
