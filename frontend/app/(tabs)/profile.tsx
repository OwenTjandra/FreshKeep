import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function Profile() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 16 }}>
      <Text>Profile</Text>
      <Button title="Re-run onboarding" onPress={() => router.push('/onboarding')} />
    </View>
  );
}
