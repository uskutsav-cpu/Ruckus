import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  help?: string;
};

export function TextField({ label, error, help, style, ...props }: TextFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={theme.textSubtle}
        selectionColor={theme.accent}
        style={[
          styles.input,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: error ? theme.danger : theme.border,
            color: theme.text
          },
          style
        ]}
        {...props}
      />
      {error || help ? (
        <Text
          accessibilityRole={error ? 'alert' : undefined}
          style={[styles.support, { color: error ? theme.danger : theme.textMuted }]}
        >
          {error ?? help}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: tokens.space.md },
  label: {
    marginBottom: tokens.space.sm,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.heavy
  },
  input: {
    minHeight: tokens.layout.actionHeight,
    borderWidth: 1.5,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.type.body,
    fontWeight: tokens.weight.medium
  },
  support: {
    marginTop: 6,
    paddingHorizontal: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  }
});
