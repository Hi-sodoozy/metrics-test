-- Metrics app schema (run in Supabase SQL editor)
-- This creates a Supabase-backed invite directory with RLS.

create extension if not exists pgcrypto;

create table if not exists public.metric_invites (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by_user_id uuid references auth.users(id) on delete set null,
  metric_index integer not null check (metric_index >= -1),
  email text not null,
  first_name text,
  last_name text,
  business_name text,
  permission text not null default 'edit' check (permission in ('edit', 'read')),
  status text not null default 'invited' check (status in ('invited', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.metric_invites
  add column if not exists permission text not null default 'edit' check (permission in ('edit', 'read'));

create unique index if not exists metric_invites_owner_metric_email_idx
  on public.metric_invites (owner_user_id, metric_index, lower(email));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_metric_invites_updated_at on public.metric_invites;
create trigger trg_metric_invites_updated_at
before update on public.metric_invites
for each row execute function public.set_updated_at();

alter table public.metric_invites enable row level security;

-- Business owners can fully manage their own invite rows
drop policy if exists "owner_select_metric_invites" on public.metric_invites;
create policy "owner_select_metric_invites"
on public.metric_invites
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "owner_insert_metric_invites" on public.metric_invites;
create policy "owner_insert_metric_invites"
on public.metric_invites
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "owner_update_metric_invites" on public.metric_invites;
create policy "owner_update_metric_invites"
on public.metric_invites
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "owner_delete_metric_invites" on public.metric_invites;
create policy "owner_delete_metric_invites"
on public.metric_invites
for delete
to authenticated
using (owner_user_id = auth.uid());

-- Invited users can read rows where their account email matches the invitation email
drop policy if exists "invitee_select_metric_invites" on public.metric_invites;
create policy "invitee_select_metric_invites"
on public.metric_invites
for select
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and status <> 'revoked'
);
