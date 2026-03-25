-- Run in Supabase SQL editor after supabase-schema.sql and supabase-dashboard-schema.sql.
-- 1) Adds 'admin' to metric_invites.permission
-- 2) Lets admins edit metric slots like editors
-- 3) Lets metric admins SELECT/INSERT/UPDATE/DELETE invites for that same owner + metric_index

-- --- A) permission check ----------------------------------------------------
alter table public.metric_invites drop constraint if exists metric_invites_permission_check;
alter table public.metric_invites
  add constraint metric_invites_permission_check
  check (permission = any (array['read'::text, 'edit'::text, 'admin'::text]));

-- --- B) business_metric_slots: admin same as edit ---------------------------
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
      and mi.permission in ('edit', 'admin')
  )
)
with check (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = business_metric_slots.owner_user_id
      and mi.metric_index = business_metric_slots.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission in ('edit', 'admin')
  )
);

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
      and mi.permission in ('edit', 'admin')
  )
);

-- --- C) Delegated admins manage invites for their metric --------------------
drop policy if exists "metric_invite_delegate_select" on public.metric_invites;
create policy "metric_invite_delegate_select"
on public.metric_invites
for select
to authenticated
using (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = metric_invites.owner_user_id
      and mi.metric_index = metric_invites.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission = 'admin'
  )
);

drop policy if exists "metric_invite_delegate_insert" on public.metric_invites;
create policy "metric_invite_delegate_insert"
on public.metric_invites
for insert
to authenticated
with check (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = metric_invites.owner_user_id
      and mi.metric_index = metric_invites.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission = 'admin'
  )
);

drop policy if exists "metric_invite_delegate_update" on public.metric_invites;
create policy "metric_invite_delegate_update"
on public.metric_invites
for update
to authenticated
using (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = metric_invites.owner_user_id
      and mi.metric_index = metric_invites.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission = 'admin'
  )
)
with check (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = metric_invites.owner_user_id
      and mi.metric_index = metric_invites.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission = 'admin'
  )
);

drop policy if exists "metric_invite_delegate_delete" on public.metric_invites;
create policy "metric_invite_delegate_delete"
on public.metric_invites
for delete
to authenticated
using (
  exists (
    select 1 from public.metric_invites mi
    where mi.owner_user_id = metric_invites.owner_user_id
      and mi.metric_index = metric_invites.metric_index
      and lower(mi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and mi.status is distinct from 'revoked'
      and mi.permission = 'admin'
  )
);
