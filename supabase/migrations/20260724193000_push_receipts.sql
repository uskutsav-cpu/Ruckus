-- Expo ticket receipts are service-only. They let the scheduled worker invalidate
-- devices that become unregistered after the initial push ticket was accepted.

create table public.push_receipts (
  id uuid primary key default extensions.gen_random_uuid(),
  ticket_id text not null unique,
  push_token_id uuid not null references public.push_tokens(id) on delete cascade,
  status text not null default 'pending',
  error_code text,
  created_at timestamptz not null default now(),
  checked_at timestamptz,
  constraint push_receipts_ticket_length check (char_length(ticket_id) between 10 and 200),
  constraint push_receipts_status check (status in ('pending', 'delivered', 'error')),
  constraint push_receipts_error_length check (
    error_code is null or char_length(error_code) <= 100
  )
);

create index push_receipts_pending_idx
on public.push_receipts(created_at)
where status = 'pending';

alter table public.push_receipts enable row level security;
revoke all on table public.push_receipts from anon, authenticated;

comment on table public.push_receipts is
  'Service-role-only Expo receipt queue; never readable or writable by the mobile client.';
