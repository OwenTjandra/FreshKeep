import { View, Text } from 'react-native';

// Scanner placeholder (real expo-barcode-scanner integration arrives in Step 8).
export default function Scanner() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Text>Scanner</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Barcode scanning lands in Step 8.</Text>
    </View>
  );
}
