import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type ChoiceRowProps = {
  selected: boolean;
  label: string;
  detail?: string;
  icon?: string;
  onPress: () => void;
};

export function ChoiceRow({ selected, label, detail, icon, onPress }: ChoiceRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? theme.accentMuted : 'transparent',
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.78 : 1
        }
      ]}
    >
      {icon ? (
        <View style={[styles.leadingIcon, { backgroundColor: theme.surfaceMuted }]}>
          <AppIcon color={theme.text} name={icon} size={21} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {detail ? (
          <Text style={[styles.detail, { color: theme.textMuted }]}>{detail}</Text>
        ) : null}
      </View>
      <View
        style={[
          styles.check,
          {
            backgroundColor: selected ? theme.primary : 'transparent',
            borderColor: selected ? theme.primary : theme.textSubtle
          }
        ]}
      >
        <Text style={[styles.checkText, { color: theme.onPrimary }]}>
          {selected ? '✓' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginBottom: tokens.space.sm
  },
  leadingIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  copy: { flex: 1, marginHorizontal: tokens.space.md },
  label: { fontSize: 16, fontWeight: tokens.weight.bold },
  detail: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  check: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: tokens.radius.pill
  },
  checkText: { fontSize: 15, fontWeight: tokens.weight.bold }
});
