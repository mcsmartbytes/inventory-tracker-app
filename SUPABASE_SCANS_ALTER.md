create extension if not exists pgcrypto;

-- Ensure table exists with base columns
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  created_at timestamptz not null default now(),
  device text,
  user_id uuid
);

-- Add missing columns (safe if they already exist)
alter table public.scans add column if not exists device text;
alter table public.scans add column if not exists user_id uuid;
alter table public.scans add column if not exists created_at timestamptz;

-- Backfill and enforce defaults/constraints
update public.scans set created_at = now() where created_at is null;
alter table public.scans alter column created_at set not null;
alter table public.scans alter column created_at set default now();

alter table public.scans alter column id set default gen_random_uuid();
alter table public.scans alter column code set not null;

-- Helpful indexes
create index if not exists scans_user_id_created_at_idx on public.scans (user_id, created_at desc);
create index if not exists scans_created_at_idx on public.scans (created_at desc);

-- Enable RLS and recreate policies
alter table public.scans enable row level security;

drop policy if exists "select_own_scans" on public.scans;
create policy "select_own_scans" on public.scans
for select using (auth.uid() = user_id);

drop policy if exists "insert_with_own_user_id" on public.scans;
create policy "insert_with_own_user_id" on public.scans
for insert with check (auth.uid() = user_id);

drop policy if exists "delete_own_scans" on public.scans;
create policy "delete_own_scans" on public.scans
for delete using (auth.uid() = user_id);

-- Auto-set user_id when missing
create or replace function public.set_user_id()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_set_user_id on public.scans;
create trigger trg_set_user_id before insert on public.scans
for each row execute function public.set_user_id();
