-- Run once in Supabase SQL editor if you already created metric_invites with the OLD
-- unique index on (owner_user_id, metric_index, lower(email)).
-- That expression index breaks JS upsert: onConflict must match plain columns.

update public.metric_invites
set email = lower(trim(email))
where email is not null;

drop index if exists metric_invites_owner_metric_email_idx;

create unique index if not exists metric_invites_owner_metric_email_idx
  on public.metric_invites (owner_user_id, metric_index, email);
