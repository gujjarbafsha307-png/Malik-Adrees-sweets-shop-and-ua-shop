create extension if not exists pgcrypto;

create type public.account_role as enum ('owner', 'customer');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'ready_for_delivery', 'delivered', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'customer',
  full_name text not null default '',
  shop_name text not null default '',
  shop_address text not null default '',
  chak_number text not null default '',
  phone_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null,
  description text not null default '',
  price numeric(12,2) not null check (price > 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 90),
  is_available boolean not null default true,
  image_url text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_catalogue_idx on public.products (is_available, created_at desc);
create index products_category_idx on public.products (category);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.profiles(id),
  status public.order_status not null default 'pending',
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  notes text not null default '',
  idempotency_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);
create index orders_customer_history_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  image_url text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index conversations_updated_idx on public.conversations (updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (length(trim(body)) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  description text not null check (length(trim(description)) between 8 and 5000),
  rating smallint check (rating between 1 and 5),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved')),
  owner_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index complaints_customer_idx on public.complaints (customer_id, created_at desc);
create index complaints_status_idx on public.complaints (status, created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (customer_id, order_id)
);

create table public.shared_order_locations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  shared_at timestamptz not null default now(),
  stopped_at timestamptz
);
create index shared_locations_customer_idx on public.shared_order_locations (customer_id, shared_at desc);

create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null default 'Malik Idrees Shop & UA Trader',
  location text not null default 'Chakki Bazar, Samundri',
  phone text not null default '031040866111',
  policies jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_store_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'owner'::public.account_role);
$$;

create or replace function public.create_profile_for_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name, shop_name, shop_address, chak_number, phone_number)
  values (
    new.id,
    'customer'::public.account_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'shop_name', ''),
    coalesce(new.raw_user_meta_data ->> 'shop_address', ''),
    coalesce(new.raw_user_meta_data ->> 'chak_number', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_number', '')
  );
  return new;
end;
$$;
create trigger auth_user_profile after insert on auth.users for each row execute function public.create_profile_for_signup();

create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_store_owner() then
    raise exception 'Only a store owner can change account roles';
  end if;
  return new;
end;
$$;
create trigger profiles_role_guard before update on public.profiles for each row execute function public.prevent_profile_role_change();

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();
create trigger complaints_updated before update on public.complaints for each row execute function public.set_updated_at();
create trigger settings_updated before update on public.store_settings for each row execute function public.set_updated_at();

create or replace function public.place_order(p_items jsonb, p_notes text default '', p_idempotency_key uuid default gen_random_uuid())
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_customer uuid := auth.uid();
  v_existing_order public.orders%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'MI-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
begin
  if v_customer is null or public.is_store_owner() then raise exception 'A customer account is required to place an order'; end if;
  if p_idempotency_key is null then raise exception 'An order request key is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_customer::text || p_idempotency_key::text, 0));
  select * into v_existing_order from public.orders where customer_id = v_customer and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('id', v_existing_order.id, 'order_number', v_existing_order.order_number); end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Your basket is empty'; end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'Too many items in this order'; end if;

  for v_item in select value from jsonb_array_elements(p_items) order by value ->> 'product_id' loop
    if not (v_item ? 'product_id') or not (v_item ? 'quantity') then raise exception 'Each item needs a product and quantity'; end if;
    if exists (
      select 1 from jsonb_array_elements(p_items) grouped(value)
      where value ->> 'product_id' = v_item ->> 'product_id'
      group by value ->> 'product_id' having count(*) > 1
    ) then raise exception 'Duplicate product entries are not allowed'; end if;
    if (v_item ->> 'quantity') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Invalid product quantity'; end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid for update;
    if not found or not v_product.is_available then raise exception 'A selected product is no longer available'; end if;
    if v_product.stock_quantity < v_quantity then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_unit_price := round(v_product.price * (1 - v_product.discount_percent / 100), 2);
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
    v_total := v_total + v_line_total;
  end loop;
  v_discount := v_subtotal - v_total;

  insert into public.orders (id, order_number, customer_id, subtotal, discount_amount, total_amount, notes, idempotency_key)
  values (v_order_id, v_order_number, v_customer, v_subtotal, v_discount, v_total, left(coalesce(p_notes, ''), 2000), p_idempotency_key);

  for v_item in select value from jsonb_array_elements(p_items) order by value ->> 'product_id' loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    v_unit_price := round(v_product.price * (1 - v_product.discount_percent / 100), 2);
    v_line_total := v_unit_price * v_quantity;
    insert into public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.image_url, v_unit_price, v_quantity, v_line_total);
    update public.products set stock_quantity = stock_quantity - v_quantity where id = v_product.id;
  end loop;

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
end;
$$;

