import { router, type Href } from 'expo-router';
import { formatDistanceToNowStrict } from 'date-fns';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { useProfileDashboard } from '@/features/profile/use-profile';
import { getXpLevelProgress } from '@/domain/xp-level';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';
import type { XpReason } from '@/types/database';

const reasonLabels: Record<XpReason, string> = {
  attendance_confirmed: 'Confirmed attendance',
  verified_checkin: 'Verified event check-in',
  post_event_rating: 'Rated an activity',
  host_completion: 'Hosted a completed activity',
  no_show: 'Missed a confirmed event',
  late_cancellation: 'Late group cancellation',
  admin_adjustment: 'Campus team adjustment',
  verified_event_checkin: 'Verified event attendance',
  hosted_event: 'Hosted a completed event',
  qualified_referral: 'Referral completed attendance'
};

const reasonMarks: Record<XpReason, AppIconName> = {
  attendance_confirmed: 'check',
  verified_checkin: 'qrCode',
  post_event_rating: 'star',
  host_completion: 'people',
  no_show: 'warning',
  late_cancellation: 'warning',
  admin_adjustment: 'settings',
  verified_event_checkin: 'qrCode',
  hosted_event: 'people',
  qualified_referral: 'person'
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
          title="Profile unavailable"
          message="Your account and XP are unchanged. Try again."
          actionLabel="Try again"
          onAction={() => void dashboard.refetch()}
        />
      </AppScreen>
    );
  }

  const data = dashboard.data;
  const xpTotal = data?.xpTotal ?? 0;
  const levelState = getXpLevelProgress(xpTotal);
  const { level, progress: levelProgress } = levelState;
  const verifiedCheckins =
    data?.xpEntries.filter((entry) => entry.reason === 'verified_checkin').length ?? 0;
  const reliabilityFlags =
    data?.xpEntries.filter(
      (entry) => entry.reason === 'no_show' || entry.reason === 'late_cancellation'
    ).length ?? 0;

  return (
    <AppScreen
      eyebrow="Account"
      title="Profile"
      subtitle="Your attendance, reliability, and recent activity."
    >
      <View style={styles.topActions}>
        <BackButton label="Discover" onPress={() => router.replace('/deck')} />
        <SecondaryButton
          label="Settings"
          leadingIcon="settings"
          onPress={() => router.push('/settings')}
          style={styles.settingsButton}
        />
      </View>

      {dashboard.isLoading || !data ? (
        <ListCardSkeleton count={3} />
      ) : (
        <>
          <View style={[styles.identity, { borderColor: theme.border }]}>
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
                <StatusPill label="Verified student" tone="success" />
                <Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>
                  {profile?.display_name ?? 'Ruckus member'}
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
              leadingIcon="forward"
              onPress={() => router.push('/profile/edit')}
              style={styles.edit}
            />
          </View>

          <View style={[styles.levelCard, { backgroundColor: theme.surfaceMuted }]}>
            <View style={styles.levelTop}>
              <View>
                <Text style={[styles.levelEyebrow, { color: theme.textMuted }]}>
                  XP progress
                </Text>
                <Text style={[styles.levelValue, { color: theme.text }]}>
                  Level {level}
                </Text>
              </View>
              <View style={styles.xpBadge}>
                <Text style={[styles.xpValue, { color: theme.text }]}>{xpTotal}</Text>
                <Text style={[styles.xpLabel, { color: theme.textMuted }]}>Total XP</Text>
              </View>
            </View>
            <View
              accessibilityLabel={`${Math.round(levelProgress * 100)} percent toward level ${level + 1}`}
              style={[styles.progressTrack, { backgroundColor: theme.surfaceStrong }]}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${levelProgress * 100}%`, backgroundColor: theme.primary }
                ]}
              />
            </View>
            <Text style={[styles.levelNote, { color: theme.textMuted }]}>
              {Math.max(levelState.nextLevelAt - xpTotal, 0)} XP to Level {level + 1}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>
                Earned
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Badges</Text>
            </View>
            <Text style={[styles.trust, { color: theme.textMuted }]}>
              Verified actions
            </Text>
          </View>
          {data.badges.length ? (
            <View style={styles.badges} accessibilityRole="list">
              {data.badges.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
                  ]}
                >
                  <AppIcon name={badge.icon} size={22} color={theme.accent} />
                  <View style={styles.badgeCopy}>
                    <Text style={[styles.badgeName, { color: theme.text }]}>
                      {badge.name}
                    </Text>
                    <Text style={[styles.badgeDescription, { color: theme.textMuted }]}>
                      {badge.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.badgeEmpty, { color: theme.textMuted }]}>
              Complete a verified event check-in to earn your first badge.
            </Text>
          )}

          <View style={styles.metrics}>
            <View style={[styles.metric, { borderColor: theme.border }]}>
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {verifiedCheckins}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
                Recent verified check-ins
              </Text>
            </View>
            <View style={[styles.metric, { borderColor: theme.border }]}>
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
              mark="people"
              label="Connections"
              onPress={() => router.push('/social' as Href)}
            />
            <ProfileAction
              mark="trophy"
              label="Leaderboard"
              onPress={() => router.push('/leaderboard')}
            />
            <ProfileAction
              mark="people"
              label="Your groups"
              onPress={() => router.push('/groups')}
            />
            <ProfileAction
              mark="organization"
              label="Organizations"
              onPress={() => router.push('/organizations')}
            />
            <ProfileAction
              mark="safety"
              label="Safety"
              onPress={() => router.push('/safety')}
            />
            {profile?.role === 'admin' ? (
              <ProfileAction
                mark="safety"
                label="Moderation queue"
                onPress={() => router.push('/admin/moderation')}
              />
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>
                XP history
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Recent activity
              </Text>
            </View>
            <Text style={[styles.trust, { color: theme.textMuted }]}>
              Verified entries
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
                    <AppIcon
                      color={entry.amount >= 0 ? theme.success : theme.danger}
                      name={reasonMarks[entry.reason]}
                      size={18}
                    />
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
                No XP activity yet
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
  mark: AppIconName;
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
      <AppIcon color={theme.textMuted} name={mark} size={20} />
      <Text style={[styles.actionText, { color: theme.text }]}>{label}</Text>
      <AppIcon color={theme.textSubtle} name="forward" size={16} />
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
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
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
  initial: { fontSize: 38, fontWeight: tokens.weight.bold },
  identityCopy: { flex: 1, marginLeft: tokens.space.md },
  name: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.heading,
    lineHeight: tokens.lineHeight.heading,
    fontWeight: tokens.weight.bold,
    letterSpacing: -0.3
  },
  campus: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  bio: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.label,
    lineHeight: 21,
    fontWeight: tokens.weight.regular
  },
  edit: { marginTop: tokens.space.lg },
  levelCard: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.lg
  },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  levelEyebrow: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  levelValue: {
    marginTop: tokens.space.xs,
    fontSize: 26,
    fontWeight: tokens.weight.bold,
    letterSpacing: -0.3
  },
  xpBadge: { alignItems: 'flex-end' },
  xpValue: {
    fontSize: 28,
    fontWeight: tokens.weight.bold
  },
  xpLabel: {
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.medium
  },
  progressTrack: {
    height: 9,
    overflow: 'hidden',
    borderRadius: tokens.radius.pill,
    marginTop: tokens.space.lg
  },
  progressFill: {
    height: '100%',
    borderRadius: tokens.radius.pill
  },
  levelNote: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.regular
  },
  badges: { gap: tokens.space.sm },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md
  },
  badgeCopy: { flex: 1 },
  badgeName: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  badgeDescription: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  },
  badgeEmpty: { fontSize: tokens.type.label, lineHeight: tokens.lineHeight.body },
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
  metricValue: { fontSize: 28, fontWeight: tokens.weight.bold },
  metricLabel: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.medium
  },
  quickActions: {
    marginTop: tokens.space.md
  },
  action: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.space.sm
  },
  actionText: {
    flex: 1,
    marginLeft: tokens.space.md,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.medium
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: tokens.space.xl
  },
  sectionEyebrow: {
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.medium
  },
  sectionTitle: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  },
  trust: { fontSize: tokens.type.caption, fontWeight: tokens.weight.medium },
  ledger: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: tokens.radius.md,
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
  ledgerCopy: { flex: 1, marginLeft: tokens.space.md },
  ledgerReason: { fontSize: tokens.type.label, fontWeight: tokens.weight.medium },
  ledgerTime: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.regular
  },
  ledgerAmount: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  emptyLedger: {
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    marginTop: tokens.space.md
  },
  emptyTitle: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  emptyCopy: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    fontWeight: tokens.weight.regular
  }
});
