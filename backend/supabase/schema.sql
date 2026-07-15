-- ============================================================
-- Personal Finance App — Database Schema (Supabase / Postgres)
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. Users table (mirrors Supabase auth.users, one row per friend)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  created_at timestamp with time zone default now()
);

-- 2. Plaid "items" = one bank connection (a user can have 2: CIBC + Scotia)
create table if not exists public.bank_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  plaid_item_id text not null,
  plaid_access_token text not null, -- encrypted at rest by Supabase disk encryption
  institution_name text,
  created_at timestamp with time zone default now()
);

-- 3. Accounts under each bank item (chequing, savings, credit card, etc.)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  bank_item_id uuid references public.bank_items(id) on delete cascade not null,
  plaid_account_id text not null,
  name text,
  type text,       -- depository, credit
  subtype text,     -- chequing, savings, credit card
  current_balance numeric,
  available_balance numeric,
  updated_at timestamp with time zone default now()
);

-- 4. Transactions (synced automatically from Plaid, never entered manually)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade not null,
  plaid_transaction_id text unique not null,
  amount numeric not null,       -- positive = money out, negative = money in (Plaid convention)
  category text,
  merchant_name text,
  description text,
  date date not null,
  is_income boolean default false,
  created_at timestamp with time zone default now()
);

-- 5. AI-generated recommendations (so we keep history, not just the latest)
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  month text not null,           -- e.g. '2026-07'
  leftover_amount numeric,
  summary_text text,
  suggestions jsonb,             -- structured list: [{type, description, amount}]
  created_at timestamp with time zone default now()
);

-- ============================================================
-- Row Level Security — each friend can ONLY ever see their own data
-- ============================================================
alter table public.profiles enable row level security;
alter table public.bank_items enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.recommendations enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "own bank items" on public.bank_items
  for all using (auth.uid() = user_id);

create policy "own accounts" on public.accounts
  for all using (
    bank_item_id in (select id from public.bank_items where user_id = auth.uid())
  );

create policy "own transactions" on public.transactions
  for all using (
    account_id in (
      select a.id from public.accounts a
      join public.bank_items b on a.bank_item_id = b.id
      where b.user_id = auth.uid()
    )
  );

create policy "own recommendations" on public.recommendations
  for all using (auth.uid() = user_id);

-- 6. Monthly budgets per spending category
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamp with time zone default now(),
  unique (user_id, category)
);

-- 7. Savings goals (manual tracking — the app never moves money)
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
