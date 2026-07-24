import { router } from 'expo-router';
import { formatDistanceToNowStrict } from 'date-fns';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatePanel } from '@/components/ui/state-panel';
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

export default function ProfileScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const dashboard = useProfileDashboard();

  if (dashboard.isLoading) return <LoadingScreen label="Loading your player card…" />;
  if (dashboard.isError || !dashboard.data) {
    return (
      <AppScreen>
        <StatePanel
          icon="📡"
          title="Profile unavailable"
          message="Your account is safe. Try loading the player card again."
          actionLabel="Try again"
          onAction={() => void dashboard.refetch()}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen eyebrow="Player card" title={profile?.display_name ?? 'Campus Clasher'}>
      <View style={styles.topActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/deck')}
          style={[styles.smallButton, { backgroundColor: theme.surfaceMuted }]}
        >
          <Text style={[styles.smallButtonText, { color: theme.text }]}>← Discover</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={[styles.smallButton, { backgroundColor: theme.surfaceMuted }]}
        >
          <Text style={[styles.smallButtonText, { color: theme.text }]}>Settings</Text>
        </Pressable>
      </View>

      <View style={styles.identity}>
        {dashboard.data.avatarUrl ? (
          <Image
            source={{ uri: dashboard.data.avatarUrl }}
            contentFit="cover"
            transition={180}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.surfaceMuted }]}>
            <Text style={[styles.initial, { color: theme.primary }]}>
              {(profile?.display_name ?? 'C').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.identityCopy}>
          <Text style={[styles.name, { color: theme.text }]}>
            {profile?.display_name}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            Class of {profile?.graduation_year ?? '—'} · Verified adult student
          </Text>
          {profile?.bio ? (
            <Text style={[styles.bio, { color: theme.textMuted }]}>{profile.bio}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.xpHero, { backgroundColor: theme.surface }]}>
        <Text style={[styles.xpValue, { color: theme.primary }]}>
          {dashboard.data.xpTotal}
        </Text>
        <Text style={[styles.xpLabel, { color: theme.textMuted }]}>total XP</Text>
        <Text style={[styles.xpNote, { color: theme.textMuted }]}>
          XP is awarded by trusted attendance and activity actions, never by the app
          client.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/profile/edit')}
          style={[styles.action, { backgroundColor: theme.surface }]}
        >
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={[styles.actionText, { color: theme.text }]}>Edit profile</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/leaderboard')}
          style={[styles.action, { backgroundColor: theme.surface }]}
        >
          <Text style={styles.actionIcon}>🏆</Text>
          <Text style={[styles.actionText, { color: theme.text }]}>Leaderboard</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/groups')}
          style={[styles.action, { backgroundColor: theme.surface }]}
        >
          <Text style={styles.actionIcon}>🫶</Text>
          <Text style={[styles.actionText, { color: theme.text }]}>Your groups</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent XP</Text>
      {dashboard.data.xpEntries.length ? (
        <View style={styles.ledger}>
          {dashboard.data.xpEntries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.ledgerRow, { borderBottomColor: theme.border }]}
            >
              <View style={styles.ledgerCopy}>
                <Text style={[styles.ledgerReason, { color: theme.text }]}>
                  {reasonLabels[entry.reason]}
                </Text>
                <Text style={[styles.ledgerTime, { color: theme.textMuted }]}>
                  {formatDistanceToNowStrict(new Date(entry.createdAt))} ago
                </Text>
              </View>
              <Text
                style={[
                  styles.ledgerAmount,
                  { color: entry.amount >= 0 ? theme.success : theme.danger }
                ]}
              >
                {entry.amount >= 0 ? '+' : ''}
                {entry.amount}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          Check in at your first confirmed activity to start earning XP.
        </Text>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.space.lg
  },
  smallButton: {
    minHeight: tokens.touchTarget,
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md
  },
  smallButtonText: { fontSize: 13, fontWeight: '800' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  avatar: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 28
  },
  initial: { fontSize: 38, fontWeight: '900' },
  identityCopy: { flex: 1 },
  name: { fontSize: 23, fontWeight: '900' },
  meta: { marginTop: 3, fontSize: 12, fontWeight: '700' },
  bio: { marginTop: tokens.space.sm, fontSize: 13, lineHeight: 19 },
  xpHero: {
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xl,
    marginTop: tokens.space.xl
  },
  xpValue: { fontSize: 52, fontWeight: '900', letterSpacing: -2 },
  xpLabel: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  xpNote: {
    maxWidth: 310,
    marginTop: tokens.space.sm,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center'
  },
  actions: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.md },
  action: {
    minHeight: 94,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm
  },
  actionIcon: { fontSize: 24 },
  actionText: { marginTop: 5, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  sectionTitle: { marginTop: tokens.space.xl, fontSize: 19, fontWeight: '900' },
  ledger: { marginTop: tokens.space.sm },
  ledgerRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  ledgerCopy: { flex: 1 },
  ledgerReason: { fontSize: 14, fontWeight: '800' },
  ledgerTime: { marginTop: 3, fontSize: 11, fontWeight: '600' },
  ledgerAmount: { fontSize: 18, fontWeight: '900' },
  empty: { marginTop: tokens.space.md, fontSize: 13, lineHeight: 20 }
});
