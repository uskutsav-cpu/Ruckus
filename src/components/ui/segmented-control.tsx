import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type SegmentedControlProps<T extends string> = {
  accessibilityLabel: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  accessibilityLabel,
  value,
  options,
  onChange
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.control, { backgroundColor: theme.surfaceMuted }]}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? theme.surfaceElevated : 'transparent',
                opacity: pressed ? 0.68 : 1
              },
              selected && tokens.shadow.floating
            ]}
          >
            <Text
              style={[styles.label, { color: selected ? theme.text : theme.textMuted }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    minHeight: 52,
    flexDirection: 'row',
    borderRadius: tokens.radius.pill,
    padding: 4
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm
  },
  label: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black,
    textAlign: 'center'
  }
});
