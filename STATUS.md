# Project Status — Inventory Tracker

Snapshot of where things stand and what’s next.

## Current State
- Web app runs cleanly (Expo Router + React 19). `.env` is configured with your Supabase URL and anon key.
- Auth on web is fixed:
  - Magic-link flow handled via `/auth/callback` and `detectSessionInUrl` on web.
  - Email + password works (subject to Supabase email confirmation settings).
  - Supabase Auth config should include Site URL and `/auth/callback` as a redirect URL.
- Scanning:
  - Home tab: manual entry for web; saves to `public.scans` with your session.
  - Android/iOS camera scanning set up via `expo-camera` (test on device when ready).
- CSV Uploads (Uploads tab):
  - Accepts CSV with header `item_number` (optional: `description`, `qty_expected`).
  - Auto-parses on Upload; improved error output.
  - Inserts into `public.packing_slips` without `user_id` (matches your current schema).
- Reconcile tab: enter PO to view expected vs. scanned counts (requires packing slips + scans).

## Database Notes
- Your `packing_slips` currently has no `user_id`. Uploads avoid sending `user_id` to match.
- Recommended (optional): run `sql/00_all_setup.sql` in Supabase to:
  - Add `user_id` to `packing_slips` with trigger to auto-fill from `auth.uid()`
  - Enable RLS + policies for per-user isolation
  - Ensure `scans` and reconciliation views exist

## How To Run
- Web: `cd inventory-tracker-app && npm run web`
- Sign in:
  - OTP magic link: click email, lands on `/auth/callback`, then redirects to tabs
  - Or Email + Password (disable “Confirm email” in Supabase for instant access during dev)
- Quick verify:
  - Uploads: PO `PO12345`, CSV: `item_number,description,qty_expected` then `A123,Widget,2` → Upload
  - Reconcile: enter `PO12345` → see expected row
  - Home: add manual scan `A123` → Inventory/Reconcile should reflect it

## Next Steps
- Decide on DB hardening: keep global `packing_slips` or enable per-user data with `00_all_setup.sql`.
- Test Android/iOS camera scanning in Expo Go (we can flip to device testing when you’re ready).
- CSV UX polish (sample download, row-level validation), and Reconcile enhancements (refresh/empty states).

