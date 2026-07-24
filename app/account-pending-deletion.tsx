import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function AccountPendingDeletionScreen() {
  const { signOut } = useAuth();
  const { theme } = useTheme();
  return (
    <AppScreen scroll={false}>
      <View style={styles.content}>
        <Text style={styles.icon}>🗃️</Text>
        <Text style={[styles.title, { color: theme.text }]}>
          Account deletion requested
        </Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          Social participation and push tokens are disabled. The scheduled server purge
          deletes your Auth account, avatar, and profile-owned data after seven days;
          retained group messages become anonymous.
        </Text>
        <Text style={[styles.help, { color: theme.textMuted }]}>
          If this was a mistake, contact your campus support team before the purge window
          ends.
        </Text>
        <PrimaryButton
          label="Sign out"
          onPress={() => void signOut()}
          style={styles.button}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 70 },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    fontWeight: '900',
    textAlign: 'center'
  },
  copy: {
    maxWidth: 350,
    marginTop: tokens.space.md,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  help: {
    maxWidth: 330,
    marginTop: tokens.space.lg,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center'
  },
  button: { minWidth: 220, marginTop: tokens.space.xl }
});
