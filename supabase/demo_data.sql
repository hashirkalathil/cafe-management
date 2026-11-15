-- Demo history for the presentation (docs/SAMPLE_DATA.md): about 25 paid bills over the last 14 days,
-- expenses for the last 6 weeks, T2 busy in the kitchen and T5 waiting for its bill.
-- Run AFTER supabase/sample_data.sql. Run it once; if the cafe already has bills it does nothing.
-- Run in Supabase: SQL Editor > New query > paste > Run.
-- Put the email of the cafe's admin on the line marked  <-- CHANGE THIS.

do $$
declare
  v_admin_email text := 'admin@cafe.test';  -- <-- CHANGE THIS to your admin's email
  v_cafe uuid;
  v_rate numeric;
  v_captain uuid;
  v_biller uuid;
  v_tables uuid[];
  v_combos jsonb := '[
    [["Butter Chicken",2],["Garlic Naan",4],["Cold Coffee",2]],
    [["Butter Chicken",1],["Paneer Butter Masala",1],["Dal Tadka",1],["Garlic Naan",3],["Masala Chai",2]],
    [["Butter Chicken",1],["Margherita Pizza",2],["Cold Coffee",2],["Brownie with Ice Cream",2]],
    [["Butter Chicken",1],["Chicken Biryani",2],["Butter Roti",4],["Fresh Lime Soda",2]],
    [["Veg Burger",2],["French Fries",1],["Cold Coffee",2]],
    [["Butter Chicken",1],["Garlic Naan",2],["Cold Coffee",1]],
    [["Alfredo Pasta",2],["Garlic Bread",1],["Mojito",2],["Gulab Jamun",2]],
    [["Paneer Tikka",2],["Butter Chicken",2],["Garlic Naan",4],["Masala Chai",4],["Cold Coffee",2]],
    [["Dal Tadka",1],["Garlic Naan",2],["Masala Chai",1]]
  ]'::jsonb;
  v_methods text[] := array['upi', 'cash', 'card', 'upi', 'cash'];
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_n int;
  seq int := 0;
  d int;
  j int;
  v_per_day int;
  v_at timestamptz;
  v_order uuid;
  v_bill uuid;
  v_sub numeric(10,2);
  v_tax numeric(10,2);
  v_disc numeric(10,2);
  v_total numeric(10,2);
  v_line jsonb;
  mi record;
  v_cat uuid;
  v_day date;
  v_t2 uuid;
  v_t5 uuid;
