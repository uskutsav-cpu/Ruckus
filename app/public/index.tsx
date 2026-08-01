import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { AppIcon } from '@/components/ui/app-icon';
import { AppScreen } from '@/components/ui/app-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const capabilities = [
  [
    'discover',
    'Discover campus events',
    'Search, filter, swipe, and see real availability.'
  ],
  ['calendar', 'RSVP quickly', 'Join, request approval, or enter an ordered waitlist.'],
  [
    'people',
    'See where community gathers',
    'Organizer identity and truthful event status stay visible.'
  ],
  [
    'chat',
    'Join event chats',
    'Confirmed attendees and authorized hosts get the right private chat.'
  ],
  [
    'organization',
    'Organize events',
    'Clubs can invite officers, request verification, and track attendance.'
  ],
  [
    'trophy',
    'Build campus activity',
    'Verified check-ins—not screen taps—power XP and referrals.'
  ]
] as const;

export default function PublicLandingScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  return (
    <AppScreen contentStyle={styles.screen}>
      <PublicHeader />
      <LinearGradient colors={[theme.accentMuted, theme.background]} style={styles.hero}>
        <View style={[styles.pill, { backgroundColor: theme.surfaceElevated }]}>
          <Text style={[styles.pillText, { color: theme.accent }]}>
            Campus plans, together
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Find what’s happening.
        </Text>
        <Text style={[styles.heroTitleAccent, { color: theme.primary }]}>
          Make a little Ruckus.
        </Text>
        <Text style={[styles.heroBody, { color: theme.textMuted }]}>
          Discover real campus events, reserve a spot, meet in the event chat, and help
          your club build a more active community.
        </Text>
        <View style={styles.heroActions}>
          <PrimaryButton
            label={user ? 'Open Discover' : 'Create an account'}
            onPress={() => router.push(user ? '/discover' : '/sign-up')}
            style={styles.heroButton}
          />
          <SecondaryButton
            label="Club or campus team?"
            onPress={() => router.push('/public/partnership')}
            style={styles.heroButton}
          />
        </View>
        <Text style={[styles.truth, { color: theme.textSubtle }]}>
          18+ beta. Event listings are user-generated. Ruckus does not guarantee personal
          safety or claim university endorsement.
        </Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Built for action</Text>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          From “maybe” to there.
        </Text>
        <View style={styles.grid}>
          {capabilities.map(([icon, title, description]) => (
            <View
              key={title}
              style={[
                styles.card,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
              ]}
            >
              <View style={[styles.icon, { backgroundColor: theme.accentMuted }]}>
                <AppIcon name={icon} color={theme.accent} size={24} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.cardBody, { color: theme.textMuted }]}>
                {description}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <PublicFooter />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  hero: {
    alignItems: 'center',
    marginHorizontal: -tokens.layout.screenPadding,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: 72,
    paddingBottom: 64
  },
  pill: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs
  },
  pillText: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  heroTitle: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.hero,
    lineHeight: tokens.lineHeight.hero,
    fontWeight: tokens.weight.black,
    textAlign: 'center',
    letterSpacing: -1.4
  },
  heroTitleAccent: {
    fontSize: tokens.type.hero,
    lineHeight: tokens.lineHeight.hero,
    fontWeight: tokens.weight.black,
    textAlign: 'center',
    letterSpacing: -1.4
  },
  heroBody: {
    maxWidth: 610,
    marginTop: tokens.space.lg,
    fontSize: tokens.type.heading,
    lineHeight: 31,
    textAlign: 'center'
  },
  heroActions: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: tokens.space.sm,
    marginTop: tokens.space.xl
  },
  heroButton: { minWidth: 240 },
  truth: {
    maxWidth: 620,
    marginTop: tokens.space.lg,
    fontSize: tokens.type.micro,
    lineHeight: tokens.lineHeight.caption,
    textAlign: 'center'
  },
  section: { paddingTop: tokens.space.xxl },
  eyebrow: { fontSize: tokens.type.caption, fontWeight: tokens.weight.bold },
  sectionTitle: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.title,
    fontWeight: tokens.weight.black
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.md, marginTop: 28 },
  card: {
    minWidth: 250,
    flexBasis: 280,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm
  },
  cardTitle: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.heading,
    fontWeight: tokens.weight.bold
  },
  cardBody: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  }
});
