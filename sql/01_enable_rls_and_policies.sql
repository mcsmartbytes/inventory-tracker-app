-- Enable Row Level Security on scans and recreate policies

alter table public.scans enable row level security;

-- Select: user can only see their own rows
drop policy if exists "select_own_scans" on public.scans;
create policy "select_own_scans" on public.scans
for select using (auth.uid() = user_id);

-- Insert: user_id must match JWT uid
drop policy if exists "insert_with_own_user_id" on public.scans;
create policy "insert_with_own_user_id" on public.scans
for insert with check (auth.uid() = user_id);

-- Delete: only own rows
drop policy if exists "delete_own_scans" on public.scans;
create policy "delete_own_scans" on public.scans
for delete using (auth.uid() = user_id);
