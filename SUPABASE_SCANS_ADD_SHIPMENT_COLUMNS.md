alter table public.scans add column if not exists shp_id bigint;
alter table public.scans add column if not exists ven_company_name text;
alter table public.scans add column if not exists order_number text;
alter table public.scans add column if not exists line_number text;
alter table public.scans add column if not exists quantity integer;
alter table public.scans add column if not exists barcode text;
alter table public.scans add column if not exists pd_code text;
alter table public.scans add column if not exists order_line_description text;

create index if not exists scans_shp_order_line_idx on public.scans (shp_id, order_number, line_number);
create index if not exists scans_barcode_idx on public.scans (barcode);
