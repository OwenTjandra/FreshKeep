import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

// Home (Step 9 will replace this with the action-grouped dashboard).
export default function Home() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 16 }}>
      <Text>Home</Text>
      <Button title="Open sample item detail" onPress={() => router.push('/item/sample-id')} />
      <Button title="Open recipe for sample item" onPress={() => router.push('/recipe/sample-id')} />
      <Button title="Open onboarding" onPress={() => router.push('/onboarding')} />
    </View>
  );
}
