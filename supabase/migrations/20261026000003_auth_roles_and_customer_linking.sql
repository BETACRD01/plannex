-- ========================================================
-- MIGRACIÓN: Separación de Roles (Admin vs Cliente) y Enlace de Créditos
-- ========================================================

-- 1. Agregar customer_email y customer_user_id a la tabla de créditos
alter table public.credits 
  add column if not exists customer_email text,
  add column if not exists customer_user_id uuid references auth.users(id);

create index if not exists idx_credits_customer_email on public.credits(customer_email);
create index if not exists idx_credits_customer_user_id on public.credits(customer_user_id);

-- Asignar correos de prueba a los créditos existentes para demostración
update public.credits 
set customer_email = 'carlos.mendoza@gmail.com' 
where customer_name ilike '%Carlos Mendoza%' and customer_email is null;

update public.credits 
set customer_email = 'andrea.salazar@gmail.com' 
where customer_name ilike '%Andrea Salazar%' and customer_email is null;

-- 2. Función robusta para verificar si el usuario actual es administrador
create or replace function public.is_admin()
returns boolean as $$
declare
  v_role text;
  v_email text;
begin
  -- Obtener email del token JWT
  v_email := coalesce(auth.jwt() ->> 'email', '');
  
  -- Correos de superadministrador garantizados
  if lower(v_email) in ('wd1501074@gmail.com', 'williancerda0@gmail.com') then
    return true;
  end if;

  -- Verificar en la tabla de profiles
  select role into v_role
  from public.profiles
  where id = auth.uid();

  return coalesce(v_role = 'admin', false);
end;
$$ language plpgsql security definer;

-- 3. Trigger al registrar un nuevo usuario con Google u otro proveedor
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_assigned_role text := 'user';
  v_user_email text;
begin
  v_user_email := lower(coalesce(new.email, ''));

  -- Asignar rol de admin si coincide con los correos autorizados
  if v_user_email in ('wd1501074@gmail.com', 'williancerda0@gmail.com') then
    v_assigned_role := 'admin';
  else
    v_assigned_role := 'user';
  end if;

  -- Insertar o actualizar perfil con su rol y datos de Google
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    v_assigned_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    role = case
      when v_user_email in ('wd1501074@gmail.com', 'williancerda0@gmail.com') then 'admin'
      else coalesce(profiles.role, 'user')
    end,
    updated_at = now();

  -- Vincular automáticamente los créditos que coincidan con el correo del cliente
  if v_user_email <> '' then
    update public.credits
    set customer_user_id = new.id
    where lower(customer_email) = v_user_email and customer_user_id is null;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Re-asociar el trigger a auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- Actualizar perfiles existentes si los hubiera
update public.profiles
set role = 'admin'
where lower(email) in ('wd1501074@gmail.com', 'williancerda0@gmail.com');

-- 4. Actualizar Políticas de Seguridad RLS
-- Tabla: credits
drop policy if exists "Créditos visibles para usuarios autenticados" on public.credits;
drop policy if exists "Acceso a créditos por rol" on public.credits;
drop policy if exists "Lectura de créditos según rol" on public.credits;
drop policy if exists "Admin gestiona créditos" on public.credits;

create policy "Lectura de créditos según rol"
  on public.credits for select
  using (
    public.is_admin() 
    or customer_user_id = auth.uid() 
    or lower(customer_email) = lower(auth.jwt() ->> 'email')
  );

create policy "Admin crea créditos"
  on public.credits for insert
  with check ( public.is_admin() );

create policy "Admin actualiza créditos"
  on public.credits for update
  using ( public.is_admin() );

create policy "Admin elimina créditos"
  on public.credits for delete
  using ( public.is_admin() );

-- Tabla: credit_installments
drop policy if exists "Cuotas visibles para usuarios autenticados" on public.credit_installments;
drop policy if exists "Lectura de cuotas según rol" on public.credit_installments;
drop policy if exists "Admin gestiona cuotas" on public.credit_installments;

create policy "Lectura de cuotas según rol"
  on public.credit_installments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.credits c
      where c.id = credit_installments.credit_id
        and (c.customer_user_id = auth.uid() or lower(c.customer_email) = lower(auth.jwt() ->> 'email'))
    )
  );

create policy "Admin inserta cuotas"
  on public.credit_installments for insert
  with check ( public.is_admin() );

create policy "Admin actualiza cuotas"
  on public.credit_installments for update
  using ( public.is_admin() );

create policy "Admin elimina cuotas"
  on public.credit_installments for delete
  using ( public.is_admin() );

-- Tabla: credit_payments
drop policy if exists "Abonos visibles para usuarios autenticados" on public.credit_payments;
drop policy if exists "Lectura de abonos según rol" on public.credit_payments;
drop policy if exists "Admin gestiona abonos" on public.credit_payments;

create policy "Lectura de abonos según rol"
  on public.credit_payments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.credits c
      where c.id = credit_payments.credit_id
        and (c.customer_user_id = auth.uid() or lower(c.customer_email) = lower(auth.jwt() ->> 'email'))
    )
  );

create policy "Admin registra abonos"
  on public.credit_payments for insert
  with check ( public.is_admin() );

create policy "Admin actualiza abonos"
  on public.credit_payments for update
  using ( public.is_admin() );

create policy "Admin elimina abonos"
  on public.credit_payments for delete
  using ( public.is_admin() );
