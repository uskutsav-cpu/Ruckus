-- PostgreSQL requires newly added enum values to commit before later migrations
-- can safely use them in constraints and trusted functions.

alter type public.report_target add value if not exists 'event';
alter type public.report_target add value if not exists 'organization';
alter type public.xp_reason add value if not exists 'verified_event_checkin';
alter type public.xp_reason add value if not exists 'hosted_event';
alter type public.xp_reason add value if not exists 'qualified_referral';
