-- ========================================================
-- MIGRACIÓN: Módulo de Suscripciones, Pagos y Verificación
-- ========================================================

-- 1. Asegurar campo 'role' en 'profiles'
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles add column role text not null default 'user' check (role in ('user', 'admin'));
  end if;
end $$;

-- 2. Función de seguridad: verificar si el usuario actual es administrador
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 3. Tabla de Planes de Suscripción
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  duration_months integer not null check (duration_months > 0),
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'USD',
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.subscription_plans enable row level security;

drop policy if exists "Planes visibles para todos" on public.subscription_plans;
create policy "Planes visibles para todos"
  on public.subscription_plans for select
  using ( is_active = true or public.is_admin() );

drop policy if exists "Solo administradores pueden gestionar planes" on public.subscription_plans;
create policy "Solo administradores pueden gestionar planes"
  on public.subscription_plans for all
  using ( public.is_admin() );

-- 4. Tabla de Suscripciones de Usuarios (Control de Vigencia)
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id uuid references public.subscription_plans(id) on delete restrict not null,
  status text not null default 'inactive' check (status in ('active', 'inactive', 'expired', 'cancelled')),
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_subscriptions enable row level security;

drop policy if exists "Los usuarios ven sus propias suscripciones" on public.user_subscriptions;
create policy "Los usuarios ven sus propias suscripciones"
  on public.user_subscriptions for select
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Administradores gestionan suscripciones" on public.user_subscriptions;
create policy "Administradores gestionan suscripciones"
  on public.user_subscriptions for all
  using ( public.is_admin() );

-- 5. Tabla de Registro de Pagos y Comprobantes
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id uuid references public.subscription_plans(id) on delete restrict not null,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD',
  payment_method text not null,
  payment_date date not null default current_date,
  voucher_url text,
  evidence_urls jsonb not null default '[]'::jsonb,
  user_notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  verified_by uuid references auth.users(id),
  verified_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.subscription_payments enable row level security;

drop policy if exists "Usuarios ven sus propios pagos de suscripcion" on public.subscription_payments;
create policy "Usuarios ven sus propios pagos de suscripcion"
  on public.subscription_payments for select
  using ( auth.uid() = user_id or public.is_admin() );

drop policy if exists "Usuarios registran sus propios pagos" on public.subscription_payments;
create policy "Usuarios registran sus propios pagos"
  on public.subscription_payments for insert
  with check ( auth.uid() = user_id and status = 'pending' );

drop policy if exists "Administradores gestionan y verifican pagos" on public.subscription_payments;
create policy "Administradores gestionan y verifican pagos"
  on public.subscription_payments for update
  using ( public.is_admin() );

-- 6. Trigger automático para activar/extender la vigencia al APROBAR un pago
create or replace function public.process_payment_approval()
returns trigger as $$
declare
  v_plan record;
  v_existing_sub record;
  v_new_starts_at timestamp with time zone;
  v_new_expires_at timestamp with time zone;
  v_sub_id uuid;
begin
  -- Solo se ejecuta cuando el estado cambia a 'approved'
  if (new.status = 'approved' and (old.status is distinct from 'approved')) then
    -- Obtener la duración del plan
    select * into v_plan from public.subscription_plans where id = new.plan_id;
    if not found then
      raise exception 'Plan de suscripción no encontrado';
    end if;

    -- Verificar si el usuario ya tiene una suscripción activa
    select * into v_existing_sub 
    from public.user_subscriptions 
    where user_id = new.user_id and status = 'active' and expires_at > now()
    order by expires_at desc limit 1;

    if found then
      -- Extender la suscripción existente para no perder días pagados
      v_new_starts_at := v_existing_sub.starts_at;
      v_new_expires_at := v_existing_sub.expires_at + (v_plan.duration_months || ' months')::interval;
      
      update public.user_subscriptions
      set 
        plan_id = new.plan_id,
        expires_at = v_new_expires_at,
        updated_at = now()
      where id = v_existing_sub.id;

      v_sub_id := v_existing_sub.id;
    else
      -- Crear nueva suscripción con fecha de inicio hoy (o fecha de pago) y fecha de expiración calculada
      v_new_starts_at := now();
      v_new_expires_at := v_new_starts_at + (v_plan.duration_months || ' months')::interval;

      insert into public.user_subscriptions (user_id, plan_id, status, starts_at, expires_at)
      values (new.user_id, new.plan_id, 'active', v_new_starts_at, v_new_expires_at)
      returning id into v_sub_id;
    end if;

    -- Actualizar el pago con la suscripción vinculada y metadatos de verificación
    new.subscription_id := v_sub_id;
    new.verified_at := now();
    if auth.uid() is not null then
      new.verified_by := auth.uid();
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_payment_approval on public.subscription_payments;
create trigger on_payment_approval
  before update on public.subscription_payments
  for each row execute procedure public.process_payment_approval();

-- 7. Configuración de Bucket de Almacenamiento para Comprobantes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-vouchers',
  'payment-vouchers',
  true,
  10485760, -- 10MB límite
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set public = true;

-- Políticas de Storage para payment-vouchers
drop policy if exists "Comprobantes visibles públicamente" on storage.objects;
create policy "Comprobantes visibles públicamente"
  on storage.objects for select
  using ( bucket_id = 'payment-vouchers' );

drop policy if exists "Usuarios autenticados suben comprobantes" on storage.objects;
create policy "Usuarios autenticados suben comprobantes"
  on storage.objects for insert
  with check ( bucket_id = 'payment-vouchers' and auth.role() = 'authenticated' );

-- 8. Poblar Planes Iniciales (3 Años y 4 Años)
insert into public.subscription_plans (name, slug, description, duration_months, price, currency, features, is_active)
values 
  (
    'Membresía 3 Años',
    'plan-3-anos',
    'Acceso completo durante 3 años con tarifa preferencial.',
    36,
    149.00,
    'USD',
    jsonb_build_array(
      'Acceso completo a todas las funciones por 36 meses',
      'Sincronización en tiempo real Web y Móvil',
      'Registro ilimitado de pagos y finanzas',
      'Soporte prioritario garantizado',
      'Ahorro del 30% frente al pago anual'
    ),
    true
  ),
  (
    'Membresía 4 Años',
    'plan-4-anos',
    'El plan de mayor duración y máximo ahorro por 4 años completos.',
    48,
    189.00,
    'USD',
    jsonb_build_array(
      'Acceso total ininterrumpido por 48 meses',
      'Precio congelado sin aumentos durante toda la vigencia',
      'Sincronización en tiempo real Web y Móvil',
      'Auditoría y reportes de pagos descargables',
      'Máximo ahorro del 45% frente al pago anual'
    ),
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  duration_months = excluded.duration_months,
  price = excluded.price,
  features = excluded.features;
