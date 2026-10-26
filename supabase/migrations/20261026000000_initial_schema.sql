-- 1. Tabla de Perfiles vinculada a la autenticación de Supabase (auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar Row Level Security (RLS) para proteger los datos
alter table public.profiles enable row level security;

-- 3. Políticas de acceso (RLS)
-- Cualquier usuario autenticado o anónimo puede leer los perfiles públicos
create policy "Los perfiles son públicos para lectura"
  on public.profiles for select
  using ( true );

-- Los usuarios solo pueden insertar su propio perfil
create policy "Los usuarios pueden insertar su propio perfil"
  on public.profiles for insert
  with check ( (select auth.uid()) = id );

-- Los usuarios solo pueden actualizar su propio perfil
create policy "Los usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  using ( (select auth.uid()) = id );

-- 4. Trigger automático: cuando un usuario se registra en auth.users, se crea su perfil en public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger tras la creación de un usuario
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
