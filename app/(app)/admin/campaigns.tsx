import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppScreen } from '@/components/ui/app-screen';
import { BackButton } from '@/components/ui/back-button';
import { ErrorState } from '@/components/ui/error-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ListCardSkeleton } from '@/components/ui/loading-skeleton';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatePanel } from '@/components/ui/state-panel';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { hasCampusCapability } from '@/features/campus-admin/campus-admin-types';
import { useCampusAdminAccess } from '@/features/campus-admin/use-campus-admin';
import type { GrowthCampaignKind } from '@/features/growth/campaign-types';
import {
  campaignAssetKindLabels,
  campaignKindLabels
} from '@/features/growth/campaign-types';
import {
  useCampusCampaigns,
  useCampusGrowthAnalytics,
  useCreateCampaignAsset,
  useCreateGrowthCampaign
} from '@/features/growth/use-campaigns';
import { useTheme } from '@/providers/theme-provider';
import { tokens } from '@/theme/tokens';

type CampaignTab = 'campaigns' | 'analytics';

const kindOptions: readonly { value: GrowthCampaignKind; label: string }[] = [
  { value: 'welcome_week', label: 'Welcome' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'club_fair', label: 'Club fair' },
  { value: 'custom', label: 'Custom' }
];

const tabs: readonly { value: CampaignTab; label: string }[] = [
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'analytics', label: 'Growth' }
];

function statusTone(status: string): 'success' | 'accent' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'scheduled') return 'accent';
  if (status === 'cancelled') return 'warning';
  return 'neutral';
}

export default function CampusCampaignsScreen() {
  const { theme } = useTheme();
  const access = useCampusAdminAccess();
  const [tab, setTab] = useState<CampaignTab>('campaigns');

  const assignments = useMemo(() => access.data?.campuses ?? [], [access.data]);
  const campusId = assignments[0]?.campusId ?? null;
  const canManage = hasCampusCapability(access.data, campusId, 'announcements');
  const canReadGrowth = hasCampusCapability(access.data, campusId, 'export');

  if (access.isPending) {
    return (
      <AppScreen title="Campaigns">
        <BackButton />
        <ListCardSkeleton />
      </AppScreen>
    );
  }

  if (access.isError) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="alert"
          title="Campaigns unavailable"
          message="We could not confirm your campus access. Try again shortly."
        />
      </AppScreen>
    );
  }

  if (!canManage && !canReadGrowth) {
    return (
      <AppScreen>
        <BackButton />
        <ErrorState
          icon="lock"
          title="Campaign access required"
          message="Campaign tools are available to campus announcement managers and administrators."
        />
      </AppScreen>
    );
  }

  const visibleTabs = tabs.filter((entry) =>
    entry.value === 'analytics' ? canReadGrowth : canManage
  );
  const activeTab = visibleTabs.some((entry) => entry.value === tab)
    ? tab
    : (visibleTabs[0]?.value ?? 'campaigns');

  return (
    <AppScreen
      eyebrow="Growth"
      title="Campus campaigns"
      subtitle="Welcome-week and orientation pushes, printable QR assets, and growth reporting."
      scroll
    >
      <BackButton />
      {visibleTabs.length > 1 ? (
        <SegmentedControl
          accessibilityLabel="Campaign section"
          value={activeTab}
          options={visibleTabs}
          onChange={setTab}
        />
      ) : null}

      {activeTab === 'campaigns' && canManage ? (
        <CampaignsPanel campusId={campusId} />
      ) : null}
      {activeTab === 'analytics' && canReadGrowth ? (
        <GrowthPanel campusId={campusId} />
      ) : null}

      <Text style={[styles.footnote, { color: theme.textSubtle }]}>
        Printed assets carry a random token, never a campus identifier, and scans are
        counted once per scanner per day without storing any device or network identity.
      </Text>
    </AppScreen>
  );
}