create or replace function public.share_order_location(p_order_id uuid, p_latitude double precision, p_longitude double precision)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_customer uuid := auth.uid();
  v_location_id uuid;
begin
  if v_customer is null or not exists (select 1 from public.orders where id = p_order_id and customer_id = v_customer) then
    raise exception 'You can only share a location for your own order';
  end if;
  insert into public.shared_order_locations (order_id, customer_id, latitude, longitude, shared_at, stopped_at)
  values (p_order_id, v_customer, p_latitude, p_longitude, now(), null)
  on conflict (order_id) do update set latitude = excluded.latitude, longitude = excluded.longitude, shared_at = now(), stopped_at = null
  returning id into v_location_id;
  return v_location_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.complaints enable row level security;
alter table public.reviews enable row level security;
alter table public.shared_order_locations enable row level security;
alter table public.store_settings enable row level security;

create policy "profiles read own or owner" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_store_owner());
create policy "customers update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = 'customer');
create policy "owner update profiles" on public.profiles for update to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

create policy "public reads available products" on public.products for select to anon, authenticated using (is_available or public.is_store_owner());
create policy "owner inserts products" on public.products for insert to authenticated with check (public.is_store_owner() and created_by = (select auth.uid()));
create policy "owner updates products" on public.products for update to authenticated using (public.is_store_owner()) with check (public.is_store_owner());
create policy "owner deletes products" on public.products for delete to authenticated using (public.is_store_owner());

create policy "customers read own orders and owner reads all" on public.orders for select to authenticated using (customer_id = (select auth.uid()) or public.is_store_owner());
create policy "owner updates orders" on public.orders for update to authenticated using (public.is_store_owner()) with check (public.is_store_owner());
create policy "read items from visible orders" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and (orders.customer_id = (select auth.uid()) or public.is_store_owner())));

create policy "customer manages own conversation" on public.conversations for select to authenticated using (customer_id = (select auth.uid()) or public.is_store_owner());
create policy "customer opens own conversation" on public.conversations for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "owner reads all conversations" on public.conversations for select to authenticated using (public.is_store_owner());
create policy "conversation participant reads messages" on public.messages for select to authenticated using (exists (select 1 from public.conversations where conversations.id = messages.conversation_id and (conversations.customer_id = (select auth.uid()) or public.is_store_owner())));
create policy "conversation participant sends messages" on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and exists (select 1 from public.conversations where conversations.id = messages.conversation_id and (conversations.customer_id = (select auth.uid()) or public.is_store_owner())));
create policy "owner marks messages read" on public.messages for update to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

create policy "customers read own complaints" on public.complaints for select to authenticated using (customer_id = (select auth.uid()) or public.is_store_owner());
create policy "customers submit own complaints" on public.complaints for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "owner manages complaints" on public.complaints for update to authenticated using (public.is_store_owner()) with check (public.is_store_owner());
create policy "customers read own reviews" on public.reviews for select to authenticated using (customer_id = (select auth.uid()) or public.is_store_owner());
create policy "customers submit own reviews" on public.reviews for insert to authenticated with check (customer_id = (select auth.uid()) and exists (select 1 from public.orders where orders.id = reviews.order_id and orders.customer_id = (select auth.uid())));
create policy "owner manages reviews" on public.reviews for all to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

create policy "participants read order locations" on public.shared_order_locations for select to authenticated using (customer_id = (select auth.uid()) or public.is_store_owner());
create policy "public reads store settings" on public.store_settings for select to anon, authenticated using (true);
create policy "owner inserts store settings" on public.store_settings for insert to authenticated with check (public.is_store_owner());
create policy "owner updates store settings" on public.store_settings for update to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

revoke all on function public.place_order(jsonb, text, uuid) from public, anon;
grant execute on function public.place_order(jsonb, text, uuid) to authenticated;
revoke all on function public.share_order_location(uuid, double precision, double precision) from public, anon;
grant execute on function public.share_order_location(uuid, double precision, double precision) to authenticated;
revoke all on function public.is_store_owner() from public, anon;
grant execute on function public.is_store_owner() to authenticated;
grant execute on function public.is_store_owner() to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
create policy "public reads product images" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "owner uploads product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_store_owner() and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owner updates product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_store_owner() and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'product-images' and public.is_store_owner() and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owner deletes product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_store_owner() and (storage.foldername(name))[1] = (select auth.uid())::text);

grant usage on schema public to anon, authenticated;
grant select on public.products, public.store_settings to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

DO $$
BEGIN
  alter publication supabase_realtime add table public.products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  alter publication supabase_realtime add table public.orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  alter publication supabase_realtime add table public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  alter publication supabase_realtime add table public.complaints;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
