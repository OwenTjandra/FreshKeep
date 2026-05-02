import { View, Text, StyleSheet } from 'react-native';

import { screenTitle, screenSubtitle, space } from '../lib/theme';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={screenTitle}>{title}</Text>
      {subtitle && <Text style={screenSubtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.sm,
  },
});
