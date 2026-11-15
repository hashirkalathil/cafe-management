-- Cafe database. Safe to run again: it only adds or refreshes things.
-- Run in Supabase: SQL Editor > New query > paste > Run.
--
-- MANY CAFES
--  Anyone can sign up on the app's Sign up page. That makes a new cafe with them as its admin.
--  Every cafe only sees its own data.
--
-- BEFORE YOU START
--  1. Supabase > Authentication > Sign In / Providers: turn ON "Allow new users to sign up".
--  2. Same page: turn OFF "Confirm email", so a new person gets in right after signing up.
--  3. Already have data from the one-cafe version? Just run this file. Your old data
--     becomes the first cafe. Its admin logs in as before.
--
-- Errors raised here are short codes (for example 'sold_out'). The app turns them into plain words.

-- ===== Cafes =====

create table if not exists public.cafes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);

-- ===== Helpers =====

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'captain' check (role in ('admin', 'captain', 'kitchen', 'billing')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.profiles add column if not exists cafe_id uuid references public.cafes (id) on delete cascade;

-- Current person's cafe, only if their account is on. Used by every policy.
create or replace function public.app_cafe_id() returns uuid
language sql stable security definer set search_path = public as $$
  select cafe_id from public.profiles where id = auth.uid() and is_active
$$;

-- Current person's role, only if their account is on. Used by every policy.
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

-- Lets the app tell "turned off" apart from "no account", even for turned-off people.
create or replace function public.my_profile() returns setof public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid()
$$;

-- Switched on only inside our own functions so they may do what a person's role would not allow.
create or replace function public.cafe_bypass() returns boolean
language sql stable as $$
  select coalesce(current_setting('cafe.bypass', true), '') = '1'
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ===== Tables =====

create table if not exists public.settings (
  id               uuid primary key default gen_random_uuid(),
  restaurant_name  text not null default 'Cafe',
  address          text not null default '',
  phone            text not null default '',
  tax_percent      numeric(5,2) not null default 5 check (tax_percent between 0 and 100),
  created_at       timestamptz not null default now()
);
-- Only ever one row.
create unique index if not exists settings_single_row on public.settings ((true));

create table if not exists public.dining_tables (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  seats       integer not null default 4 check (seats between 1 and 50),
  status      text not null default 'free' check (status in ('free', 'busy', 'bill_asked')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists dining_tables_name_unique on public.dining_tables (lower(trim(name)));

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists categories_name_unique on public.categories (lower(trim(name)));

create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories (id),
  name          text not null check (length(trim(name)) > 0),
  price         numeric(10,2) not null check (price >= 0),
  is_veg        boolean not null default true,
  is_available  boolean not null default true,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  order_no    integer generated always as identity,
  table_id    uuid not null references public.dining_tables (id),
  captain_id  uuid references public.profiles (id) default auth.uid(),
  status      text not null default 'open'
              check (status in ('open', 'sent', 'preparing', 'ready', 'served', 'bill_asked', 'paid', 'cancelled')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Only one live order per table.
create unique index if not exists orders_one_live_per_table
  on public.orders (table_id) where status not in ('paid', 'cancelled');
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_table_idx on public.orders (table_id);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id),
  menu_item_id  uuid not null references public.menu_items (id),
  item_name     text not null,
  price         numeric(10,2) not null check (price >= 0),
  quantity      integer not null default 1 check (quantity between 1 and 99),
  note          text,
  status        text not null default 'new' check (status in ('new', 'preparing', 'ready', 'served', 'cancelled')),
  created_at    timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.bills (
  id           uuid primary key default gen_random_uuid(),
  bill_no      integer generated always as identity,
  order_id     uuid not null unique references public.orders (id),
  subtotal     numeric(10,2) not null check (subtotal >= 0),
  tax_percent  numeric(5,2) not null,
  tax_amount   numeric(10,2) not null,
  discount     numeric(10,2) not null default 0 check (discount >= 0),
  total        numeric(10,2) not null check (total >= 0),
  status       text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  created_by   uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  check (discount <= subtotal)
);
create index if not exists bills_created_idx on public.bills (created_at);

-- One payment per bill: a second tap can never charge twice.
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  bill_id      uuid not null unique references public.bills (id),
  method       text not null check (method in ('cash', 'card', 'upi')),
  amount       numeric(10,2) not null check (amount >= 0),
  received_by  uuid references public.profiles (id) default auth.uid(),
  paid_at      timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists payments_paid_idx on public.payments (paid_at);

create table if not exists public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  expense_date  date not null default ((now() at time zone 'Asia/Kolkata')::date),
  category_id   uuid not null references public.expense_categories (id),
  title         text not null check (length(trim(title)) > 0),
  amount        numeric(10,2) not null check (amount > 0),
  supplier      text,
  quantity      numeric(10,2) check (quantity > 0),
  unit          text,
  note          text,
  created_by    uuid references public.profiles (id) default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses (expense_date);

-- ===== Cafe ownership =====
-- Every row belongs to one cafe. New rows get the cafe of the person who adds them.

-- Old one-cafe data (if any) becomes the first cafe.
do $$
declare
  t text;
  v uuid;
  has_old boolean := false;
begin
  foreach t in array array['profiles', 'settings', 'dining_tables', 'categories', 'menu_items', 'orders',
                           'order_items', 'bills', 'payments', 'expense_categories', 'expenses'] loop
    execute format('alter table public.%I add column if not exists cafe_id uuid references public.cafes (id) on delete cascade', t);
  end loop;

  foreach t in array array['profiles', 'settings', 'dining_tables', 'categories', 'menu_items', 'orders',
                           'order_items', 'bills', 'payments', 'expense_categories', 'expenses'] loop
    execute format('select exists (select 1 from public.%I where cafe_id is null)', t) into has_old;
    exit when has_old;
  end loop;

  if has_old then
    select id into v from public.cafes order by created_at limit 1;
    if v is null then
      insert into public.cafes (name)
      values (coalesce((select nullif(trim(restaurant_name), '') from public.settings limit 1), 'My cafe'))
      returning id into v;
    end if;
    perform set_config('cafe.bypass', '1', true);
    foreach t in array array['profiles', 'settings', 'dining_tables', 'categories', 'menu_items', 'orders',
                             'order_items', 'bills', 'payments', 'expense_categories', 'expenses'] loop
      execute format('update public.%I set cafe_id = $1 where cafe_id is null', t) using v;
    end loop;
    perform set_config('cafe.bypass', '', true);
  end if;

  foreach t in array array['profiles', 'settings', 'dining_tables', 'categories', 'menu_items', 'orders',
                           'order_items', 'bills', 'payments', 'expense_categories', 'expenses'] loop
    execute format('alter table public.%I alter column cafe_id set not null', t);
    if t <> 'profiles' then
      execute format('alter table public.%I alter column cafe_id set default public.app_cafe_id()', t);
    end if;
    execute format('create index if not exists %I on public.%I (cafe_id)', t || '_cafe_idx', t);
  end loop;
end $$;

-- Names only have to be different inside one cafe.
drop index if exists public.settings_single_row;
create unique index if not exists settings_one_per_cafe on public.settings (cafe_id);

drop index if exists public.dining_tables_name_unique;
create unique index if not exists dining_tables_cafe_name_unique on public.dining_tables (cafe_id, lower(trim(name)));

drop index if exists public.categories_name_unique;
create unique index if not exists categories_cafe_name_unique on public.categories (cafe_id, lower(trim(name)));

alter table public.expense_categories drop constraint if exists expense_categories_name_key;
create unique index if not exists expense_categories_cafe_name_unique on public.expense_categories (cafe_id, lower(trim(name)));

-- A row may only point at rows of its own cafe (for example an item and its group).
create or replace function public.guard_same_cafe() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'menu_items' then
    if not exists (select 1 from public.categories where id = new.category_id and cafe_id = new.cafe_id) then
      raise exception 'not_allowed';
    end if;
  elsif tg_table_name = 'expenses' then
    if not exists (select 1 from public.expense_categories where id = new.category_id and cafe_id = new.cafe_id) then
      raise exception 'not_allowed';
    end if;
  elsif tg_table_name = 'orders' then
    if not exists (select 1 from public.dining_tables where id = new.table_id and cafe_id = new.cafe_id) then
      raise exception 'not_allowed';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists menu_items_same_cafe on public.menu_items;
create trigger menu_items_same_cafe before insert or update on public.menu_items
  for each row execute function public.guard_same_cafe();
drop trigger if exists expenses_same_cafe on public.expenses;
create trigger expenses_same_cafe before insert or update on public.expenses
  for each row execute function public.guard_same_cafe();
drop trigger if exists orders_same_cafe on public.orders;
create trigger orders_same_cafe before insert or update on public.orders
  for each row execute function public.guard_same_cafe();

-- ===== Automatic actions =====

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Old one-cafe versions made a turned-off profile for every new login. Not any more.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- A new login makes its own cafe and becomes its admin. Only for a login with no profile yet.
create or replace function public.create_cafe(p_cafe_name text, p_full_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cafe uuid;
  v_name text := trim(coalesce(p_cafe_name, ''));
  v_person text := trim(coalesce(p_full_name, ''));
begin
  if auth.uid() is null then raise exception 'not_allowed'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'already_has_cafe'; end if;
  if v_name = '' or length(v_name) > 80 then raise exception 'bad_cafe_name'; end if;
  if v_person = '' or length(v_person) > 80 then raise exception 'bad_name'; end if;

  insert into public.cafes (name) values (v_name) returning id into v_cafe;
  insert into public.profiles (id, cafe_id, full_name, role, is_active)
  values (auth.uid(), v_cafe, v_person, 'admin', true);
  insert into public.settings (cafe_id, restaurant_name) values (v_cafe, v_name);
  insert into public.expense_categories (cafe_id, name)
  select v_cafe, n from unnest(array['Groceries', 'Gas', 'Salary', 'Rent', 'Repairs', 'Other']) as n;
end $$;

-- Protect the admin: you cannot turn yourself off or change your own role,
-- and the last active admin can never be removed.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active) then
    if old.id = auth.uid() then
      raise exception 'self_change';
    end if;
    if not exists (select 1 from public.profiles
                    where cafe_id = old.cafe_id and role = 'admin' and is_active and id <> old.id) then
      raise exception 'last_admin';
    end if;
  end if;
  if new.id <> old.id or new.cafe_id <> old.cafe_id then
    raise exception 'not_allowed';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- A table that is in use cannot be turned off.
create or replace function public.guard_table_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.is_active and not new.is_active and old.status <> 'free' then
    raise exception 'table_busy';
  end if;
  return new;
end $$;

drop trigger if exists dining_tables_guard on public.dining_tables;
create trigger dining_tables_guard before update on public.dining_tables
  for each row execute function public.guard_table_update();

-- A new order line: copy the real name and price from the menu (the app cannot fake them),
-- refuse sold-out or turned-off items, and refuse finished orders.
create or replace function public.order_item_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  m public.menu_items;
  cat_on boolean;
begin
  select * into o from public.orders where id = new.order_id and cafe_id = public.app_cafe_id();
  if not found then raise exception 'order_not_found'; end if;
  if o.status not in ('open', 'sent', 'preparing', 'ready', 'served') then
    raise exception 'order_locked';
  end if;

  select * into m from public.menu_items where id = new.menu_item_id and cafe_id = o.cafe_id;
  if not found then raise exception 'item_unavailable'; end if;
  select is_active into cat_on from public.categories where id = m.category_id;
  if not m.is_active or not coalesce(cat_on, false) then raise exception 'item_unavailable'; end if;
  if not m.is_available then raise exception 'sold_out' using detail = m.name; end if;

  new.cafe_id := o.cafe_id;
  new.item_name := m.name;
  new.price := m.price;
  new.status := 'new';
  return new;
end $$;

drop trigger if exists order_items_before_insert on public.order_items;
create trigger order_items_before_insert before insert on public.order_items
  for each row execute function public.order_item_before_insert();

-- Who may change an order line, and how. Name and price never change.
create or replace function public.order_item_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := public.app_role();
  o_status text;
begin
  if public.cafe_bypass() then return new; end if;

  if new.order_id <> old.order_id or new.menu_item_id <> old.menu_item_id
     or new.item_name <> old.item_name or new.price <> old.price then
    raise exception 'not_allowed';
  end if;

  select status into o_status from public.orders where id = new.order_id;
  if o_status in ('paid', 'cancelled') or exists (select 1 from public.bills where order_id = new.order_id) then
    raise exception 'order_locked';
  end if;

  if new.status = old.status and new.quantity = old.quantity and new.note is not distinct from old.note then
    return new;
  end if;

  if r = 'admin' then return new; end if;

  -- Captain: change amount or note while the kitchen has not started the line.
  if new.status = old.status then
    if r = 'captain' and old.status = 'new' then return new; end if;
    raise exception 'not_allowed';
  end if;
  if new.quantity <> old.quantity or new.note is distinct from old.note then
    raise exception 'not_allowed';
  end if;

  if r = 'kitchen' and o_status in ('sent', 'preparing', 'ready')
     and old.status in ('new', 'preparing') and new.status in ('preparing', 'ready') then
    return new;
  end if;
  if r = 'captain' and old.status = 'ready' and new.status = 'served' then return new; end if;
  if r = 'captain' and old.status = 'new' and new.status = 'cancelled' then return new; end if;

  raise exception 'not_allowed';
end $$;

drop trigger if exists order_items_before_update on public.order_items;
create trigger order_items_before_update before update on public.order_items
  for each row execute function public.order_item_before_update();

-- The order status follows its lines (see docs/WORKFLOW.md). Cancelled lines are ignored.
create or replace function public.refresh_order_status(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  n_active int; n_new int; n_prep int; n_ready int;
  s text;
begin
  select * into o from public.orders where id = p_order_id and cafe_id = public.app_cafe_id() for update;
  if not found or o.status not in ('sent', 'preparing', 'ready', 'served') then return; end if;

  select count(*) filter (where status <> 'cancelled'),
         count(*) filter (where status = 'new'),
         count(*) filter (where status = 'preparing'),
         count(*) filter (where status = 'ready')
    into n_active, n_new, n_prep, n_ready
    from public.order_items where order_id = p_order_id;

  if n_active = 0 then s := 'cancelled';
  elsif n_prep > 0 then s := 'preparing';
  elsif n_new > 0 then s := 'sent';
  elsif n_ready > 0 then s := 'ready';
  else s := 'served';
  end if;

  if s <> o.status then
    update public.orders set status = s where id = p_order_id;
    if s = 'cancelled' then
      update public.dining_tables set status = 'free' where id = o.table_id;
    end if;
  end if;
end $$;

create or replace function public.order_items_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_order_status(new.order_id);
  return null;
end $$;

drop trigger if exists order_items_after_change on public.order_items;
create trigger order_items_after_change after insert or update of status on public.order_items
  for each row execute function public.order_items_after_change();

-- ===== Actions the app calls =====

-- Open the live order for a table, or start a new draft. Two captains get the same order.
create or replace function public.get_or_create_order(p_table_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if public.app_role() not in ('admin', 'captain') then raise exception 'not_allowed'; end if;
  if not exists (select 1 from public.dining_tables
                  where id = p_table_id and is_active and cafe_id = public.app_cafe_id()) then
    raise exception 'table_unavailable';
  end if;

  select id into v from public.orders where table_id = p_table_id and status not in ('paid', 'cancelled');
  if found then return v; end if;

  begin
    insert into public.orders (table_id, captain_id, status) values (p_table_id, auth.uid(), 'open') returning id into v;
  exception when unique_violation then
    select id into v from public.orders where table_id = p_table_id and status not in ('paid', 'cancelled');
  end;
  return v;
end $$;

-- Send to kitchen. Tapping twice is harmless.
create or replace function public.send_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  bad text;
begin
  if public.app_role() not in ('admin', 'captain') then raise exception 'not_allowed'; end if;
  select * into o from public.orders where id = p_order_id and cafe_id = public.app_cafe_id() for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.status in ('paid', 'cancelled') then raise exception 'order_locked'; end if;
  if o.status <> 'open' then return; end if;

  if not exists (select 1 from public.order_items where order_id = p_order_id and status <> 'cancelled') then
    raise exception 'empty_order';
  end if;

  select string_agg(distinct i.item_name, ', ') into bad
    from public.order_items i
    join public.menu_items m on m.id = i.menu_item_id
    join public.categories c on c.id = m.category_id
   where i.order_id = p_order_id and i.status <> 'cancelled'
     and (not m.is_available or not m.is_active or not c.is_active);
  if bad is not null then raise exception 'sold_out' using detail = bad; end if;

  update public.orders set status = 'sent' where id = p_order_id;
  update public.dining_tables set status = 'busy' where id = o.table_id;
end $$;

-- Ask for bill: only when every line is served.
create or replace function public.ask_for_bill(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if public.app_role() not in ('admin', 'captain') then raise exception 'not_allowed'; end if;
  select * into o from public.orders where id = p_order_id and cafe_id = public.app_cafe_id() for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.status = 'bill_asked' then return; end if;
  if o.status <> 'served' then raise exception 'not_all_served'; end if;

  update public.orders set status = 'bill_asked' where id = p_order_id;
  update public.dining_tables set status = 'bill_asked' where id = o.table_id;
end $$;

-- Cancel: captain only before it is sent; admin any time until a bill is made.
create or replace function public.cancel_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r text := public.app_role();
  o public.orders;
begin
  if r not in ('admin', 'captain') then raise exception 'not_allowed'; end if;
  select * into o from public.orders where id = p_order_id and cafe_id = public.app_cafe_id() for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.status = 'cancelled' then return; end if;
  if o.status = 'paid' then raise exception 'order_locked'; end if;
  if r = 'captain' and o.status <> 'open' then raise exception 'not_allowed'; end if;
  if exists (select 1 from public.bills where order_id = p_order_id) then raise exception 'bill_exists'; end if;

  perform set_config('cafe.bypass', '1', true);
  update public.orders set status = 'cancelled' where id = p_order_id;
  update public.order_items set status = 'cancelled' where order_id = p_order_id and status <> 'cancelled';
  update public.dining_tables set status = 'free' where id = o.table_id;
  perform set_config('cafe.bypass', '', true);
end $$;

-- Sold-out switch for admin, captain and kitchen.
create or replace function public.set_item_available(p_item_id uuid, p_available boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.app_role() not in ('admin', 'captain', 'kitchen') then raise exception 'not_allowed'; end if;
  update public.menu_items set is_available = p_available
   where id = p_item_id and cafe_id = public.app_cafe_id();
end $$;

-- Make or update the bill for an order that asked for it.
create or replace function public.save_bill(p_order_id uuid, p_discount numeric default 0) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  b public.bills;
  v_sub numeric(10,2);
  v_rate numeric(5,2);
  v_tax numeric(10,2);
  v_disc numeric(10,2) := round(coalesce(p_discount, 0), 2);
  v_id uuid;
begin
  if public.app_role() not in ('admin', 'billing') then raise exception 'not_allowed'; end if;
  select * into o from public.orders where id = p_order_id and cafe_id = public.app_cafe_id() for update;
  if not found then raise exception 'order_not_found'; end if;

  select * into b from public.bills where order_id = p_order_id and cafe_id = o.cafe_id for update;
  if found and b.status = 'paid' then raise exception 'already_paid'; end if;
  if o.status <> 'bill_asked' then raise exception 'bill_not_asked'; end if;

  select coalesce(sum(price * quantity), 0) into v_sub
    from public.order_items where order_id = p_order_id and status <> 'cancelled';
  if not exists (select 1 from public.order_items where order_id = p_order_id and status <> 'cancelled') then
    raise exception 'empty_order';
  end if;
  if v_disc < 0 or v_disc > v_sub then raise exception 'bad_discount'; end if;

  if b.id is not null then
    -- Bill already made: keep its tax rate, only the discount may change.
    v_rate := b.tax_percent;
    v_tax := round(v_sub * v_rate / 100, 2);
    update public.bills
       set subtotal = v_sub, tax_amount = v_tax, discount = v_disc, total = v_sub + v_tax - v_disc
     where id = b.id;
    return b.id;
  end if;

  select tax_percent into v_rate from public.settings where cafe_id = o.cafe_id;
  v_rate := coalesce(v_rate, 0);
  v_tax := round(v_sub * v_rate / 100, 2);
  insert into public.bills (order_id, subtotal, tax_percent, tax_amount, discount, total, created_by)
  values (p_order_id, v_sub, v_rate, v_tax, v_disc, v_sub + v_tax - v_disc, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Take payment. Bill, order and table are all updated together or not at all.
create or replace function public.take_payment(p_bill_id uuid, p_method text, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bills;
  o public.orders;
begin
  if public.app_role() not in ('admin', 'billing') then raise exception 'not_allowed'; end if;
  select * into b from public.bills where id = p_bill_id and cafe_id = public.app_cafe_id() for update;
  if not found then raise exception 'bill_not_found'; end if;
  if b.status = 'paid' then raise exception 'already_paid'; end if;
  if p_method not in ('cash', 'card', 'upi') then raise exception 'bad_method'; end if;
  if round(coalesce(p_amount, -1), 2) <> b.total then raise exception 'wrong_amount'; end if;

  select * into o from public.orders where id = b.order_id for update;
  if o.status <> 'bill_asked' then raise exception 'bill_not_asked'; end if;

  insert into public.payments (bill_id, method, amount, received_by) values (b.id, p_method, b.total, auth.uid());
  update public.bills set status = 'paid' where id = b.id;
  update public.orders set status = 'paid' where id = o.id;
  update public.dining_tables set status = 'free' where id = o.table_id;
end $$;

-- ===== Reports (read-only; they only count paid bills; days use India time) =====

create or replace view public.daily_sales with (security_invoker = true) as
select (p.paid_at at time zone 'Asia/Kolkata')::date as sale_date,
       count(*)::int as bills,
       sum(b.total) as total_sales,
       sum(b.tax_amount) as tax,
       sum(b.discount) as discount
  from public.payments p
  join public.bills b on b.id = p.bill_id
 where b.status = 'paid'
 group by 1;

create or replace view public.monthly_sales with (security_invoker = true) as
select date_trunc('month', (p.paid_at at time zone 'Asia/Kolkata'))::date as month,
       count(*)::int as bills,
       sum(b.total) as total_sales
  from public.payments p
  join public.bills b on b.id = p.bill_id
 where b.status = 'paid'
 group by 1;

create or replace view public.top_items with (security_invoker = true) as
select (p.paid_at at time zone 'Asia/Kolkata')::date as sale_date,
       i.item_name,
       sum(i.quantity)::int as quantity,
       sum(i.quantity * i.price) as amount
  from public.payments p
  join public.bills b on b.id = p.bill_id
  join public.order_items i on i.order_id = b.order_id and i.status <> 'cancelled'
 where b.status = 'paid'
 group by 1, 2;

create or replace view public.sales_by_method with (security_invoker = true) as
select (p.paid_at at time zone 'Asia/Kolkata')::date as sale_date,
       p.method,
       count(*)::int as bills,
       sum(p.amount) as total
  from public.payments p
  join public.bills b on b.id = p.bill_id
 where b.status = 'paid'
 group by 1, 2;

create or replace view public.expenses_by_category with (security_invoker = true) as
select e.expense_date, c.name as category, sum(e.amount) as total
  from public.expenses e
  join public.expense_categories c on c.id = e.category_id
 group by 1, 2;

create or replace view public.daily_profit with (security_invoker = true) as
select coalesce(s.sale_date, e.expense_date) as day,
       coalesce(s.total_sales, 0) as sales,
       coalesce(e.total, 0) as expenses,
       coalesce(s.total_sales, 0) - coalesce(e.total, 0) as profit
  from public.daily_sales s
  full join (select expense_date, sum(amount) as total from public.expenses group by 1) e
    on e.expense_date = s.sale_date;

-- ===== Access rules (Row Level Security) =====
-- Everything is closed by default. Turned-off staff get nothing (app_role() is empty for them).

alter table public.cafes              enable row level security;
alter table public.profiles           enable row level security;
alter table public.settings           enable row level security;
alter table public.dining_tables      enable row level security;
alter table public.categories         enable row level security;
alter table public.menu_items         enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.bills              enable row level security;
alter table public.payments           enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses           enable row level security;

-- Every rule below also says "same cafe". One cafe can never see or change another cafe's rows.

drop policy if exists cafe_read on public.cafes;
create policy cafe_read on public.cafes for select to authenticated
  using (id = public.app_cafe_id());

-- Everyone who is on can read these. (Kitchen also needs table names for its cards.)
do $$
declare t text;
begin
  foreach t in array array['settings', 'dining_tables', 'categories', 'menu_items', 'orders', 'order_items'] loop
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.app_role() is not null and cafe_id = public.app_cafe_id())', t);
  end loop;

  -- Admin adds and edits. Nothing important is ever deleted.
  foreach t in array array['settings', 'dining_tables', 'categories', 'menu_items', 'orders'] loop
    execute format('drop policy if exists admin_insert on public.%I', t);
    execute format('drop policy if exists admin_update on public.%I', t);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check (public.app_role() = ''admin'' and cafe_id = public.app_cafe_id())', t);
    execute format('create policy admin_update on public.%I for update to authenticated using (public.app_role() = ''admin'' and cafe_id = public.app_cafe_id()) with check (public.app_role() = ''admin'' and cafe_id = public.app_cafe_id())', t);
  end loop;

  -- Admin only, including delete.
  foreach t in array array['expense_categories', 'expenses'] loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.app_role() = ''admin'' and cafe_id = public.app_cafe_id()) with check (public.app_role() = ''admin'' and cafe_id = public.app_cafe_id())', t);
  end loop;
end $$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (
    (cafe_id = public.app_cafe_id() and public.app_role() = 'admin')
    or (id = auth.uid() and public.app_role() is not null)
  );
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.app_role() = 'admin' and cafe_id = public.app_cafe_id())
  with check (public.app_role() = 'admin' and cafe_id = public.app_cafe_id());

-- Order lines: captain adds; kitchen and captain change status. The update trigger above decides what is allowed.
drop policy if exists items_insert on public.order_items;
create policy items_insert on public.order_items for insert to authenticated
  with check (public.app_role() in ('admin', 'captain') and cafe_id = public.app_cafe_id());
drop policy if exists items_update on public.order_items;
create policy items_update on public.order_items for update to authenticated
  using (public.app_role() in ('admin', 'captain', 'kitchen') and cafe_id = public.app_cafe_id())
  with check (public.app_role() in ('admin', 'captain', 'kitchen') and cafe_id = public.app_cafe_id());

-- Bills and payments: read only here. Writing goes through save_bill and take_payment.
drop policy if exists bills_read on public.bills;
create policy bills_read on public.bills for select to authenticated
  using (public.app_role() in ('admin', 'billing') and cafe_id = public.app_cafe_id());
drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to authenticated
  using (public.app_role() in ('admin', 'billing') and cafe_id = public.app_cafe_id());

-- ===== Who may call what =====
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.app_role(),
  public.app_cafe_id(),
  public.create_cafe(text, text),
  public.my_profile(),
  public.cafe_bypass(),
  public.get_or_create_order(uuid),
  public.send_order(uuid),
  public.ask_for_bill(uuid),
  public.cancel_order(uuid),
  public.set_item_available(uuid, boolean),
  public.save_bill(uuid, numeric),
  public.take_payment(uuid, text, numeric)
to authenticated;

grant select on public.daily_sales, public.monthly_sales, public.top_items,
  public.sales_by_method, public.expenses_by_category, public.daily_profit to authenticated;
