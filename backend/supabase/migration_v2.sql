-- ============================================================
-- Run this ONCE in Supabase SQL Editor if you already ran the
-- original schema.sql. (Fresh installs: run schema.sql instead,
-- which now includes everything below.)
-- ============================================================

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamp with time zone default now(),
  unique (user_id, category)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  emoji text default '🎯',
  target_amount numeric not null check (target_amount > 0),
  saved_amount numeric not null default 0,
  created_at timestamp with time zone default now()
);

alter table public.budgets enable row level security;
alter table public.goals enable row level security;

create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id);

create policy "own goals" on public.goals
  for all using (auth.uid() = user_id);
