-- Sample menu and tables for the demo (docs/SAMPLE_DATA.md). Safe to run again: it never adds a name twice.
-- Run in Supabase: SQL Editor > New query > paste > Run.
-- Put the email of the cafe's admin on the line marked  <-- CHANGE THIS.

do $$
declare
  v_admin_email text := 'admin@cafe.test';  -- <-- CHANGE THIS to your admin's email
  v_cafe uuid;
begin
  select p.cafe_id into v_cafe
    from public.profiles p join auth.users u on u.id = p.id
   where lower(u.email) = lower(v_admin_email);
  if v_cafe is null then
    raise exception 'No cafe found for %. Check the email at the top of this file.', v_admin_email;
  end if;

insert into public.categories (cafe_id, name, sort_order)
select v_cafe, v.name, v.ord
  from (values ('Starters', 1), ('Main Course', 2), ('Pizza and Pasta', 3),
               ('Burgers and Wraps', 4), ('Drinks', 5), ('Desserts', 6)) as v(name, ord)
 where not exists (select 1 from public.categories c where c.cafe_id = v_cafe and lower(c.name) = lower(v.name));

insert into public.menu_items (cafe_id, category_id, name, price, is_veg, is_available)
select v_cafe, c.id, v.item, v.price, v.veg, v.avail
  from (values
    ('Starters', 'Paneer Tikka', 220, true, true),
    ('Starters', 'Veg Spring Roll', 160, true, true),
    ('Starters', 'Chicken 65', 240, false, false),
    ('Starters', 'French Fries', 120, true, true),
    ('Starters', 'Garlic Bread', 140, true, true),
    ('Main Course', 'Butter Chicken', 320, false, true),
    ('Main Course', 'Paneer Butter Masala', 280, true, true),
    ('Main Course', 'Dal Tadka', 180, true, true),
    ('Main Course', 'Veg Biryani', 220, true, true),
    ('Main Course', 'Chicken Biryani', 280, false, true),
    ('Main Course', 'Garlic Naan', 50, true, true),
    ('Main Course', 'Butter Roti', 30, true, true),
    ('Pizza and Pasta', 'Margherita Pizza', 260, true, true),
    ('Pizza and Pasta', 'Farmhouse Pizza', 320, true, true),
    ('Pizza and Pasta', 'Alfredo Pasta', 250, true, true),
    ('Pizza and Pasta', 'Arrabbiata Pasta', 230, true, true),
    ('Burgers and Wraps', 'Veg Burger', 140, true, true),
    ('Burgers and Wraps', 'Chicken Burger', 180, false, true),
    ('Burgers and Wraps', 'Paneer Wrap', 160, true, true),
    ('Drinks', 'Masala Chai', 40, true, true),
    ('Drinks', 'Cold Coffee', 120, true, true),
    ('Drinks', 'Fresh Lime Soda', 80, true, true),
    ('Drinks', 'Mango Shake', 140, true, false),
    ('Drinks', 'Mojito', 130, true, true),
    ('Drinks', 'Water Bottle', 20, true, true),
    ('Desserts', 'Brownie with Ice Cream', 160, true, true),
    ('Desserts', 'Gulab Jamun', 90, true, true),
    ('Desserts', 'Chocolate Shake', 150, true, true)
  ) as v(cat, item, price, veg, avail)
  join public.categories c on c.cafe_id = v_cafe and lower(c.name) = lower(v.cat)
 where not exists (select 1 from public.menu_items m where m.category_id = c.id and lower(m.name) = lower(v.item));

insert into public.dining_tables (cafe_id, name, seats)
select v_cafe, v.name, v.seats
  from (values ('T1', 2), ('T2', 2), ('T3', 4), ('T4', 4), ('T5', 4), ('T6', 4), ('T7', 2), ('T8', 4),
               ('Terrace 1', 4), ('Terrace 2', 4), ('Terrace 3', 4), ('Terrace 4', 4)) as v(name, seats)
 where not exists (select 1 from public.dining_tables t where t.cafe_id = v_cafe and lower(t.name) = lower(v.name));
end $$;
