import { router } from 'expo-router';
import { formatDistanceToNowStrict } from 'date-fns';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useProfileDashboard } from '@/features/profile/use-profile';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';
import type { XpReason } from '@/types/database.generated';

const reasonLabels: Record<XpReason, string> = {
  attendance_confirmed: 'Confirmed attendance',
  verified_checkin: 'Verified event check-in',
  post_event_rating: 'Rated an activity',
  host_completion: 'Hosted a completed activity',
  no_show: 'Missed a confirmed event',
  late_cancellation: 'Late group cancellation',
  admin_adjustment: 'Campus team adjustment'
};

const reasonMarks: Record<XpReason, string> = {
  attendance_confirmed: '✓',
  verified_checkin: '⌁',
  post_event_rating: '★',
  host_completion: 'H',
  no_show: '!',
  late_cancellation: '−',
  admin_adjustment: '±'
};

export default function ProfileScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const dashboard = useProfileDashboard();

  if (dashboard.isError || (!dashboard.isLoading && !dashboard.data)) {
    return (
      <AppScreen>
        <ErrorState
          icon="↻"
          title="Your profile took a timeout"
          message="Your account and XP remain protected. Try loading it again."
          actionLabel="Try again"
          onAction={() => void dashboard.refetch()}
        />
      </AppScreen>
    );
  }

  const data = dashboard.data;
  const xpTotal = data?.xpTotal ?? 0;
  const level = Math.max(1, Math.floor(Math.max(xpTotal, 0) / 250) + 1);
  const levelFloor = (level - 1) * 250;
  const levelProgress = Math.min(Math.max((xpTotal - levelFloor) / 250, 0), 1);
  const verifiedCheckins =
    data?.xpEntries.filter((entry) => entry.reason === 'verified_checkin').length ?? 0;
  const reliabilityFlags =
    data?.xpEntries.filter(
      (entry) => entry.reason === 'no_show' || entry.reason === 'late_cancellation'
    ).length ?? 0;

  return (
    <AppScreen
      eyebrow="Verified participation"
      title="Your Ruckus profile."
      subtitle="Built around showing up—not followers, likes, or popularity."
    >
      <View style={styles.topActions}>
        <BackButton label="Discover" onPress={() => router.replace('/deck')} />
        <SecondaryButton
          label="Settings"
          leadingIcon="↗"
          onPress={() => router.push('/settings')}
          style={styles.settingsButton}
        />
      </View>

      {dashboard.isLoading || !data ? (
        <ListCardSkeleton count={3} />
      ) : (
        <>
          <View
            style={[
              styles.identity,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
              tokens.shadow.card
            ]}
          >
            <View style={styles.identityTop}>
              {data.avatarUrl ? (
                <Image
                  accessibilityLabel={`${profile?.display_name ?? 'Your'} profile photo`}
                  source={{ uri: data.avatarUrl }}
                  contentFit="cover"
                  transition={tokens.motion.quick}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.accentMuted }]}>
                  <Text style={[styles.initial, { color: theme.text }]}>
                    {(profile?.display_name ?? 'R').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.identityCopy}>
                <StatusPill label="VERIFIED STUDENT" tone="success" />
                <Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>
                  {profile?.display_name ?? 'Ruckus player'}
                </Text>
                <Text style={[styles.campus, { color: theme.textMuted }]}>
                  {data.campusName}
                  {profile?.graduation_year
                    ? ` · Class of ${profile.graduation_year}`
                    : ''}
                </Text>
              </View>
            </View>
            {profile?.bio ? (
              <Text style={[styles.bio, { color: theme.textMuted }]}>{profile.bio}</Text>
            ) : null}
            <SecondaryButton
              label="Edit profile"
              leadingIcon="↗"
              onPress={() => router.push('/profile/edit')}
              style={styles.edit}
            />
          </View>

          <View
            style={[
              styles.levelCard,
              { backgroundColor: tokens.color.ink, borderColor: theme.border }
            ]}
          >
            <View style={styles.levelTop}>
              <View>
                <Text style={styles.levelEyebrow}>PARTICIPATION LEVEL</Text>
                <Text style={styles.levelValue}>LEVEL {level}</Text>
              </View>
              <View style={styles.xpBadge}>
                <Text style={styles.xpValue}>{xpTotal}</Text>
                <Text style={styles.xpLabel}>TOTAL XP</Text>
              </View>
            </View>
            <View
              accessibilityLabel={`${Math.round(levelProgress * 100)} percent toward level ${level + 1}`}
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${levelProgress * 100}%` }]} />
            </View>
            <Text style={styles.levelNote}>
              {Math.max(level * 250 - xpTotal, 0)} XP to Level {level + 1}
            </Text>
          </View>

          <View style={styles.metrics}>
            <View
              style={[
                styles.metric,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
              ]}
            >
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {verifiedCheckins}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
                Recent verified check-ins
              </Text>
            </View>
            <View
              style={[
                styles.metric,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  {
                    color: reliabilityFlags === 0 ? theme.success : tokens.color.coral
                  }
                ]}
              >
                {reliabilityFlags}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
                Recent reliability flags
              </Text>
            </View>
          </View>

          <View style={styles.quickActions}>
            <ProfileAction
              mark="#"
              label="Leaderboard"
              onPress={() => router.push('/leaderboard')}
            />
            <ProfileAction
              mark="●"
              label="Your crews"
              onPress={() => router.push('/groups')}
            />
            <ProfileAction
              mark="!"
              label="Safety"
              onPress={() => router.push('/safety')}
            />
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>
                XP HISTORY
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Recent activity
              </Text>
            </View>
            <Text style={[styles.trust, { color: theme.textMuted }]}>
              Server verified
            </Text>
          </View>

          {data.xpEntries.length ? (
            <View
              accessibilityRole="list"
              style={[
                styles.ledger,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border
                }
              ]}
            >
              {data.xpEntries.map((entry, index) => (
                <View
                  key={entry.id}
                  accessibilityRole="text"
                  style={[
                    styles.ledgerRow,
                    index < data.xpEntries.length - 1 && {
                      borderBottomColor: theme.border,
                      borderBottomWidth: StyleSheet.hairlineWidth
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.reasonMark,
                      {
                        backgroundColor:
                          entry.amount >= 0
                            ? tokens.color.ruckusSoft
                            : tokens.color.coralSoft
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonMarkText,
                        { color: entry.amount >= 0 ? '#335400' : '#8B2522' }
                      ]}
                    >
                      {reasonMarks[entry.reason]}
                    </Text>
                  </View>
                  <View style={styles.ledgerCopy}>
                    <Text style={[styles.ledgerReason, { color: theme.text }]}>
                      {reasonLabels[entry.reason]}
                    </Text>
                    <Text style={[styles.ledgerTime, { color: theme.textMuted }]}>
                      {formatDistanceToNowStrict(new Date(entry.createdAt), {
                        addSuffix: true
                      })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ledgerAmount,
                      { color: entry.amount >= 0 ? theme.success : theme.danger }
                    ]}
                  >
                    {entry.amount >= 0 ? '+' : ''}
                    {entry.amount} XP
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyLedger, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Your XP story starts when you show up.
              </Text>
              <Text style={[styles.emptyCopy, { color: theme.textMuted }]}>
                Verified check-ins and trusted activity actions will appear here.
              </Text>
            </View>
          )}
        </>
      )}
    </AppScreen>
  );
}

function ProfileAction({
  mark,
  label,
  onPress
}: {
  mark: string;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1
        }
      ]}
    >
      <Text style={[styles.actionMark, { color: theme.accent }]}>{mark}</Text>
      <Text style={[styles.actionText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  settingsButton: { minWidth: 132 },
  identity: {
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg
  },
  identityTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: tokens.radius.lg
  },
  initial: { fontSize: 38, fontWeight: tokens.weight.black },
  identityCopy: { flex: 1, marginLeft: tokens.space.md },
  name: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.heading,
    lineHeight: tokens.lineHeight.heading,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.6
  },
  campus: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.heavy
  },
  bio: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.medium
  },
  edit: { marginTop: tokens.space.lg },
  levelCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    marginTop: tokens.space.lg
  },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  levelEyebrow: {
    color: tokens.color.ruckus,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black,
    letterSpacing: 1.1
  },
  levelValue: {
    marginTop: tokens.space.xs,
    color: tokens.color.white,
    fontSize: 26,
    fontWeight: tokens.weight.black,
    letterSpacing: -0.6
  },
  xpBadge: { alignItems: 'flex-end' },
  xpValue: {
    color: tokens.color.white,
    fontSize: 28,
    fontWeight: tokens.weight.black
  },
  xpLabel: {
    color: '#B6BBC4',
    fontSize: 9,
    fontWeight: tokens.weight.black,
    letterSpacing: 0.9
  },
  progressTrack: {
    height: 9,
    overflow: 'hidden',
    borderRadius: tokens.radius.pill,
    backgroundColor: '#30333C',
    marginTop: tokens.space.lg
  },
  progressFill: {
    height: '100%',
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.ruckus
  },
  levelNote: {
    marginTop: tokens.space.sm,
    color: '#B6BBC4',
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.heavy
  },
  metrics: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginTop: tokens.space.sm
  },
  metric: {
    minHeight: 104,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  metricValue: { fontSize: 28, fontWeight: tokens.weight.black },
  metricLabel: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.heavy
  },
  quickActions: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginTop: tokens.space.md
  },
  action: {
    minHeight: 92,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm
  },
  actionMark: { fontSize: 20, fontWeight: tokens.weight.black },
  actionText: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.black,
    textAlign: 'center'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: tokens.space.xl
  },
  sectionEyebrow: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black,
    letterSpacing: 1.1
  },
  sectionTitle: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.black
  },
  trust: { fontSize: tokens.type.micro, fontWeight: tokens.weight.heavy },
  ledger: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.md,
    marginTop: tokens.space.md
  },
  ledgerRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center'
  },
  reasonMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  reasonMarkText: { fontSize: 16, fontWeight: tokens.weight.black },
  ledgerCopy: { flex: 1, marginLeft: tokens.space.md },
  ledgerReason: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  ledgerTime: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.heavy
  },
  ledgerAmount: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  emptyLedger: {
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    marginTop: tokens.space.md
  },
  emptyTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  emptyCopy: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  }
});
