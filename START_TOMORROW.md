# Start Tomorrow — Inventory Tracker (Current State)

Use this to pick up exactly where we left off.

## What’s Working Now
- Web app builds and runs; `.env` points at your Supabase project.
- Auth on web fixed: magic link redirects to `/auth/callback` and signs in; email+password works.
- Manual scan on Home tab saves rows to `public.scans`.
- CSV Uploads: paste CSV or choose file; auto‑parses on Upload; inserts into `public.packing_slips` without `user_id` (matches your current schema).

## Decisions For Tomorrow
- Do you want per‑user isolation for `packing_slips`? If YES, run the SQL below (adds `user_id`, trigger, and RLS). The app will still work because the trigger auto‑sets `user_id`.

## Morning Checklist (10–15 min)
- [ ] Supabase Auth → URL Configuration
  - Set Site URL to your dev origin (e.g., `http://localhost:8081`).
  - Add Redirect URL: `http://localhost:8081/auth/callback`.
- [ ] Start web: `cd inventory-tracker-app && npm run web`.
- [ ] Sign in (OTP magic link or password). Users tab should show “Signed in as: …”.
- [ ] Upload a tiny CSV on Uploads tab:
  ```
  item_number,description,qty_expected
  A123,Widget,2
  ```
  Expect: “Upload complete” and “Uploaded 1 rows …”.
- [ ] Reconcile tab → enter the PO you just used → verify expected rows appear.
- [ ] Home tab → add a manual scan that matches an item_number → Inventory/Reconcile should reflect it.

## Standardize the Database (Optional but Recommended)
- In Supabase → SQL, run (idempotent):
  - `inventory-tracker-app/sql/00_all_setup.sql` (creates/repairs `scans`, creates `packing_slips` with `user_id` + policies, and reconciliation views);
  - Or just `sql/03_packing_slips.sql` if you only want `packing_slips` + policies.
- Outcome:
  - `packing_slips.user_id` exists, RLS enabled, and trigger auto‑assigns `auth.uid()`.
  - Reconciliation views present (`v_packing_reconciliation`, `v_my_packing_reconciliation`).

## Troubleshooting Quick Hits
- CSV upload error mentions “column not found” (e.g., `user_id`): run the SQL above to align schema.
- RLS/permission error: you’re likely missing policies — run the SQL setup.
- Magic link loops back to sign‑in: set Site URL and `/auth/callback` in Supabase Auth.
- Health check 401 is expected unauthenticated; REST should be 200.
- React Native Web warning about `pointerEvents` is benign.

## Shortlist Next Features (after verification)
- Android/iOS camera scanning test (Expo Go): ensure barcode scan saves to `scans`.
- CSV UX: add sample download and clearer error rows preview.
- Reconcile polish: add refresh + empty state guidance.
- Admin: optional CSV export of `v_my_packing_reconciliation`.

That’s it — start with the checklist, then decide on DB hardening (RLS) and mobile scanning.
