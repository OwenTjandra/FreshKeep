import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

// Onboarding placeholder. Real fridge-temp slider + PATCH /api/users/me wiring
// arrives when we connect to the backend (Step 8 wires the API; the slider UX
// is built on top of the Step 6 endpoint).
export default function Onboarding() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 16 }}>
      <Text>Onboarding</Text>
      <Text style={{ color: '#888' }}>Fridge-temp slider arrives with the API wiring.</Text>
      <Button title="Continue to app" onPress={() => router.replace('/(tabs)')} />
    </View>
  );
}
