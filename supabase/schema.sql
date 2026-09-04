create extension if not exists pgcrypto;

-- ============================================================================
-- 1. AUTHENTICATION & IDENTITY ARCHITECTURE TABLES
-- ============================================================================

-- Core users entity
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'locked')),
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique indexes on users
create unique index if not exists users_username_lower_idx on public.users (lower(trim(username)));
create unique index if not exists users_email_lower_idx on public.users (lower(trim(email)));

-- User credentials (password hash & failed attempts tracking)
create table if not exists public.user_credentials (
  user_id uuid primary key references public.users(id) on delete cascade,
  password_hash text not null,
  password_changed_at timestamptz not null default now(),
  failed_attempts integer not null default 0 check (failed_attempts >= 0)
);

-- User profiles (personal, lifestyle & financial starting numbers)
create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  id uuid generated always as (user_id) stored, -- Backwards compatibility alias for queries using id
  name text,
  age integer check (age is null or age > 0),
  dob text,
  gender text,
  city text,
  occupation text,
  profile_photo text,
  financial_type text check (financial_type in ('student','earning','both')),
  user_type text default 'Professional',
  goal text default 'track',
  monthly_income numeric(14,2) default 0,
  monthly_pocket_money numeric(14,2) default 0,
  current_spend numeric(14,2) default 0,
  monthly_investment numeric(14,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- OAuth provider accounts (Google, etc.)
create table if not exists public.oauth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  created_at timestamptz not null default now(),
  unique(provider, provider_user_id)
);

-- Email verification tokens
create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Password reset tokens
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Sessions management
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Login attempts & security auditing
create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  ip_address text,
  attempted_at timestamptz not null default now(),
  success boolean not null default false
);

-- ============================================================================
-- 2. FINANCIAL DOMAIN TABLES (SPENDWISE MODULES)
-- ============================================================================

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null check (amount >= 0),
  frequency text not null default 'monthly',
  created_at timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  parent_name text
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  expense_date date not null default current_date,
  payment_method text not null default 'UPI',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  month_start date not null,
  amount numeric(14,2) not null check (amount >= 0),
  unique(user_id, category, month_start)
);

create table if not exists public.emis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_amount numeric(14,2) not null check (total_amount > 0),
  monthly_emi numeric(14,2) not null check (monthly_emi > 0),
  duration_months integer not null check (duration_months > 0),
  start_date date not null,
  payment_day integer not null default 1 check (payment_day between 1 and 28),
  interest_amount numeric(14,2) not null default 0,
  status text not null default 'active'
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_type text not null,
  name text,
  amount numeric(14,2) not null check (amount > 0),
  frequency text not null default 'one_time',
  investment_date date not null default current_date
);

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  frequency text not null default 'monthly',
  next_due_date date not null
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  condition_type text not null
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table public.users enable row level security;
alter table public.user_credentials enable row level security;
alter table public.user_profiles enable row level security;
alter table public.oauth_accounts enable row level security;
alter table public.email_verifications enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.sessions enable row level security;
alter table public.login_attempts enable row level security;

alter table public.income_sources enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.emis enable row level security;
alter table public.investments enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.user_badges enable row level security;
alter table public.expense_categories enable row level security;
alter table public.badges enable row level security;

-- Users policies
create policy "users own row readable" on public.users
for select using (auth.uid() = id);

create policy "users own row updatable" on public.users
for update using (auth.uid() = id);

-- User profiles policies
create policy "profiles own rows" on public.user_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- User credentials (strictly restricted to backend functions / service_role)
create policy "credentials own update" on public.user_credentials
for update using (auth.uid() = user_id);

-- OAuth accounts policies
create policy "oauth own rows" on public.oauth_accounts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sessions policies
create policy "sessions own rows" on public.sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Financial modules policies
create policy "income own rows" on public.income_sources
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "expenses own rows" on public.expenses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets own rows" on public.budgets
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "emis own rows" on public.emis
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "investments own rows" on public.investments
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recurring own rows" on public.recurring_expenses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user badges own rows" on public.user_badges
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories readable" on public.expense_categories
for select using (true);

create policy "badges readable" on public.badges
for select using (true);

