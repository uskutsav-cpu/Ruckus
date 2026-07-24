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
import { tokens } from '@/theme/tokens';

const welcomeImage = require('../../assets/activities/taco-taste-off.png') as number;

export default function WelcomeScreen() {
  const { enterDemo } = useAuth();
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(height * 0.59, 390), 520);

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { minHeight: heroHeight }]}>
          <Image
            source={welcomeImage}
            accessibilityLabel="A group of college students laughing together over tacos"
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(9,10,13,0.2)', 'rgba(9,10,13,0.06)', '#090A0D']}
            locations={[0, 0.38, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.brand}>
              <View style={styles.mark}>
                <Text style={styles.markText}>R</Text>
              </View>
              <Text style={styles.wordmark}>RUCKUS</Text>
            </View>
            <View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveCopy}>PLANS ARE FORMING TONIGHT</Text>
              </View>
              <Text style={styles.title}>SWIPE INTO{'\n'}SOMETHING.</Text>
              <Text style={styles.subtitle}>
                Meet safely through spontaneous group activities — and earn XP for showing
                up.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.loop}>
            <View style={styles.loopItem}>
              <Text style={styles.loopIcon}>↗</Text>
              <Text style={styles.loopLabel}>Swipe</Text>
            </View>
            <View style={styles.loopLine} />
            <View style={styles.loopItem}>
              <Text style={styles.loopIcon}>4+</Text>
              <Text style={styles.loopLabel}>Unlock</Text>
            </View>
            <View style={styles.loopLine} />
            <View style={styles.loopItem}>
              <Text style={styles.loopIcon}>⚡</Text>
              <Text style={styles.loopLabel}>Show up</Text>
            </View>
          </View>

          <PrimaryButton
            label="Find tonight’s crew"
            accessibilityHint="Create a new Ruckus account"
            onPress={() => router.push('/sign-up')}
          />
          <SecondaryButton
            label="I already have an account"
            onPress={() => router.push('/sign-in')}
            style={styles.secondary}
          />
          {env.isDemoAvailable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter local demo"
              onPress={() => void enterDemo()}
              style={styles.demoButton}
            >
              <Text style={styles.demoText}>Preview with demo activities →</Text>
            </Pressable>
          ) : null}
          <Text style={styles.footnote}>
            18+ · University email access · Group meetups at approved public venues
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.night },
  scroll: { flexGrow: 1, backgroundColor: tokens.color.night },
  hero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: tokens.color.ink
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingBottom: tokens.space.xl
  },
  brand: { flexDirection: 'row', alignItems: 'center' },
  mark: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.color.ruckus,
    transform: [{ rotate: '-6deg' }]
  },
  markText: {
    color: tokens.color.ink,
    fontSize: 22,
    fontWeight: tokens.weight.black,
    letterSpacing: -1
  },
  wordmark: {
    marginLeft: 11,
    color: tokens.color.white,
    fontSize: 17,
    fontWeight: tokens.weight.black,
    letterSpacing: 2.5
  },
  livePill: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(9,10,13,0.68)',
    paddingHorizontal: 11,
    marginBottom: tokens.space.md
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.ruckus,
    marginRight: 7
  },
  liveCopy: {
    color: tokens.color.white,
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.black,
    letterSpacing: 1
  },
  title: {
    color: tokens.color.white,
    fontSize: tokens.type.hero,
    lineHeight: tokens.lineHeight.hero,
    fontWeight: tokens.weight.black,
    letterSpacing: -2.5
  },
  subtitle: {
    maxWidth: 430,
    marginTop: tokens.space.md,
    color: '#E6E7E2',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: tokens.weight.medium
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
  loop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.sm
  },
  loopItem: { alignItems: 'center' },
  loopIcon: {
    color: tokens.color.ruckus,
    fontSize: 16,
    fontWeight: tokens.weight.black
  },
  loopLabel: {
    marginTop: 3,
    color: '#AEB3BD',
    fontSize: tokens.type.micro,
    fontWeight: tokens.weight.heavy,
    textTransform: 'uppercase'
  },
  loopLine: {
    height: 1,
    flex: 1,
    backgroundColor: '#33363D',
    marginHorizontal: tokens.space.sm
  },
  secondary: {
    backgroundColor: tokens.color.white,
    borderColor: tokens.color.white
  },
  demoButton: {
    minHeight: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center'
  },
  demoText: {
    color: tokens.color.ruckus,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.heavy
  },
  footnote: {
    marginTop: tokens.space.xs,
    color: '#8D929D',
    fontSize: tokens.type.micro,
    lineHeight: 16,
    fontWeight: tokens.weight.medium,
    textAlign: 'center'
  }
});
