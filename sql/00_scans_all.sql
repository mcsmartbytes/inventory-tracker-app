create extension if not exists pgcrypto;

-- Base table (create if missing)
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  created_at timestamptz not null default now(),
  device text,
  user_id uuid
);

-- Ensure base columns exist with constraints/defaults (idempotent)
alter table public.scans add column if not exists id uuid;
alter table public.scans add column if not exists code text;
alter table public.scans add column if not exists created_at timestamptz;
alter table public.scans add column if not exists device text;
alter table public.scans add column if not exists user_id uuid;

alter table public.scans alter column id set default gen_random_uuid();
alter table public.scans alter column created_at set default now();
update public.scans set created_at = now() where created_at is null;
alter table public.scans alter column created_at set not null;
-- code should be present; do not set NOT NULL until backfill below

-- Shipment CSV-derived columns
alter table public.scans add column if not exists shp_id bigint;
alter table public.scans add column if not exists ven_company_name text;
alter table public.scans add column if not exists order_number text;
alter table public.scans add column if not exists line_number text;
alter table public.scans add column if not exists quantity integer;
alter table public.scans add column if not exists barcode text;
alter table public.scans add column if not exists pd_code text;
alter table public.scans add column if not exists order_line_description text;

-- Backfill: prefer barcode into code if code is null
update public.scans set code = barcode where code is null and barcode is not null;

-- Enforce constraints after backfill
alter table public.scans alter column code set not null;

-- Helpful indexes
create index if not exists scans_user_id_created_at_idx on public.scans (user_id, created_at desc);
create index if not exists scans_created_at_idx on public.scans (created_at desc);
create index if not exists scans_code_idx on public.scans (code);
create index if not exists scans_barcode_idx on public.scans (barcode);
create index if not exists scans_shp_order_line_idx on public.scans (shp_id, order_number, line_number);

-- RLS + policies
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

-- Trigger to auto-set user_id if missing
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

