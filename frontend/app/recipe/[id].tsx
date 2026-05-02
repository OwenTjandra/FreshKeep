import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function Recipe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 16 }}>
      <Text>Recipe</Text>
      <Text style={{ color: '#888' }}>for item id: {String(id)}</Text>
    </View>
  );
}
