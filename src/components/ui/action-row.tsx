import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { AppIcon } from '@/components/ui/app-icon';
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
          borderColor: theme.border,
          opacity: disabled ? 0.48 : pressed ? 0.72 : 1
        }
      ]}
    >
      <View style={[styles.mark, { backgroundColor: markBackground }]}>
        <AppIcon color={markColor} name={mark} size={20} />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: tokens.space.md
  },
  mark: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  copy: { flex: 1, marginLeft: tokens.space.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: { flex: 1, fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  status: {
    marginLeft: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  description: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.regular
  },
  chevron: {
    marginLeft: tokens.space.sm,
    fontSize: 28,
    fontWeight: tokens.weight.medium
  }
});
