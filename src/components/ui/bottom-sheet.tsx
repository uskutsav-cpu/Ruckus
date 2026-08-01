import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type BottomSheetProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
}>;

export function BottomSheet({ children, header, footer }: BottomSheetProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safe, { backgroundColor: theme.background }]}
    >
      <View style={[styles.handle, { backgroundColor: theme.surfaceStrong }]} />
      {header}
      <View style={styles.content}>{children}</View>
      {footer ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border }
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg
  },
  handle: {
    width: 42,
    height: 5,
    alignSelf: 'center',
    borderRadius: tokens.radius.pill,
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.sm
  },
  content: { flex: 1 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.sm
  }
});