function CampaignsPanel({ campusId }: { campusId: string | null }) {
  const { theme } = useTheme();
  const campaigns = useCampusCampaigns(campusId, true);
  const createCampaign = useCreateGrowthCampaign(campusId);
  const createAsset = useCreateCampaignAsset(campusId);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<GrowthCampaignKind>('welcome_week');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const nameValid = name.trim().length >= 3;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>New campaign</Text>
      <TextField
        label="Campaign name"
        value={name}
        onChangeText={setName}
        maxLength={120}
        placeholder="Welcome Week 2026"
      />
      <SegmentedControl
        accessibilityLabel="Campaign type"
        value={kind}
        options={kindOptions}
        onChange={setKind}
      />
      <PrimaryButton
        label="Create campaign"
        disabled={!nameValid || createCampaign.isPending}
        loading={createCampaign.isPending}
        accessibilityHint="Creates a scheduled campaign running for the next seven days."
        onPress={() => {
          const startsAt = new Date().toISOString();
          const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          createCampaign.mutate(
            { kind, name: name.trim(), startsAt, endsAt },
            {
              onSuccess: () => setName(''),
              onError: () =>
                Alert.alert(
                  'Campaign failed',
                  'The campaign could not be created. A campaign name must be unique for your campus.'
                )
            }
          );
        }}
      />

      {campaigns.isPending ? <ListCardSkeleton /> : null}
      {campaigns.isError ? (
        <ErrorState
          icon="alert"
          title="Campaigns unavailable"
          message="Campus campaigns could not be loaded."
        />
      ) : null}
      {campaigns.data?.length === 0 ? (
        <StatePanel
          icon="info"
          title="No campaigns yet"
          message="Create a welcome-week or orientation campaign to start tracking printed assets."
        />
      ) : null}

      {campaigns.data?.map((campaign) => {
        const isExpanded = expandedId === campaign.id;
        const totalScans = campaign.assets.reduce((sum, asset) => sum + asset.scans, 0);
        return (
          <View
            key={campaign.id}
            style={[styles.card, { backgroundColor: theme.surfaceMuted }]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {campaign.name}
              </Text>
              <StatusPill label={campaign.status} tone={statusTone(campaign.status)} />
            </View>
            <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
              {campaignKindLabels[campaign.kind]} ·{' '}
              {format(new Date(campaign.startsAt), 'MMM d')} –{' '}
              {format(new Date(campaign.endsAt), 'MMM d')} · {totalScans.toLocaleString()}{' '}
              scans
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={`${isExpanded ? 'Hide' : 'Show'} assets for ${campaign.name}`}
              onPress={() => setExpandedId(isExpanded ? null : campaign.id)}
            >
              <Text style={[styles.link, { color: theme.primary }]}>
                {isExpanded ? 'Hide assets' : `Assets (${campaign.assets.length})`}
              </Text>
            </Pressable>

            {isExpanded ? (
              <View style={styles.section}>
                {campaign.assets.length === 0 ? (
                  <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
                    No printable assets yet.
                  </Text>
                ) : null}
                {campaign.assets.map((asset) => (
                  <View key={asset.id} style={styles.assetRow}>
                    <View style={styles.qrBox}>
                      <QRCode
                        value={`https://ruckus-iota.vercel.app/c/${asset.token}`}
                        size={96}
                        backgroundColor="#FFFFFF"
                        color="#171918"
                      />
                    </View>
                    <View style={styles.assetMeta}>
                      <Text style={[styles.rowValue, { color: theme.text }]}>
                        {asset.label}
                      </Text>
                      <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
                        {campaignAssetKindLabels[asset.kind]} ·{' '}
                        {asset.scans.toLocaleString()} scans
                      </Text>
                      <PrimaryButton
                        label="Copy link"
                        variant="secondary"
                        onPress={() => {
                          void Clipboard.setStringAsync(
                            `https://ruckus-iota.vercel.app/c/${asset.token}`
                          );
                          Alert.alert('Copied', 'The campaign link is on the clipboard.');
                        }}
                      />
                    </View>
                  </View>
                ))}
                <PrimaryButton
                  label="Add QR poster"
                  variant="secondary"
                  disabled={createAsset.isPending}
                  loading={createAsset.isPending}
                  onPress={() =>
                    createAsset.mutate(
                      {
                        campaignId: campaign.id,
                        kind: 'qr_poster',
                        label: `${campaign.name} poster`,
                        deepLink: 'ruckus://discover'
                      },
                      {
                        onError: () =>
                          Alert.alert(
                            'Asset failed',
                            'The campaign asset could not be created.'
                          )
                      }
                    )
                  }
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function GrowthPanel({ campusId }: { campusId: string | null }) {
  const { theme } = useTheme();
  const analytics = useCampusGrowthAnalytics(campusId, true);

  if (analytics.isPending) return <ListCardSkeleton />;
  if (analytics.isError || !analytics.data) {
    return (
      <ErrorState
        icon="alert"
        title="Growth analytics unavailable"
        message="Campus growth analytics could not be loaded."
      />
    );
  }

  const { counts, referralFunnel, privacy, range } = analytics.data;
  const conversion =
    referralFunnel.conversion === null
      ? 'No referrals yet'
      : `${Math.round(referralFunnel.conversion * 100)}%`;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {format(new Date(range.start), 'MMM d')} – {format(new Date(range.end), 'MMM d')}
      </Text>
      <View style={styles.tileGrid}>
        {counts.newStudentsSuppressed ? (
          <MetricTile
            label="New students"
            value="Withheld"
            hint={`Fewer than ${privacy.minimumCohort}`}
          />
        ) : (
          <MetricTile
            label="New students"
            value={(counts.newStudents ?? 0).toLocaleString()}
          />
        )}
        <MetricTile
          label="Referrals attributed"
          value={counts.referralsAttributed.toLocaleString()}
        />
        <MetricTile
          label="Referrals qualified"
          value={counts.referralsQualified.toLocaleString()}
        />
        <MetricTile
          label="Active ambassadors"
          value={counts.activeAmbassadors.toLocaleString()}
        />
        <MetricTile
          label="Campaign scans"
          value={counts.campaignScans.toLocaleString()}
        />
        <MetricTile
          label="Open competitions"
          value={counts.openCompetitions.toLocaleString()}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.surfaceMuted }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Referral funnel</Text>
        <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
          {referralFunnel.attributed.toLocaleString()} attributed →{' '}
          {referralFunnel.qualified.toLocaleString()} qualified ({conversion})
        </Text>
        <Text style={[styles.cardMeta, { color: theme.textSubtle }]}>
          A referral qualifies only after a verified check-in, so this conversion measures
          real attendance rather than signups.
        </Text>
      </View>

      <InlineNotice
        tone="info"
        icon="shield"
        message={`Cohorts below ${privacy.minimumCohort} people are withheld so no individual can be identified.`}
      />
    </View>
  );
}

function MetricTile({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.tile, { backgroundColor: theme.surfaceMuted }]}
    >
      <Text style={[styles.tileValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: theme.textSubtle }]}>{label}</Text>
      {hint ? (
        <Text style={[styles.tileHint, { color: theme.textSubtle }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space.md, marginTop: tokens.space.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  card: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm
  },
  cardTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  cardMeta: { fontSize: 12, lineHeight: 18 },
  link: { fontSize: 13, fontWeight: '600' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.sm
  },
  rowValue: { fontSize: 14, fontWeight: '600' },
  assetRow: { flexDirection: 'row', gap: tokens.space.md, alignItems: 'flex-start' },
  qrBox: { backgroundColor: '#FFFFFF', padding: tokens.space.sm, borderRadius: 8 },
  assetMeta: { flex: 1, gap: tokens.space.sm },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  tile: {
    minWidth: 104,
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: 2
  },
  tileValue: { fontSize: 20, fontWeight: '700' },
  tileLabel: { fontSize: 12 },
  tileHint: { fontSize: 11, fontStyle: 'italic' },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: tokens.space.lg }
});
