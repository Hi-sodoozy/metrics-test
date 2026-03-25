-- Expand business metric slots from indices 0–3 to 0–9 (10 boards per owner).
-- Run in Supabase SQL editor after supabase-dashboard-schema.sql.

alter table public.business_metric_slots
  drop constraint if exists business_metric_slots_metric_index_check;

alter table public.business_metric_slots
  add constraint business_metric_slots_metric_index_check
  check (metric_index >= 0 and metric_index <= 9);
