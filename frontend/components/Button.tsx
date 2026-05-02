import { Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';

import { colors, fonts, hardShadow, radii, space } from '../lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [
      styles.base,
      isPrimary && styles.primary,
      isSecondary && styles.secondary,
      variant === 'ghost' && styles.ghost,
      disabled && styles.disabled,
      pressed && !disabled && { opacity: 0.85 },
      style,
    ]}>
      <Text
        style={[
          styles.label,
          isPrimary && styles.labelPrimary,
          (isSecondary || variant === 'ghost') && styles.labelSecondary,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.accent,
    ...hardShadow(3),
  },
  secondary: {
    backgroundColor: colors.paper,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '600',
  },
  labelPrimary: {
    color: '#ffffff',
  },
  labelSecondary: {
    color: colors.ink,
  },
});
