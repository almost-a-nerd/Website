create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "insert_own_message" on public.messages
  for insert to authenticated
  with check (auth.uid() = sender_id);

create table if not exists public.pageviews (
  id bigserial primary key,
  path text not null,
  visited_at timestamptz not null default now(),
  ip inet,
  ua text,
  referrer text
);
alter table public.pageviews enable row level security;

create or replace view public.pageview_counts as
  select path, date_trunc('day', visited_at) as day, count(*)::bigint as visits
  from public.pageviews
  group by 1,2;
