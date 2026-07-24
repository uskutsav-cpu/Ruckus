import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type ChoiceRowProps = {
  selected: boolean;
  label: string;
  detail?: string;
  onPress: () => void;
};

export function ChoiceRow({ selected, label, detail, onPress }: ChoiceRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? theme.surfaceMuted : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.8 : 1
        }
      ]}
    >
      <View
        style={[
          styles.check,
          {
            backgroundColor: selected ? theme.primary : 'transparent',
            borderColor: selected ? theme.primary : theme.textMuted
          }
        ]}
      >
        <Text style={styles.checkText}>{selected ? '✓' : ''}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {detail ? (
          <Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginBottom: tokens.space.sm
  },
  check: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 8
  },
  checkText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  copy: { flex: 1, marginLeft: tokens.space.md },
  label: { fontSize: 16, fontWeight: '800' },
  detail: { marginTop: 3, fontSize: 13, lineHeight: 18 }
});
