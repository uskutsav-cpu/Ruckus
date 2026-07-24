import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type BackButtonProps = {
  label?: string;
  onPress: () => void;
};

export function BackButton({ label = 'Back', onPress }: BackButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.62 : 1 }]}
    >
      <View style={[styles.arrow, { backgroundColor: theme.surfaceMuted }]}>
        <Text style={[styles.arrowText, { color: theme.text }]}>←</Text>
      </View>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: tokens.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: tokens.space.lg
  },
  arrow: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill
  },
  arrowText: { fontSize: 19, fontWeight: tokens.weight.black },
  label: {
    marginLeft: tokens.space.sm,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.black
  }
});
