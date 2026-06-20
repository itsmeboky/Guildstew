-- alpha_applications
-- Source of truth for the manual (hand-vetted) alpha approval flow.
-- Stores who applied, their review status, and their issued join code.
--
-- Write paths:
--   * alpha-apply.js (Netlify, service role)        -> upsert pending rows
--   * alpha-admin   (Edge Function, service role)   -> approve/resend/revoke/reject
-- Read paths:
--   * admin panel (user JWT, RLS is_admin SELECT)   -> the queue
--   * alpha-verify.js (Netlify, service role)       -> revoke check at the gate
create table if not exists public.alpha_applications (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null,                      -- normalized lowercase
  first_name    text,
  role          text,
  why           text,
  status        text        not null default 'pending'
                 check (status in ('pending','approved','revoked','rejected')),
  join_code     text,                                       -- set on approve
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists alpha_applications_email_key
  on public.alpha_applications (email);
create index if not exists alpha_applications_status_idx
  on public.alpha_applications (status, submitted_at desc);
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists alpha_applications_set_updated_at on public.alpha_applications;
create trigger alpha_applications_set_updated_at
  before update on public.alpha_applications
  for each row execute function public.set_updated_at();
alter table public.alpha_applications enable row level security;
drop policy if exists alpha_applications_admin_select on public.alpha_applications;
create policy alpha_applications_admin_select
  on public.alpha_applications for select
  using (public.is_admin());
drop policy if exists alpha_applications_admin_update on public.alpha_applications;
create policy alpha_applications_admin_update
  on public.alpha_applications for update
  using (public.is_admin()) with check (public.is_admin());
-- No INSERT policy on purpose: inserts come via service role (Netlify function +
-- Edge Function), keeping the public marketing page off the anon-insert spam path.