begin
  select p.cafe_id into v_cafe
    from public.profiles p join auth.users u on u.id = p.id
   where lower(u.email) = lower(v_admin_email);
  if v_cafe is null then
    raise exception 'No cafe found for %. Check the email at the top of this file.', v_admin_email;
  end if;
  if exists (select 1 from public.bills where cafe_id = v_cafe) then
    raise notice 'This cafe already has bills, so no demo data was added.';
    return;
  end if;

  select array_agg(id order by created_at, name) into v_tables
    from public.dining_tables where cafe_id = v_cafe and is_active;
  v_n := coalesce(array_length(v_tables, 1), 0);
  if v_n < 6 or not exists (select 1 from public.menu_items where cafe_id = v_cafe and name = 'Butter Chicken') then
    raise exception 'Run supabase/sample_data.sql first.';
  end if;

  select coalesce(tax_percent, 5) into v_rate from public.settings where cafe_id = v_cafe;
  v_rate := coalesce(v_rate, 5);
  select id into v_captain from public.profiles where cafe_id = v_cafe and role = 'captain' and is_active limit 1;
  select coalesce(
           (select id from public.profiles where cafe_id = v_cafe and role = 'billing' and is_active limit 1),
           (select id from public.profiles where cafe_id = v_cafe and role = 'admin' and is_active limit 1)
         ) into v_biller;

  -- The automatic checks are for live use; this history is written directly.
  -- (Everything here is one step, so they come back on even if something fails.)
  alter table public.orders      disable trigger user;
  alter table public.order_items disable trigger user;
  alter table public.bills       disable trigger user;
  alter table public.payments    disable trigger user;
  alter table public.dining_tables disable trigger user;

  -- ===== Paid bills: 1 or 2 a day for 14 days (about 25) =====
  for d in 1..14 loop
    v_per_day := case when d % 3 = 0 then 1 else 2 end;
    for j in 1..v_per_day loop
      seq := seq + 1;
      v_at := ((date_trunc('day', now() at time zone 'Asia/Kolkata') - make_interval(days => d)
                + interval '13 hours' + make_interval(hours => (j - 1) * 5 + (seq % 3))) at time zone 'Asia/Kolkata');

      insert into public.orders (cafe_id, table_id, captain_id, status, created_at, updated_at)
      values (v_cafe, v_tables[(seq % v_n) + 1], v_captain, 'paid', v_at - interval '55 minutes', v_at)
      returning id into v_order;

      v_sub := 0;
      for v_line in select value from jsonb_array_elements(v_combos -> (seq % jsonb_array_length(v_combos))) loop
        select id, name, price into mi from public.menu_items where cafe_id = v_cafe and name = v_line ->> 0;
        insert into public.order_items (cafe_id, order_id, menu_item_id, item_name, price, quantity, status, created_at)
        values (v_cafe, v_order, mi.id, mi.name, mi.price, (v_line ->> 1)::int, 'served', v_at - interval '50 minutes');
        v_sub := v_sub + mi.price * (v_line ->> 1)::int;
      end loop;

      v_tax := round(v_sub * v_rate / 100, 2);
      v_disc := case when seq % 6 = 0 then 50 when seq % 5 = 0 then 20 else 0 end;
      v_total := v_sub + v_tax - v_disc;

      insert into public.bills (cafe_id, order_id, subtotal, tax_percent, tax_amount, discount, total, status, created_by, created_at)
      values (v_cafe, v_order, v_sub, v_rate, v_tax, v_disc, v_total, 'paid', v_biller, v_at - interval '10 minutes')
      returning id into v_bill;

      insert into public.payments (cafe_id, bill_id, method, amount, received_by, paid_at, created_at)
      values (v_cafe, v_bill, v_methods[(seq % 5) + 1], v_total, v_biller, v_at, v_at);
    end loop;
  end loop;

  -- ===== Live state: T2 busy in the kitchen, T5 waiting for its bill =====
  select id into v_t2 from public.dining_tables where cafe_id = v_cafe and name = 'T2' and status = 'free'
     and not exists (select 1 from public.orders o where o.table_id = dining_tables.id and o.status not in ('paid', 'cancelled'));
  if v_t2 is not null then
    insert into public.orders (cafe_id, table_id, captain_id, status, created_at, updated_at)
    values (v_cafe, v_t2, v_captain, 'preparing', now() - interval '12 minutes', now() - interval '6 minutes')
    returning id into v_order;
    for v_line in select jsonb_build_array(n, q, note) from (values
        ('Paneer Tikka', 2, 'Less spicy'), ('Butter Chicken', 1, null), ('Garlic Naan', 3, null)) as t(n, q, note) loop
      select id, name, price into mi from public.menu_items where cafe_id = v_cafe and name = v_line ->> 0;
      insert into public.order_items (cafe_id, order_id, menu_item_id, item_name, price, quantity, note, status, created_at)
      values (v_cafe, v_order, mi.id, mi.name, mi.price, (v_line ->> 1)::int, nullif(v_line ->> 2, ''), 'preparing', now() - interval '12 minutes');
    end loop;
    update public.dining_tables set status = 'busy' where id = v_t2;
  end if;

  select id into v_t5 from public.dining_tables where cafe_id = v_cafe and name = 'T5' and status = 'free'
     and not exists (select 1 from public.orders o where o.table_id = dining_tables.id and o.status not in ('paid', 'cancelled'));
  if v_t5 is not null then
    insert into public.orders (cafe_id, table_id, captain_id, status, created_at, updated_at)
    values (v_cafe, v_t5, v_captain, 'bill_asked', now() - interval '70 minutes', now() - interval '3 minutes')
    returning id into v_order;
    for v_line in select jsonb_build_array(n, q) from (values
        ('Dal Tadka', 2), ('Garlic Naan', 4), ('Masala Chai', 2)) as t(n, q) loop
      select id, name, price into mi from public.menu_items where cafe_id = v_cafe and name = v_line ->> 0;
      insert into public.order_items (cafe_id, order_id, menu_item_id, item_name, price, quantity, status, created_at)
      values (v_cafe, v_order, mi.id, mi.name, mi.price, (v_line ->> 1)::int, 'served', now() - interval '70 minutes');
    end loop;
    update public.dining_tables set status = 'bill_asked' where id = v_t5;
  end if;

  alter table public.orders        enable trigger user;
  alter table public.order_items   enable trigger user;
  alter table public.bills         enable trigger user;
  alter table public.payments      enable trigger user;
  alter table public.dining_tables enable trigger user;

  -- ===== Expenses (only dates up to today) =====
  -- Rent on the 1st of last month and this month
  select id into v_cat from public.expense_categories where cafe_id = v_cafe and name = 'Rent';
  insert into public.expenses (cafe_id, expense_date, category_id, title, amount, created_by)
  select v_cafe, m, v_cat, 'Shop rent', 25000, v_biller
    from unnest(array[(date_trunc('month', v_today) - interval '1 month')::date, date_trunc('month', v_today)::date]) as m
   where m <= v_today;

  -- Vegetables every 3 days
  select id into v_cat from public.expense_categories where cafe_id = v_cafe and name = 'Groceries';
  insert into public.expenses (cafe_id, expense_date, category_id, title, amount, supplier, quantity, unit, created_by)
  select v_cafe, v_today - g, v_cat, 'Vegetables', 800 + (g * 37) % 700, 'Raju Mandi', 15 + (g * 7) % 20, 'kg', v_biller
    from generate_series(0, 42, 3) as g;

  -- Chicken and paneer every week
  insert into public.expenses (cafe_id, expense_date, category_id, title, amount, supplier, created_by)
  select v_cafe, v_today - g, v_cat, 'Chicken and paneer', 3000 + (g * 53) % 1000, 'City Meats', v_biller
    from generate_series(2, 44, 7) as g;

  -- Gas cylinders on the 5th and 20th
  select id into v_cat from public.expense_categories where cafe_id = v_cafe and name = 'Gas';
  insert into public.expenses (cafe_id, expense_date, category_id, title, amount, created_by)
  select v_cafe, x, v_cat, 'Gas cylinder', 1900, v_biller
    from (
      select (date_trunc('month', v_today) + make_interval(months => m, days => dd - 1))::date as x
        from generate_series(-1, 0) as m, (values (5), (20)) as t(dd)
    ) s
   where x <= v_today;

  -- Staff salary on the last day of last month
  select id into v_cat from public.expense_categories where cafe_id = v_cafe and name = 'Salary';
  insert into public.expenses (cafe_id, expense_date, category_id, title, amount, created_by)
  values (v_cafe, (date_trunc('month', v_today) - interval '1 day')::date, v_cat, 'Staff salary', 40000, v_biller);

  -- One repair
  select id into v_cat from public.expense_categories where cafe_id = v_cafe and name = 'Repairs';
  insert into public.expenses (cafe_id, expense_date, category_id, title, amount, supplier, created_by)
  values (v_cafe, v_today - 8, v_cat, 'Fridge repair', 1800, 'CoolFix Services', v_biller);
end $$;
