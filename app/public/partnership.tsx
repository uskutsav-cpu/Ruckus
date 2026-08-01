import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { AppScreen } from '@/components/ui/app-screen';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { submitPartnershipLead } from '@/features/public/public-service';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

const leadTypes = [
  { value: 'student_club', label: 'Club' },
  { value: 'campus_media', label: 'Media' },
  { value: 'student_government', label: 'Student gov' },
  { value: 'campus_activities', label: 'Campus team' },
  { value: 'other', label: 'Other' }
] as const;

export default function PartnershipPage() {
  const { isDemo } = useAuth();
  const { theme } = useTheme();
  const [campusName, setCampusName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [leadType, setLeadType] =
    useState<(typeof leadTypes)[number]['value']>('student_club');
  const [message, setMessage] = useState('');
  const [website] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(
    null
  );

  const submit = async () => {
    setNotice(null);
    if (
      campusName.trim().length < 2 ||
      organizationName.trim().length < 2 ||
      contactName.trim().length < 2 ||
      !/^\S+@\S+\.\S+$/.test(contactEmail.trim()) ||
      message.trim().length < 10
    ) {
      setNotice({
        tone: 'error',
        text: 'Complete every field with a valid contact email.'
      });
      return;
    }
    setSubmitting(true);
    try {
      await submitPartnershipLead(
        {
          campusName,
          organizationName,
          contactName,
          contactEmail,
          leadType,
          message,
          website
        },
        isDemo
      );
      setNotice({
        tone: 'info',
        text: isDemo
          ? 'Demo submission validated locally. No lead was sent.'
          : 'Thanks—your request was submitted for human review. Ruckus will not send automated cold email.'
      });
      setMessage('');
    } catch {
      setNotice({
        tone: 'error',
        text: 'The request was not submitted. Wait a moment and try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.screen}>
      <PublicHeader />
      <Text style={[styles.eyebrow, { color: theme.textMuted }]}>Campus launch</Text>
      <Text style={[styles.title, { color: theme.text }]}>
        Bring your community to Ruckus.
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Student clubs, campus media, student governments, residence groups, activities
        teams, and potential university partners can request a human follow-up.
      </Text>
      <InlineNotice message="Submitting does not create a partnership, verified badge, or university endorsement. Every request is reviewed." />
      <TextField
        label="Campus"
        value={campusName}
        onChangeText={setCampusName}
        maxLength={160}
      />
      <TextField
        label="Organization"
        value={organizationName}
        onChangeText={setOrganizationName}
        maxLength={160}
      />
      <TextField
        label="Your name"
        value={contactName}
        onChangeText={setContactName}
        maxLength={100}
      />
      <TextField
        label="Contact email"
        value={contactEmail}
        onChangeText={setContactEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <SegmentedControl
        accessibilityLabel="Organization type"
        value={leadType}
        options={leadTypes}
        onChange={setLeadType}
      />
      <TextField
        label="How would you use Ruckus?"
        value={message}
        onChangeText={setMessage}
        maxLength={3000}
        multiline
        style={styles.multiline}
      />
      <Text style={[styles.privacy, { color: theme.textMuted }]}>
        Privacy notice: these details are used only to review and respond to this request.
        They are stored in a restricted lead queue, are not published, and are not used to
        expose a public contact email.
      </Text>
      {notice ? <InlineNotice tone={notice.tone} message={notice.text} /> : null}
      <PrimaryButton
        label="Submit for review"
        loading={submitting}
        onPress={() => void submit()}
      />
      <PublicFooter />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  eyebrow: {
    marginTop: 48,
    fontSize: tokens.type.caption,
    fontWeight: tokens.weight.bold
  },
  title: {
    marginTop: tokens.space.sm,
    fontSize: tokens.type.hero,
    lineHeight: tokens.lineHeight.hero,
    fontWeight: tokens.weight.black
  },
  subtitle: {
    marginTop: tokens.space.md,
    marginBottom: tokens.space.lg,
    fontSize: tokens.type.heading,
    lineHeight: 31
  },
  multiline: { minHeight: 132, paddingTop: tokens.space.md, textAlignVertical: 'top' },
  privacy: {
    marginVertical: tokens.space.md,
    fontSize: tokens.type.caption,
    lineHeight: tokens.lineHeight.caption
  }
});
