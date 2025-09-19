-- Reconciliation view: expected vs scanned per item for a given PO
-- Note: This assumes scans.code contains the same identifier used in packing_slips.item_number

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

-- Convenience RLS via security barrier: expose only the current user's rows
create or replace view public.v_my_packing_reconciliation as
select * from public.v_packing_reconciliation
where user_id = auth.uid();

