alter table public.scans add column if not exists code text;

-- Optional: backfill code from barcode if present
update public.scans
set code = barcode
where code is null and barcode is not null;

-- Helpful index for lookups by code
create index if not exists scans_code_idx on public.scans (code);
