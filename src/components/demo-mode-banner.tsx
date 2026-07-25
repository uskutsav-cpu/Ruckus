import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type NonProductionBannerProps = {
  mode?: 'demo' | 'staging';
};

export function DemoModeBanner({ mode = 'demo' }: NonProductionBannerProps) {
  const { theme } = useTheme();
  const isStaging = mode === 'staging';

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        { backgroundColor: theme.surfaceMuted, borderBottomColor: theme.border }
      ]}
    >
      <Text style={[styles.label, { color: theme.text }]}>
        {isStaging ? 'Staging' : 'Demo'}
      </Text>
      <Text numberOfLines={2} style={[styles.copy, { color: theme.text }]}>
        {isStaging
          ? 'Connected test data. Not production.'
          : 'Preview data. No account changes.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.layout.screenPadding,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  label: {
    marginRight: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.bold
  },
  copy: {
    flexShrink: 1,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.regular
  }
});
