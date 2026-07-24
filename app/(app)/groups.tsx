import { router } from 'expo-router';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatePanel } from '@/components/ui/state-panel';
import { useGroups } from '@/features/groups/use-groups';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function GroupsScreen() {
  const { theme } = useTheme();
  const groups = useGroups();

  if (groups.isLoading) return <LoadingScreen label="Finding your crews…" />;

  return (
    <AppScreen
      eyebrow="Your plans"
      title="Confirmed groups"
      subtitle="Only people in each crew can see its lobby, chat, and meeting spot."
    >
      <View style={styles.navigation}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/deck')}
          style={[styles.navButton, { backgroundColor: theme.surfaceMuted }]}
        >
          <Text style={[styles.navText, { color: theme.text }]}>← Discover</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/pending')}
          style={[styles.navButton, { backgroundColor: theme.surfaceMuted }]}
        >
          <Text style={[styles.navText, { color: theme.text }]}>Pending matches</Text>
        </Pressable>
      </View>

      {groups.isError ? (
        <StatePanel
          icon="📡"
          title="Couldn’t load your groups"
          message="Your membership is still safe. Try again when your connection settles."
          actionLabel="Try again"
          onAction={() => void groups.refetch()}
        />
      ) : groups.data?.length ? (
        <View style={styles.list}>
          {groups.data.map((group) => (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${group.title} group`}
              onPress={() =>
                router.push({ pathname: '/group/[id]', params: { id: group.id } })
              }
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: pressed ? 0.8 : 1
                }
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {group.title}
                </Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        group.status === 'confirmed'
                          ? `${theme.success}22`
                          : `${tokens.color.amber}2D`
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          group.status === 'confirmed'
                            ? theme.success
                            : tokens.color.amber
                      }
                    ]}
                  >
                    {group.status === 'confirmed' ? 'Confirmed' : 'Needs response'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.when, { color: theme.textMuted }]}>
                {format(new Date(group.startsAt), 'EEE, MMM d · h:mm a')}
              </Text>
              <Text style={[styles.members, { color: theme.text }]}>
                {group.members.length} crew members
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <StatePanel
          icon="🛶"
          title="No groups yet"
          message="Swipe right on an activity. When enough compatible students join, this is where your crew appears."
          actionLabel="Browse activities"
          onAction={() => router.replace('/deck')}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    marginBottom: tokens.space.lg
  },
  navButton: {
    minHeight: tokens.touchTarget,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.sm
  },
  navText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  list: { gap: tokens.space.md },
  card: {
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.space.sm
  },
  cardTitle: { flex: 1, fontSize: tokens.type.heading, fontWeight: '900' },
  badge: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  badgeText: { fontSize: 11, fontWeight: '900' },
  when: { marginTop: tokens.space.sm, fontSize: 15, fontWeight: '700' },
  members: { marginTop: tokens.space.md, fontSize: 14, fontWeight: '800' }
});
