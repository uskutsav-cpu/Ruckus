import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';

export default function BootstrapScreen() {
  return (
    <LinearGradient colors={['#111827', '#4C1D95', '#7C3AED']} style={styles.container}>
      <View style={styles.mark}>
        <Text style={styles.markText}>⚡</Text>
      </View>
      <Text style={styles.title}>Campus Clash</Text>
      <Text style={styles.tagline}>Pick a plan. Find your crew. Show up.</Text>
      {!env.isBackendConfigured ? (
        <Text style={styles.demo}>Development demo mode</Text>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.xl
  },
  mark: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '-8deg' }]
  },
  markText: { fontSize: 46 },
  title: {
    marginTop: tokens.space.lg,
    color: '#FFFFFF',
    fontSize: tokens.type.display,
    fontWeight: '900',
    letterSpacing: -1.5
  },
  tagline: {
    marginTop: tokens.space.sm,
    color: '#E9D5FF',
    fontSize: tokens.type.body,
    fontWeight: '600',
    textAlign: 'center'
  },
  demo: {
    marginTop: tokens.space.xl,
    color: '#FDE68A',
    fontSize: tokens.type.caption,
    fontWeight: '700'
  }
});
