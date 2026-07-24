import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type ActionRowProps = {
  mark: string;
  title: string;
  description?: string;
  status?: string;
  tone?: 'neutral' | 'accent' | 'danger';
  disabled?: boolean;
  onPress: () => void;
};

export function ActionRow({
  mark,
  title,
  description,
  status,
  tone = 'neutral',
  disabled = false,
  onPress
}: ActionRowProps) {
  const { theme } = useTheme();
  const markBackground =
    tone === 'danger'
      ? tokens.color.coralSoft
      : tone === 'accent'
        ? theme.accentMuted
        : theme.surfaceMuted;
  const markColor =
    tone === 'danger' ? '#8B2522' : tone === 'accent' ? theme.accent : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          opacity: disabled ? 0.48 : pressed ? 0.72 : 1
        }
      ]}
    >
      <View style={[styles.mark, { backgroundColor: markBackground }]}>
        <Text style={[styles.markText, { color: markColor }]}>{mark}</Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {status ? (
            <Text style={[styles.status, { color: theme.textMuted }]}>{status}</Text>
          ) : null}
        </View>
        {description ? (
          <Text style={[styles.description, { color: theme.textMuted }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Text aria-hidden style={[styles.chevron, { color: theme.textSubtle }]}>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md
  },
  mark: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  markText: { fontSize: 19, fontWeight: tokens.weight.black },
  copy: { flex: 1, marginLeft: tokens.space.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: { flex: 1, fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  status: {
    marginLeft: tokens.space.sm,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.heavy,
    textTransform: 'uppercase'
  },
  description: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  chevron: {
    marginLeft: tokens.space.sm,
    fontSize: 28,
    fontWeight: tokens.weight.medium
  }
});
