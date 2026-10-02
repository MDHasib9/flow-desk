create or replace function public.add_invoice_item(
  p_invoice_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric
) returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subtotal numeric(14, 2);
  v_quantity numeric(12, 3);
  v_unit_price numeric(14, 2);
  v_line_total numeric(14, 2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_description is null or char_length(trim(p_description)) not between 1 and 500
     or p_quantity is null or p_quantity <= 0 or p_quantity > 1000000
     or p_unit_price is null or p_unit_price < 0 or p_unit_price > 1000000 then
    raise exception 'Invalid invoice item';
  end if;

  v_quantity := round(p_quantity, 3);
  v_unit_price := round(p_unit_price, 2);
  if v_quantity <= 0 then
    raise exception 'Quantity is too small';
  end if;

  v_line_total := round(v_quantity * v_unit_price, 2);
  if v_line_total > 999999999999.99 then
    raise exception 'Invoice item amount exceeds the supported limit';
  end if;

  select subtotal
    into v_subtotal
    from public.invoices
   where id = p_invoice_id
   for update;

  if not found then
    raise exception 'Invoice not found or access denied';
  end if;

  insert into public.invoice_items (invoice_id, description, quantity, unit_price)
  values (p_invoice_id, trim(p_description), v_quantity, v_unit_price);

  update public.invoices
     set subtotal = v_subtotal + v_line_total
   where id = p_invoice_id;

  return v_line_total;
end;
$$;

revoke all on function public.add_invoice_item(uuid, text, numeric, numeric) from public;
revoke all on function public.add_invoice_item(uuid, text, numeric, numeric) from anon;
grant execute on function public.add_invoice_item(uuid, text, numeric, numeric) to authenticated;
