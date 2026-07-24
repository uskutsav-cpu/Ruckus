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
        placeholderTextColor={theme.textMuted}
        selectionColor={theme.primary}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : theme.border,
            color: theme.text
          },
          style
        ]}
        {...props}
      />
      {error || help ? (
        <Text style={[styles.support, { color: error ? theme.danger : theme.textMuted }]}>
          {error ?? help}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: tokens.space.md },
  label: { marginBottom: 7, fontSize: 14, fontWeight: '800' },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.type.body
  },
  support: {
    marginTop: 6,
    paddingHorizontal: 2,
    fontSize: tokens.type.caption,
    lineHeight: 18
  }
});
