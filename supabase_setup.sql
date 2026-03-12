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
  ai_summary text,
  is_lost_operation boolean default false,
  lost_operation_reason text
);

-- Ensure columns exist if table was already created
alter table public.reports add column if not exists is_lost_operation boolean default false;
alter table public.reports add column if not exists lost_operation_reason text;

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

-- 6. Chat Channels
create table if not exists public.chat_channels (
  id text not null primary key,
  name text not null,
  type text not null,
  zone text,
  participant_ids text[],
  created_by text not null,
  created_at bigint not null
);

-- 7. Chat Messages
create table if not exists public.chat_messages (
  id text not null primary key,
  channel_id text not null,
  user_id text not null,
  user_name text not null,
  content text not null,
  timestamp bigint not null
);


-- Insertar usuario Maestro (Gerencia) si no existe
-- Esto asegura que Gerencia aparezca en la lista de usuarios y se pueda gestionar
insert into public.app_users (id, username, password, name, role, zone, email)
values ('master-gerencia', 'Gerencia', 'Newland2026', 'Gerencia General', 'SUPERADMIN', 'Global', 'gerencia@newlandtelecom.es')
on conflict (id) do nothing;

-- Habilitar seguridad (RLS)
alter table public.app_users enable row level security;
alter table public.questions enable row level security;
alter table public.reports enable row level security;
alter table public.appointments enable row level security;
alter table public.documents enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;

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

drop policy if exists "Public access chat_channels" on public.chat_channels;
create policy "Public access chat_channels" on public.chat_channels for all using (true);

drop policy if exists "Public access chat_messages" on public.chat_messages;
create policy "Public access chat_messages" on public.chat_messages for all using (true);

-- 8. Peticiones
create table if not exists public.requests (
  id text not null primary key,
  creator_id text not null,
  creator_name text not null,
  creator_zone text,
  target_role text not null,
  title text not null,
  description text not null,
  status text not null,
  response text,
  created_at bigint not null,
  updated_at bigint not null
);

alter table public.requests enable row level security;
drop policy if exists "Public access requests" on public.requests;
create policy "Public access requests" on public.requests for all using (true);

-- 9. Objetivos de Usuarios
create table if not exists public.user_goals (
  id text not null primary key,
  user_id text not null,
  month text not null,
  goal_lines integer not null,
  deadline_date text not null
);

alter table public.user_goals enable row level security;
drop policy if exists "Public access user_goals" on public.user_goals;
create policy "Public access user_goals" on public.user_goals for all using (true);

-- 10. Reclamaciones
create table if not exists public.claims (
  id text not null primary key,
  company_name text not null,
  cif text not null,
  problem text not null,
  allegations text,
  status text not null,
  commercial_id text not null,
  admin_id text not null,
  zone text not null,
  created_at bigint not null,
  resolution text
);

alter table public.claims add column if not exists resolution text;

alter table public.claims enable row level security;
drop policy if exists "Public access claims" on public.claims;
create policy "Public access claims" on public.claims for all using (true);

-- 11. Adjuntos Reclamaciones
create table if not exists public.claim_attachments (
  id text not null primary key,
  claim_id text not null,
  file_name text not null,
  file_type text not null,
  data text not null,
  uploaded_by text not null
);

alter table public.claim_attachments enable row level security;
drop policy if exists "Public access claim_attachments" on public.claim_attachments;
create policy "Public access claim_attachments" on public.claim_attachments for all using (true);

-- 12. Configuraciones de Correo
create table if not exists public.user_email_configs (
  user_id text not null primary key,
  smtp_host text not null,
  smtp_port integer not null,
  smtp_user text not null,
  smtp_pass text not null,
  smtp_secure boolean not null default true
);

alter table public.user_email_configs enable row level security;
drop policy if exists "Public access user_email_configs" on public.user_email_configs;
create policy "Public access user_email_configs" on public.user_email_configs for all using (true);
