import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useGroupLobby } from '@/features/groups/use-groups';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function CheckinResultScreen() {
  const params = useLocalSearchParams<{
    groupId: string;
    already?: string;
    xp?: string;
    demo?: string;
  }>();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const already = params.already === 'true';
  const parsedXp = Number(params.xp ?? '0');
  const xp = Number.isFinite(parsedXp) && parsedXp >= 0 ? parsedXp : 0;
  const isDemo = params.demo === 'true';
  const { theme } = useTheme();
  const lobby = useGroupLobby(groupId ?? '');
  const title = isDemo
    ? 'Demo check-in preview'
    : already
      ? 'Already checked in'
      : 'Attendance verified';
  const copy = isDemo
    ? 'The scanner flow completed locally. No attendance or XP was recorded.'
    : already
      ? 'Your original verified check-in is still recorded. XP is awarded only once.'
      : 'You’re checked in with your crew. The append-only XP ledger recorded this event.';

  return (
    <AppScreen scroll={false}>
      <View style={styles.content}>
        <StatusPill
          label={isDemo ? 'DEMO RESULT · NOT RECORDED' : 'VERIFIED RESULT'}
          tone={isDemo ? 'accent' : 'success'}
        />
        <View
          style={[
            styles.icon,
            {
              backgroundColor: isDemo ? theme.accentMuted : tokens.color.ruckusSoft
            }
          ]}
        >
          <Text
            style={[styles.iconText, { color: isDemo ? theme.accent : theme.success }]}
          >
            ✓
          </Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>{copy}</Text>
        <View
          style={[
            styles.xpCard,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
          ]}
        >
          <Text style={[styles.xp, { color: theme.text }]}>+{xp} XP</Text>
          <Text style={[styles.xpLabel, { color: theme.textMuted }]}>
            {isDemo
              ? 'preview reward only'
              : already
                ? 'previously awarded'
                : 'verified attendance'}
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
                params: {
                  sessionId: lobby.data.activitySessionId,
                  demo: String(isDemo)
                }
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
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 43,
    marginTop: tokens.space.lg
  },
  iconText: { fontSize: 50, fontWeight: tokens.weight.black },
  title: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.black,
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
    minWidth: 218,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.xxl,
    paddingVertical: tokens.space.lg,
    marginTop: tokens.space.xl
  },
  xp: { fontSize: 36, fontWeight: tokens.weight.black, letterSpacing: -1 },
  xpLabel: {
    marginTop: 3,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.heavy,
    textTransform: 'uppercase'
  },
  button: { minWidth: 220, marginTop: tokens.space.xl },
  ratingButton: { minWidth: 220, marginTop: tokens.space.sm }
});
