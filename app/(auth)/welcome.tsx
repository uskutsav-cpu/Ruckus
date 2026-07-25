import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const welcomeImage = require('../../assets/activities/taco-taste-off.png') as number;

export default function WelcomeScreen() {
  const { enterDemo } = useAuth();
  const { height } = useWindowDimensions();
  const { theme } = useTheme();
  const heroHeight = Math.min(Math.max(height * 0.5, 360), 480);

  return (
    <SafeAreaView edges={[]} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { minHeight: heroHeight }]}>
          <Image
            source={welcomeImage}
            accessibilityLabel="A group of college students sharing tacos"
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(13,15,14,0.18)', 'rgba(13,15,14,0.04)', 'rgba(13,15,14,0.8)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.brand}>
              <View style={styles.mark}>
                <Text style={styles.markText}>R</Text>
              </View>
              <Text style={styles.wordmark}>Ruckus</Text>
              {env.appEnvironment === 'staging' ? (
                <View style={styles.stagingBadge}>
                  <Text style={styles.stagingBadgeText}>STAGING</Text>
                </View>
              ) : null}
            </View>
            <View>
              <Text style={styles.title}>Find something to do.</Text>
              <Text style={styles.heroSubtitle}>
                Group activities with verified college students.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Text style={[styles.intro, { color: theme.textMuted }]}>
            Browse plans near campus, join a group, and meet at an approved public venue.
          </Text>
          <PrimaryButton
            label="Create account"
            accessibilityHint="Create a new Ruckus account"
            onPress={() => router.push('/sign-up')}
          />
          <SecondaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
          {env.isDemoAvailable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter local demo"
              onPress={() => void enterDemo()}
              style={styles.demoButton}
            >
              <Text style={[styles.demoText, { color: theme.primary }]}>
                Try the demo
              </Text>
            </Pressable>
          ) : null}
          <Text style={[styles.footnote, { color: theme.textSubtle }]}>
            For students 18 and older. University email required.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: tokens.color.ink
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingBottom: tokens.space.lg
  },
  brand: { flexDirection: 'row', alignItems: 'center' },
  mark: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.color.ruckus
  },
  markText: {
    color: tokens.color.ink,
    fontSize: 20,
    fontWeight: tokens.weight.bold
  },
  wordmark: {
    marginLeft: 10,
    color: tokens.color.white,
    fontSize: 18,
    fontWeight: tokens.weight.bold,
    letterSpacing: -0.2
  },
  stagingBadge: {
    marginLeft: tokens.space.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.68)',
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(9,10,13,0.34)'
  },
  stagingBadgeText: {
    color: tokens.color.white,
    fontSize: 9,
    fontWeight: tokens.weight.bold,
    letterSpacing: 1
  },
  title: {
    maxWidth: 340,
    color: tokens.color.white,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: tokens.weight.bold,
    letterSpacing: -1.2
  },
  heroSubtitle: {
    maxWidth: 350,
    marginTop: tokens.space.sm,
    color: '#E7EAE7',
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  },
  actions: {
    width: '100%',
    maxWidth: tokens.layout.maxContentWidth,
    alignSelf: 'center',
    gap: tokens.space.sm,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl
  },
  intro: {
    marginBottom: tokens.space.sm,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body
  },
  demoButton: {
    minHeight: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center'
  },
  demoText: {
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold
  },
  footnote: {
    marginTop: tokens.space.xs,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption,
    textAlign: 'center'
  }
});
