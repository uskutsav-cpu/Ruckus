import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useGroupLobby } from '@/features/groups/use-groups';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function CheckinResultScreen() {
  const params = useLocalSearchParams<{
    groupId: string;
    already?: string;
    xp?: string;
  }>();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const already = params.already === 'true';
  const xp = Number(params.xp ?? '0');
  const { theme } = useTheme();
  const lobby = useGroupLobby(groupId ?? '');

  return (
    <AppScreen scroll={false}>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: `${theme.success}20` }]}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          {already ? 'Already checked in' : 'Attendance verified'}
        </Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          {already
            ? 'Your original verified check-in is still recorded. XP is only awarded once.'
            : 'You’re checked in with your crew. The append-only XP ledger recorded this event.'}
        </Text>
        <View style={[styles.xpCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.xp, { color: theme.primary }]}>+{xp} XP</Text>
          <Text style={[styles.xpLabel, { color: theme.textMuted }]}>
            verified attendance
          </Text>
        </View>
        <PrimaryButton
          label="Back to group"
          onPress={() =>
            router.replace({ pathname: '/group/[id]', params: { id: groupId ?? '' } })
          }
          style={styles.button}
        />
        {lobby.data?.activitySessionId ? (
          <PrimaryButton
            label="Rate this activity · +10 XP"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/rate/[sessionId]',
                params: { sessionId: lobby.data.activitySessionId }
              })
            }
            style={styles.ratingButton}
          />
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 46
  },
  iconText: { color: tokens.color.green, fontSize: 54, fontWeight: '900' },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    fontWeight: '900',
    textAlign: 'center'
  },
  copy: {
    maxWidth: 340,
    marginTop: tokens.space.sm,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  xpCard: {
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.xxl,
    paddingVertical: tokens.space.lg,
    marginTop: tokens.space.xl
  },
  xp: { fontSize: 36, fontWeight: '900' },
  xpLabel: { marginTop: 3, fontSize: 12, fontWeight: '800' },
  button: { minWidth: 220, marginTop: tokens.space.xl },
  ratingButton: { minWidth: 220, marginTop: tokens.space.sm }
});
