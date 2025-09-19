-- Packing slips (expected items) schema
-- Stores rows per item on a packing slip (identified by po_number)

create extension if not exists pgcrypto;

create table if not exists public.packing_slips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid, -- owner of this packing slip record

  po_number text not null,
  item_number text not null,
  description text,
  qty_expected integer not null default 1
);

-- Helpful indexes
create index if not exists packing_slips_po_idx on public.packing_slips (po_number);
create index if not exists packing_slips_user_po_idx on public.packing_slips (user_id, po_number);
create index if not exists packing_slips_item_idx on public.packing_slips (item_number);

-- Row Level Security
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

-- Auto-assign user_id from auth context when missing
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

