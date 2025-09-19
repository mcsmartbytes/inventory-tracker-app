Mobile Inventory Tracker — Handoff Summary

Current State
- Scans insert into `public.scans` with `code`, `device`, `user_id`, `created_at`.
- Inventory tab lists recent scans; delete requires sign‑in and filters by `user_id`.
- RLS enabled; policies for select/insert/delete by `user_id` are present.
- Extra shipment columns exist on `public.scans` (from CSV example) but are not required for scanning.

What Changed Today
- Added SQL scripts for schema, RLS, and verification:
  - `sql/00_scans_all.sql` (all‑in‑one)
  - `sql/01_enable_rls_and_policies.sql` (enable RLS + policies)
  - `sql/02_verify_rls.sql` (verify RLS + policies)
  - Reference scripts: `SUPABASE_SCANS_SETUP.md`, `SUPABASE_SCANS_ALTER.md`, `SUPABASE_SCANS_ADD_SHIPMENT_COLUMNS.md`, `SUPABASE_SCANS_FIX_CODE_COLUMN.md`
- App safety change: `app/(tabs)/inventory.tsx` now requires sign‑in before deleting scans.

What You Need
- Create `.env` in project root with:
  - `EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY`
- Supabase: run `sql/02_verify_rls.sql` to confirm RLS is enabled and policies exist.

How To Run
1) Windows host terminal: `cd \\wsl$\\Ubuntu2404\\home\\mcsmart\\inventory-tracker-app`
2) `npm install`
3) `npx expo start --tunnel`
4) Sign in via OTP (Auth screens wired). Then scan on the Scanner tab.

Validation Checklist
- Scan → toast “Scan saved”.
- Inventory shows new row.
- Supabase Table Editor → `public.scans` has row with your `user_id`.
- Signed out → “Clear scans” shows “Sign in required…” and does nothing.

Open Items / Options
- Gate scanning behind auth with a clearer message if not signed in (optional UX polish).
- Anonymous scanning (only if needed): add an anon insert policy; not recommended by default.
- Future: If you want scans auto‑enriched from a master list, add `shipment_items` table + trigger to copy fields by barcode on insert.

Tomorrow’s Suggested Priorities
- Confirm `.env` and end‑to‑end test on device via Expo Go.
- Decide whether to gate scanning behind auth (UX consistency).
- If needed, adjust column types for shipment fields or remove unused columns to keep schema lean.

Key Files
- App code: `app/(tabs)/index.tsx` (scan + insert), `app/(tabs)/inventory.tsx` (list + delete), `app/_layout.tsx` (auth gating), `app/auth/*` (OTP flow).
- Supabase client: `lib/supabase.ts` (reads `EXPO_PUBLIC_*` from `.env`).
- SQL scripts: see `sql/` and root `SUPABASE_*.md` files.

