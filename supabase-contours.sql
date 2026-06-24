-- REBUS: Контури доступу
-- Застосувати в Supabase SQL Editor перед використанням сторінки contours.html.

create extension if not exists pgcrypto;

create table if not exists public.rebus_contours (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rebus_contour_members (
  id uuid primary key default gen_random_uuid(),
  contour_id uuid not null references public.rebus_contours(id) on delete cascade,
  user_id text,
  email text not null,
  marker text,
  role text not null default 'user',
  added_by text,
  created_at timestamptz not null default now(),
  constraint rebus_contour_members_email_unique unique (email),
  constraint rebus_contour_members_user_unique unique (user_id)
);

create index if not exists rebus_contour_members_contour_idx on public.rebus_contour_members(contour_id);
create index if not exists rebus_contour_members_email_idx on public.rebus_contour_members(email);

alter table public.rebus_contours enable row level security;
alter table public.rebus_contour_members enable row level security;

drop policy if exists "rebus_contours_read_authenticated" on public.rebus_contours;
drop policy if exists "rebus_contours_write_authenticated" on public.rebus_contours;
drop policy if exists "rebus_contour_members_read_authenticated" on public.rebus_contour_members;
drop policy if exists "rebus_contour_members_write_authenticated" on public.rebus_contour_members;

create policy "rebus_contours_read_authenticated"
on public.rebus_contours for select
to authenticated
using (true);

create policy "rebus_contours_write_authenticated"
on public.rebus_contours for all
to authenticated
using (true)
with check (true);

create policy "rebus_contour_members_read_authenticated"
on public.rebus_contour_members for select
to authenticated
using (true);

create policy "rebus_contour_members_write_authenticated"
on public.rebus_contour_members for all
to authenticated
using (true)
with check (true);

-- Опційно: стартовий контур
insert into public.rebus_contours (name, description, created_by)
values ('Загальний контур', 'Базовий контур доступу за замовчуванням', 'system')
on conflict (name) do nothing;
