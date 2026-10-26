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

-- 3. Políticas de acceso (RLS) para perfiles
drop policy if exists "Los perfiles son públicos para lectura" on public.profiles;
create policy "Los perfiles son públicos para lectura"
  on public.profiles for select
  using ( true );

drop policy if exists "Los usuarios pueden insertar su propio perfil" on public.profiles;
create policy "Los usuarios pueden insertar su propio perfil"
  on public.profiles for insert
  with check ( (select auth.uid()) = id );

drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.profiles;
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
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger tras la creación de un usuario
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Tabla de Pagos y Planificación (Plannex)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  amount numeric(12,2) not null,
  currency text default 'USD' not null,
  due_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  category text not null default 'general',
  payment_method text default 'de_una',
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en payments
alter table public.payments enable row level security;

-- Políticas de RLS para payments
drop policy if exists "Los usuarios pueden ver solo sus propios pagos" on public.payments;
create policy "Los usuarios pueden ver solo sus propios pagos"
  on public.payments for select
  using ( auth.uid() = user_id );

drop policy if exists "Los usuarios pueden insertar sus propios pagos" on public.payments;
create policy "Los usuarios pueden insertar sus propios pagos"
  on public.payments for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Los usuarios pueden actualizar sus propios pagos" on public.payments;
create policy "Los usuarios pueden actualizar sus propios pagos"
  on public.payments for update
  using ( auth.uid() = user_id );

drop policy if exists "Los usuarios pueden eliminar sus propios pagos" on public.payments;
create policy "Los usuarios pueden eliminar sus propios pagos"
  on public.payments for delete
  using ( auth.uid() = user_id );
