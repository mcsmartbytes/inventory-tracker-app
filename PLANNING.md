Mobile Inventory Tracker — Plan and Status

Goal
- Mobile-first inventory app in Expo that scans barcodes and saves scans to Supabase. Add an in-app Inventory console to view recent scans. Keep scope small and expandable.

Scope (Phase 1)
- Scanning: Use `expo-camera` with `CameraView` to scan common barcode types.
- Storage: Save each scan to Supabase table `scans` with fields: `id uuid`, `code text`, `created_at timestamptz default now()`, `device text null`, `user_id uuid null`.
- Inventory Console: New tab that lists latest scans, with pull-to-refresh.
- Config: Use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for client init.

Auth & Security (Phase 1.5)
- Add email OTP login flow (enter email, receive code, enter code).
- Gate app behind auth; unauthenticated users see Auth screens.
- Include `user_id` on scans; prepare RLS policies.

Out of Scope (later phases)
- Auth (email/OTP), role-based access
- Editing items, linking scans to SKUs/POs
- PDF parsing flow and reconciliation
- Offline queueing, batch actions
- Stripe/payments, multi-tenant orgs

Supabase SQL (run once)
```sql
-- Enable pgcrypto if not already
create extension if not exists pgcrypto;

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  created_at timestamptz not null default now(),
  device text,
  user_id uuid
);

-- Enable RLS and policies (enable after auth is working)
alter table public.scans enable row level security;

-- Allow users to select only their own scans
create policy if not exists "select_own_scans" on public.scans
for select using (auth.uid() = user_id);

-- Allow insert where user_id matches the JWT uid
create policy if not exists "insert_with_own_user_id" on public.scans
for insert with check (auth.uid() = user_id);

-- Optional: allow delete of own scans
create policy if not exists "delete_own_scans" on public.scans
for delete using (auth.uid() = user_id);

-- Optional convenience trigger to set user_id automatically
-- Requires calling from an authenticated client; client can still send user_id
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
```

How to run (Android + Expo Go)
- Preferred: from Windows host to avoid WSL networking
  - `cd \\wsl$\\Ubuntu2404\\home\\mcsmart\\inventory-tracker-app`
  - `npm install`
  - Create `.env` with your Supabase values (see `.env.example`).
  - `npx expo start --tunnel` and scan QR with Expo Go.

Milestones
- [x] Camera scanning screen stable on Android
- [x] Add camera permission + plugin in `app.json`
- [x] Remove `expo-barcode-scanner` to avoid duplication
- [x] Wire scanner to insert scanned code to Supabase
- [x] Inventory tab lists recent scans
 - [x] Add basic toast notifications
- [x] Add delete/clear test scans action
- [ ] Add auth and RLS policies
  - [x] Auth screens (email OTP)
  - [x] Gate tabs behind auth
  - [x] Include user_id in inserts/deletes
  - [ ] Apply SQL for RLS in Supabase

Notes
- If inserts fail, verify `.env` keys and create `scans` table using the SQL above.
- For dev builds later, camera performance improves and permissions come from `app.json` plugin configuration.
