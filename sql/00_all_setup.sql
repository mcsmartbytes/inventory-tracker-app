-- One-Stop Setup for Inventory Tracker
-- Safe to re-run. Creates/repairs `scans`, creates `packing_slips`, and reconciliation views.

-- Extensions
create extension if not exists pgcrypto;

-- 1) Ensure scans table exists with required columns
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  code text,
  created_at timestamptz not null default now(),
  device text,
  user_id uuid
);

-- Add missing columns if the table already existed
alter table public.scans add column if not exists id uuid default gen_random_uuid();
alter table public.scans alter column id set default gen_random_uuid();
alter table public.scans add column if not exists code text;
alter table public.scans add column if not exists created_at timestamptz;
alter table public.scans add column if not exists device text;
alter table public.scans add column if not exists user_id uuid;

-- Backfill and enforce helpful defaults
update public.scans set created_at = now() where created_at is null;
alter table public.scans alter column created_at set not null;
alter table public.scans alter column created_at set default now();

-- Optional backfill from legacy column name
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'scans' and column_name = 'barcode'
  ) then
    update public.scans set code = barcode where code is null and barcode is not null;
    create index if not exists scans_barcode_idx on public.scans (barcode);
  end if;
exception when others then
  -- non-fatal
  null;
end $$;

-- Helpful indexes
create index if not exists scans_user_id_created_at_idx on public.scans (user_id, created_at desc);
create index if not exists scans_created_at_idx on public.scans (created_at desc);
create index if not exists scans_code_idx on public.scans (code);

-- Row Level Security and policies for scans
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

-- Auto-assign user_id on insert if missing
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

-- 2) Packing slips table for expected items
create table if not exists public.packing_slips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  po_number text not null,
  item_number text not null,
  description text,
  qty_expected integer not null default 1
);

-- Helpful indexes for packing_slips
create index if not exists packing_slips_po_idx on public.packing_slips (po_number);
create index if not exists packing_slips_user_po_idx on public.packing_slips (user_id, po_number);
create index if not exists packing_slips_item_idx on public.packing_slips (item_number);

-- RLS and policies for packing_slips
alter table public.packing_slips enable row level security;

drop policy if exists "ps_select_own" on public.packing_slips;
create policy "ps_select_own" on public.packing_slips
for select using (auth.uid() = user_id);

drop policy if exists "ps_insert_own" on public.packing_slips;
create policy "ps_insert_own" on public.packing_slips
for insert with check (auth.uid() = user_id);

drop policy if exists "ps_delete_own" on public.packing_slips;
create policy "ps_delete_own" on public.packing_slips
for delete using (auth.uid() = user_id);

-- Auto-assign user_id for packing_slips
create or replace function public.ps_set_user_id()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_ps_set_user_id on public.packing_slips;
create trigger trg_ps_set_user_id before insert on public.packing_slips
for each row execute function public.ps_set_user_id();

-- 3) Reconciliation views: expected vs scanned
create or replace view public.v_packing_reconciliation as
select
  ps.user_id,
  ps.po_number,
  ps.item_number,
  coalesce(ps.description, '') as description,
  sum(ps.qty_expected)::int as qty_expected,
  coalesce(s.qty_scanned, 0)::int as qty_scanned,
  (sum(ps.qty_expected) - coalesce(s.qty_scanned, 0))::int as qty_remaining
from public.packing_slips ps
left join (
  select user_id, code as item_number, count(*)::int as qty_scanned
  from public.scans
  group by user_id, code
) s
  on s.user_id = ps.user_id and s.item_number = ps.item_number
group by ps.user_id, ps.po_number, ps.item_number, ps.description, s.qty_scanned;

create or replace view public.v_my_packing_reconciliation as
select * from public.v_packing_reconciliation
where user_id = auth.uid();

