-- Run in Supabase SQL editor AFTER supabase-schema.sql (metric_invites).
-- Business metrics per slot + profile + personal dashboards with RLS.

create extension if not exists pgcrypto;

-- One row per business owner: display name + image for results header
create table if not exists public.business_profiles (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  business_image text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_business_profiles_updated_at on public.business_profiles;
create trigger trg_business_profiles_updated_at
before update on public.business_profiles
for each row execute function public.set_updated_at();

alter table public.business_profiles enable row level security;

drop policy if exists "bp_owner_all" on public.business_profiles;
create policy "bp_owner_all"
on public.business_profiles
for all
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- Any active invitee to this owner can read profile (for header / context)
drop policy if exists "bp_invitee_select" on public.business_profiles;
create policy "bp_invitee_select"
on public.business_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = business_profiles.owner_user_id
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
  )
);

-- Metric slots 0–3 per owner (payload = one metric object: heading, ranking, etc.)
create table if not exists public.business_metric_slots (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  metric_index integer not null check (metric_index >= 0 and metric_index <= 3),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, metric_index)
);

drop trigger if exists trg_business_metric_slots_updated_at on public.business_metric_slots;
create trigger trg_business_metric_slots_updated_at
before update on public.business_metric_slots
for each row execute function public.set_updated_at();

alter table public.business_metric_slots enable row level security;

drop policy if exists "bms_owner_all" on public.business_metric_slots;
create policy "bms_owner_all"
on public.business_metric_slots
for all
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- Invitee can read a slot if invited to that exact metric
drop policy if exists "bms_invitee_select" on public.business_metric_slots;
create policy "bms_invitee_select"
on public.business_metric_slots
for select
to authenticated
using (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = business_metric_slots.owner_user_id
      and mi.metric_index = business_metric_slots.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
  )
);

-- Invitee can update only if invited with edit permission
drop policy if exists "bms_invitee_update" on public.business_metric_slots;
create policy "bms_invitee_update"
on public.business_metric_slots
for update
to authenticated
using (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = business_metric_slots.owner_user_id
      and mi.metric_index = business_metric_slots.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission = 'edit'
  )
)
with check (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = business_metric_slots.owner_user_id
      and mi.metric_index = business_metric_slots.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission = 'edit'
  )
);

-- Edit invitees may insert a slot row (e.g. first upsert) for metrics they are allowed to edit
drop policy if exists "bms_invitee_insert" on public.business_metric_slots;
create policy "bms_invitee_insert"
on public.business_metric_slots
for insert
to authenticated
with check (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = business_metric_slots.owner_user_id
      and mi.metric_index = business_metric_slots.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission = 'edit'
  )
);

-- Personal metrics (same JSON shape as local metricsDashboard)
create table if not exists public.personal_dashboards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dashboard jsonb not null default '{"businessName":"","businessImage":"","metrics":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_personal_dashboards_updated_at on public.personal_dashboards;
create trigger trg_personal_dashboards_updated_at
before update on public.personal_dashboards
for each row execute function public.set_updated_at();

alter table public.personal_dashboards enable row level security;

drop policy if exists "pd_owner_all" on public.personal_dashboards;
create policy "pd_owner_all"
on public.personal_dashboards
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
