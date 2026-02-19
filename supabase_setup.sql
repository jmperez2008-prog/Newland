-- Este script configura la base de datos de manera segura.
-- Si las tablas ya existen, no dará error.

-- 1. Usuarios
create table if not exists public.app_users (
  id text not null primary key,
  username text not null,
  password text not null,
  name text not null,
  role text not null,
  zone text,
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Preguntas / Formularios
create table if not exists public.questions (
  id text not null primary key,
  text text not null,
  type text not null,
  options text[],
  required boolean default true
);

-- 3. Reportes
create table if not exists public.reports (
  id text not null primary key,
  user_id text not null,
  user_name text not null,
  timestamp bigint not null,
  answers jsonb not null,
  ai_summary text
);

-- 4. Citas / Agenda
create table if not exists public.appointments (
  id text not null primary key,
  user_id text not null,
  user_name text not null,
  date text not null,
  time_slot text not null,
  notes text
);

-- 5. Documentos
create table if not exists public.documents (
  id text not null primary key,
  name text not null,
  type text not null,
  size bigint not null,
  uploaded_at bigint not null,
  data text not null
);

-- Insertar usuario Maestro (Gerencia) si no existe
-- Esto asegura que Gerencia aparezca en la lista de usuarios y se pueda gestionar
insert into public.app_users (id, username, password, name, role, zone, email)
values ('master-gerencia', 'Gerencia', 'Newland2026', 'Gerencia General', 'SUPERADMIN', 'Global', 'gerencia@newland.com')
on conflict (id) do nothing;

-- Habilitar seguridad (RLS)
alter table public.app_users enable row level security;
alter table public.questions enable row level security;
alter table public.reports enable row level security;
alter table public.appointments enable row level security;
alter table public.documents enable row level security;

-- Políticas de acceso (Permitir todo para simplificar demo)
-- Borramos primero por si ya existen para evitar duplicados
drop policy if exists "Public access users" on public.app_users;
create policy "Public access users" on public.app_users for all using (true);

drop policy if exists "Public access questions" on public.questions;
create policy "Public access questions" on public.questions for all using (true);

drop policy if exists "Public access reports" on public.reports;
create policy "Public access reports" on public.reports for all using (true);

drop policy if exists "Public access appointments" on public.appointments;
create policy "Public access appointments" on public.appointments for all using (true);

drop policy if exists "Public access documents" on public.documents;
create policy "Public access documents" on public.documents for all using (true);
