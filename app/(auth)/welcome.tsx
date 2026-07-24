import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { PrimaryButton } from '@/components/ui/primary-button';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';
import { tokens } from '@/theme/tokens';

export default function WelcomeScreen() {
  const { enterDemo } = useAuth();

  return (
    <LinearGradient colors={['#090E1A', '#3B0764', '#7C3AED']} style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeIcon}>⚡</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>YOUR CAMPUS. YOUR CREW.</Text>
        <Text style={styles.title}>Plans hit different when everyone shows up.</Text>
        <Text style={styles.subtitle}>
          Swipe on real activities. Match into groups. Earn XP for making it out.
        </Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="Join the clash" onPress={() => router.push('/sign-up')} />
        <PrimaryButton
          label="I already have an account"
          onPress={() => router.push('/sign-in')}
          variant="ghost"
          style={styles.secondary}
        />
        {!env.isBackendConfigured ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void enterDemo()}
            style={styles.demoButton}
          >
            <Text style={styles.demoText}>Enter local demo →</Text>
          </Pressable>
        ) : null}
        <Text style={styles.footnote}>
          18+ only · University email access required · Group activities at public venues
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space.lg,
    paddingTop: 82,
    paddingBottom: tokens.space.xl
  },
  badge: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    transform: [{ rotate: '-7deg' }]
  },
  badgeIcon: { fontSize: 40 },
  copy: { marginVertical: tokens.space.xl },
  eyebrow: {
    color: '#67E8F9',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5
  },
  title: {
    marginTop: tokens.space.md,
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 45,
    fontWeight: '900',
    letterSpacing: -1.8
  },
  subtitle: {
    marginTop: tokens.space.md,
    maxWidth: 420,
    color: '#E9D5FF',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600'
  },
  actions: { gap: tokens.space.sm },
  secondary: { backgroundColor: 'rgba(255,255,255,0.1)' },
  demoButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  demoText: { color: '#FDE68A', fontSize: 15, fontWeight: '800' },
  footnote: {
    marginTop: tokens.space.sm,
    color: '#C4B5FD',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center'
  }
});