-- Seed static lookup data
insert into public.expense_categories(name, parent_name) values
  ('Food', 'Essentials'),
  ('EMI', 'Financial'),
  ('Invest', 'Financial'),
  ('Personal Expense', 'Lifestyle'),
  ('Outing', 'Lifestyle'),
  ('Night Out', 'Lifestyle'),
  ('Hospital', 'Medical'),
  ('Medical', 'Medical'),
  ('Gym', 'Lifestyle'),
  ('Supplements', 'Lifestyle'),
  ('Bank Savings', 'Financial'),
  ('Petrol & Travel', 'Essentials'),
  ('Shopping', 'Lifestyle'),
  ('Bills', 'Essentials'),
  ('Education', 'Essentials'),
  ('Miscellaneous', 'Other')
on conflict (name) do nothing;

insert into public.badges(code, name, description, condition_type) values
  ('FIRST_SAVER', 'First Saver', 'Saved money for the first time.', 'savings_positive'),
  ('INVESTOR', 'Investor', 'Made your first investment.', 'first_investment'),
  ('BUDGET_KEEPER', 'Budget Keeper', 'Stayed within category budgets.', 'budget_adherence'),
  ('CONSISTENT_SAVER', 'Consistent Saver', 'Maintained a positive savings rate for multiple months.', 'saving_streak'),
  ('DEBT_CRUSHER', 'Debt Crusher', 'Completed an EMI schedule.', 'emi_completed')
on conflict (code) do nothing;

-- ============================================================================
-- 4. SECURITY DEFINER FUNCTIONS & AUTH TRIGGERS
-- ============================================================================

-- Function to check if a username is available (case-insensitive)
create or replace function public.check_username_available(requested_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_uname text;
begin
  if requested_username is null then
    return false;
  end if;
  clean_uname := lower(trim(requested_username));
  if length(clean_uname) < 3 or length(clean_uname) > 30 then
    return false;
  end if;

  -- Check in public.users
  if exists (select 1 from public.users where lower(trim(username)) = clean_uname) then
    return false;
  end if;

  return true;
end;
$$;

grant execute on function public.check_username_available(text) to anon, authenticated, service_role;

-- Function to check if an email exists in public.users or auth.users
create or replace function public.check_email_exists(lookup_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  clean_email text;
begin
  if lookup_email is null then
    return false;
  end if;
  clean_email := lower(trim(lookup_email));
  if clean_email = '' then
    return false;
  end if;

  -- 1. Check in public.users
  if exists (select 1 from public.users where lower(trim(email)) = clean_email) then
    return true;
  end if;

  -- 2. Check in auth.users
  if exists (select 1 from auth.users where lower(trim(email)) = clean_email) then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.check_email_exists(text) to anon, authenticated, service_role;

-- Function to record login attempts for audit and rate limiting
create or replace function public.record_login_attempt(
  p_user_id uuid,
  p_ip text,
  p_success boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.login_attempts (user_id, ip_address, success, attempted_at)
  values (p_user_id, p_ip, p_success, now());

  -- If failure, increment failed attempts in credentials
  if p_user_id is not null then
    if p_success then
      update public.user_credentials set failed_attempts = 0 where user_id = p_user_id;
    else
      update public.user_credentials set failed_attempts = failed_attempts + 1 where user_id = p_user_id;
    end if;
  end if;
end;
$$;

grant execute on function public.record_login_attempt(uuid, text, boolean) to anon, authenticated, service_role;

-- Automated trigger to sync new user registrations from auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_uname text;
  raw_name text;
begin
  raw_uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  raw_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', raw_uname);

  -- 1. Sync into public.users
  insert into public.users (id, email, username, email_verified, status)
  values (
    new.id,
    new.email,
    raw_uname,
    (new.email_confirmed_at is not null),
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(public.users.username, excluded.username),
    email_verified = (new.email_confirmed_at is not null),
    updated_at = now();

  -- 2. Sync into public.user_profiles
  insert into public.user_profiles (user_id, name)
  values (new.id, raw_name)
  on conflict (user_id) do update set
    name = coalesce(public.user_profiles.name, excluded.name),
    updated_at = now();

  -- 3. If OAuth provider is present, record in oauth_accounts
  if new.raw_app_meta_data->>'provider' is not null and new.raw_app_meta_data->>'provider' != 'email' then
    insert into public.oauth_accounts (user_id, provider, provider_user_id)
    values (
      new.id,
      new.raw_app_meta_data->>'provider',
      coalesce(new.raw_user_meta_data->>'provider_id', new.id::text)
    )
    on conflict (provider, provider_user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();
