-- Narrow table privileges used by reviewed service-role Edge Function workers.
grant select, update on public.notification_jobs to service_role;
grant select on public.events to service_role;
grant select on public.groups to service_role;
grant select on public.activity_sessions to service_role;
grant select on public.group_members to service_role;
grant select on public.xp_ledger to service_role;
grant select, insert on public.notification_dispatches to service_role;
grant select on public.notification_preferences to service_role;
grant select, update on public.push_tokens to service_role;
grant select, insert, update on public.push_receipts to service_role;
grant select, insert, update on public.partnership_leads to service_role;
