-- Anuyog Engineering — Supabase schema.
-- Run this whole file once in Supabase → SQL Editor, THEN run seed.sql.
-- Privacy model: the public (anon) can read the catalogue and ADD an inquiry. It can never read,
-- change or delete an inquiry. Only users listed in public.admins can.

create table if not exists public.categories (
  slug  text primary key,
  name  text not null,
  blurb text,
  sort  int  not null default 0
);

create table if not exists public.products (
  slug       text primary key,
  category   text not null references public.categories(slug) on update cascade,
  name       text not null,
  img        text,                              -- relative path (assets/img/..) or a Storage URL
  from_price integer,                           -- null = "On request"
  unit       text default 'Piece',
  featured   boolean not null default false,
  short      text,
  long       text,
  specs      jsonb not null default '[]',       -- [["Material","SS 304"], ...]
  variants   jsonb not null default '[]',       -- [{"name":"..","d":"..","price":123}, ...]
  published  boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  item       text not null check (char_length(item) between 1 and 200),
  qty        text check (char_length(qty) <= 40),
  name       text not null check (char_length(name) between 1 and 120),
  company    text check (char_length(company) <= 160),
  city       text check (char_length(city) <= 120),
  phone      text not null check (char_length(phone) between 6 and 30),
  email      text check (char_length(email) <= 200),
  message    text check (char_length(message) <= 4000),
  consent    boolean not null check (consent = true),   -- the form's tick box; no tick, no row
  status     text not null default 'new' check (status in ('new','contacted','quoted','won','closed'))
);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);

create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.inquiries  enable row level security;
alter table public.admins     enable row level security;   -- no policies: nobody reads it directly

-- table privileges: least needed
revoke all on public.categories, public.products, public.inquiries, public.admins from anon, authenticated;
grant select on public.categories, public.products to anon, authenticated;
grant insert on public.inquiries to anon;
grant select, insert, update, delete on public.categories, public.products, public.inquiries to authenticated;

create policy "catalogue: public read"   on public.categories for select using (true);
create policy "catalogue: admin write"   on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products: public read"    on public.products   for select using (published or public.is_admin());
create policy "products: admin write"    on public.products   for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "inquiries: anyone can add" on public.inquiries for insert to anon, authenticated
  with check (consent = true and status = 'new');
create policy "inquiries: admin read"     on public.inquiries for select to authenticated using (public.is_admin());
create policy "inquiries: admin update"   on public.inquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "inquiries: admin delete"   on public.inquiries for delete to authenticated using (public.is_admin());

-- ---------- Product photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;   -- public bucket: photos are viewable by URL, but only admins can upload/change

create policy "product images: admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "product images: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------- Retention (matches privacy.html: ~2 years unless it became an order) ----------
create or replace function public.purge_old_inquiries() returns void
language sql security definer set search_path = public as
$$ delete from public.inquiries where created_at < now() - interval '2 years' and status <> 'won' $$;
revoke execute on function public.purge_old_inquiries() from public, anon, authenticated;
-- To run it automatically: Database → Extensions → enable pg_cron, then:
-- select cron.schedule('purge-old-inquiries', '0 3 * * 0', 'select public.purge_old_inquiries()');

-- ---------- Make yourself the admin ----------
-- 1. Authentication → Users → Add user (email + password). Authentication → Providers → Email → turn OFF "Allow new users to sign up".
-- 2. Then run, with your email:
--    insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
