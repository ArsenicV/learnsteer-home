-- LearnSteer homepage schema (Supabase/Postgres)
-- Apply in Supabase SQL editor or as a migration.

create extension if not exists pgcrypto;

-- Site copy blocks (optional but recommended)
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Roadmap
create table if not exists public.roadmap_stages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null check (status in ('Completed','In progress','Planned')),
  date_label text not null default '',
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Contributors
create table if not exists public.contributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  team text not null default '',
  image_path text,
  link text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Join form submissions
create table if not exists public.join_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text not null,
  why text not null,
  created_at timestamptz not null default now()
);

-- Admin flag (optional; link to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false
);

-- RLS
alter table public.site_content enable row level security;
alter table public.roadmap_stages enable row level security;
alter table public.contributors enable row level security;
alter table public.join_submissions enable row level security;
alter table public.profiles enable row level security;

-- Public reads
create policy "public read site_content" on public.site_content for select using (true);
create policy "public read roadmap_stages" on public.roadmap_stages for select using (true);
create policy "public read contributors" on public.contributors for select using (true);

-- Public insert submissions (basic constraints; add rate limiting via Edge Function for production hardening)
create policy "public insert join_submissions" on public.join_submissions for insert with check (
  length(name) between 2 and 200 and length(email) between 5 and 320 and length(why) >= 10
);

-- Admin helper: profiles.is_admin = true for auth.uid()
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.is_admin);
$$;

-- Admin write policies
create policy "admin write site_content" on public.site_content for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write roadmap_stages" on public.roadmap_stages for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write contributors" on public.contributors for all using (public.is_admin()) with check (public.is_admin());
create policy "admin read submissions" on public.join_submissions for select using (public.is_admin());
create policy "admin delete submissions" on public.join_submissions for delete using (public.is_admin());

create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "admin manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Storage: create a public bucket named 'media' in the Supabase dashboard (Storage),
-- then add policies to allow public read and admin write. Example (run after bucket exists):
-- insert into storage.buckets (id,name,public) values ('media','media',true) on conflict do nothing;
-- create policy "public read media" on storage.objects for select using (bucket_id = 'media');
-- create policy "admin write media" on storage.objects for all using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
