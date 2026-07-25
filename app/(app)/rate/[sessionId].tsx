import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { AppIcon } from '@/components/ui/app-icon';
import { BackButton } from '@/components/ui/back-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { submitRating } from '@/features/profile/profile-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

export default function RateActivityScreen() {
  const { sessionId: rawSessionId } = useLocalSearchParams<{
    sessionId: string;
    demo?: string;
  }>();
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const { isDemo } = useAuth();
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!sessionId || !rating) return;
    setSubmitting(true);
    setError('');
    try {
      await submitRating(sessionId, rating, feedback, isDemo);
      setComplete(true);
    } catch {
      setError('Ratings are available after a verified check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (complete) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.complete}>
          <StatusPill
            label={isDemo ? 'DEMO FEEDBACK · NOT SENT' : 'FEEDBACK RECORDED'}
            tone={isDemo ? 'accent' : 'success'}
          />
          <View
            style={[
              styles.completeIcon,
              { backgroundColor: isDemo ? theme.accentMuted : tokens.color.ruckusSoft }
            ]}
          >
            <AppIcon
              name="star"
              size={34}
              color={isDemo ? theme.accent : theme.success}
            />
          </View>
          <Text style={[styles.completeTitle, { color: theme.text }]}>
            {isDemo ? 'Feedback preview complete' : 'Thanks for the feedback'}
          </Text>
          <Text style={[styles.completeCopy, { color: theme.textMuted }]}>
            {isDemo
              ? 'No rating was sent and no XP was recorded. Connected mode submits feedback to campus operations.'
              : 'Your rating helps the campus team improve activities. The trusted ledger awarded +10 XP once for this event.'}
          </Text>
          <PrimaryButton
            label="View profile"
            onPress={() => router.replace('/profile')}
            style={styles.submit}
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BackButton label="Back" onPress={() => router.back()} />
      <StatusPill
        label={isDemo ? 'Demo feedback' : 'Post-event feedback'}
        tone={isDemo ? 'accent' : 'neutral'}
      />
      <Text style={[styles.title, { color: theme.text }]}>How was the activity?</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Your rating goes to campus operations, not individual group members.
      </Text>
      {isDemo ? (
        <InlineNotice message="This preview accepts local input only. It does not submit feedback or award XP." />
      ) : null}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Activity rating"
        style={styles.stars}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`${value} stars`}
            accessibilityState={{ selected: rating === value }}
            onPress={() => setRating(value)}
            style={styles.starButton}
          >
            <AppIcon
              name="star"
              size={32}
              color={value <= rating ? tokens.color.amber : theme.border}
            />
          </Pressable>
        ))}
      </View>
      <TextField
        label="What worked or could improve? (optional)"
        value={feedback}
        onChangeText={setFeedback}
        multiline
        maxLength={1000}
        help={`${feedback.length}/1000`}
        style={styles.feedback}
      />
      <PrimaryButton
        label={isDemo ? 'Preview submission' : 'Submit rating'}
        loading={submitting}
        disabled={!rating}
        onPress={() => void submit()}
        style={styles.submit}
      />
      <PrimaryButton label="Not now" variant="ghost" onPress={() => router.back()} />
      {error ? <InlineNotice tone="error" message={error} /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.title,
    lineHeight: tokens.lineHeight.title,
    fontWeight: tokens.weight.bold,
    letterSpacing: -1
  },
  subtitle: {
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.md,
    fontSize: tokens.type.body,
    lineHeight: tokens.lineHeight.body,
    fontWeight: tokens.weight.medium
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: tokens.space.lg
  },
  starButton: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center'
  },
  feedback: { minHeight: 150, paddingTop: tokens.space.md, textAlignVertical: 'top' },
  submit: { marginTop: tokens.space.lg },
  complete: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  completeIcon: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 43,
    marginTop: tokens.space.lg
  },
  completeTitle: {
    marginTop: tokens.space.lg,
    fontSize: tokens.type.title,
    fontWeight: tokens.weight.bold,
    textAlign: 'center'
  },
  completeCopy: {
    maxWidth: 340,
    marginTop: tokens.space.sm,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  }
});
