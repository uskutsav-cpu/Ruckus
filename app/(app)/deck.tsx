import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function DeckBootstrapScreen() {
  const { profile, signOut } = useAuth();
  const { theme } = useTheme();

  return (
    <AppScreen scroll={false}>
      <View style={styles.container}>
        <Text style={styles.icon}>⚡</Text>
        <Text style={[styles.title, { color: theme.text }]}>
          You’re in, {profile?.display_name ?? 'player'}.
        </Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          Your activity deck is being dealt.
        </Text>
        <PrimaryButton
          label="Sign out"
          variant="ghost"
          onPress={() => void signOut()}
          style={styles.button}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 52 },
  title: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    fontWeight: '900',
    textAlign: 'center'
  },
  copy: { marginTop: tokens.space.sm, fontSize: 16 },
  button: { width: 180, marginTop: tokens.space.xl }
});
