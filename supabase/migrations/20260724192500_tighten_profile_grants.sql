-- Attestation and onboarding completion are trusted state transitions. Profile editing
-- keeps only the user-controlled public card columns as direct updates.

revoke update (
  age_attested,
  age_attested_at,
  safety_acknowledged_at,
  onboarding_completed_at
) on public.profiles from authenticated;
