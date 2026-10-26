-- ========================================================
-- MIGRACIÓN: Sistema de Gestión de Créditos y Financiamiento
-- ========================================================

-- 1. Tabla de Créditos y Bienes Financiados
create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_dni text,
  customer_phone text,
  customer_address text,
  item_description text not null, -- Ej: Moto Honda CB125F / iPhone 15 Pro
  item_category text not null default 'general', -- vehiculo, telefonia, electrodomestico, prestamo, otro
  item_identifier text, -- Placa, Chasis, IMEI, Serial
  total_price numeric(12,2) not null check (total_price >= 0),
  down_payment numeric(12,2) not null default 0 check (down_payment >= 0),
  financed_amount numeric(12,2) not null check (financed_amount >= 0),
  interest_rate numeric(5,2) not null default 0 check (interest_rate >= 0),
  total_debt numeric(12,2) not null check (total_debt >= 0),
  remaining_balance numeric(12,2) not null check (remaining_balance >= 0),
  total_installments integer not null check (total_installments > 0),
  installment_amount numeric(12,2) not null check (installment_amount >= 0),
  frequency text not null check (frequency in ('semanal', 'quincenal', 'mensual')),
  start_date date not null default current_date,
  first_due_date date not null default current_date,
  status text not null default 'activo' check (status in ('activo', 'atrasado', 'cancelado')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Cuotas / Plan de Pagos
create table if not exists public.credit_installments (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid references public.credits(id) on delete cascade not null,
  installment_number integer not null,
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'pendiente' check (status in ('pendiente', 'parcial', 'pagada', 'vencida')),
  days_overdue integer not null default 0,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabla de Pagos y Abonos (Auditoría inmutable)
create table if not exists public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid references public.credits(id) on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'efectivo', -- efectivo, transferencia, de_una, deposito, tarjeta
  payment_date date not null default current_date,
  previous_balance numeric(12,2) not null,
  new_balance numeric(12,2) not null,
  voucher_url text,
  evidence_urls jsonb not null default '[]'::jsonb,
  user_notes text,
  admin_notes text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en las tablas
alter table public.credits enable row level security;
alter table public.credit_installments enable row level security;
alter table public.credit_payments enable row level security;

-- Políticas permisivas para usuarios autenticados / lectura pública controlada
drop policy if exists "Créditos visibles para usuarios autenticados" on public.credits;
create policy "Créditos visibles para usuarios autenticados"
  on public.credits for all
  using ( true );

drop policy if exists "Cuotas visibles para usuarios autenticados" on public.credit_installments;
create policy "Cuotas visibles para usuarios autenticados"
  on public.credit_installments for all
  using ( true );

drop policy if exists "Abonos visibles para usuarios autenticados" on public.credit_payments;
create policy "Abonos visibles para usuarios autenticados"
  on public.credit_payments for all
  using ( true );

-- 4. Función Trigger para aplicar pagos a cuotas y balance en cascada
create or replace function public.process_credit_payment()
returns trigger as $$
declare
  v_remaining_payment numeric(12,2) := new.amount;
  v_installment record;
  v_due_needed numeric(12,2);
  v_pay_amount numeric(12,2);
  v_any_overdue boolean := false;
  v_current_credit record;
begin
  -- Obtener el crédito actual
  select * into v_current_credit from public.credits where id = new.credit_id;
  if not found then
    raise exception 'Crédito no encontrado';
  end if;

  -- 1. Recorrer cuotas pendientes o parciales en orden cronológico
  for v_installment in
    select * from public.credit_installments
    where credit_id = new.credit_id and status in ('pendiente', 'parcial', 'vencida')
    order by installment_number asc
  loop
    if v_remaining_payment <= 0 then
      exit;
    end if;

    v_due_needed := v_installment.amount - v_installment.amount_paid;

    if v_remaining_payment >= v_due_needed then
      -- Cubre la totalidad de la cuota
      update public.credit_installments
      set
        amount_paid = amount,
        status = 'pagada',
        paid_at = coalesce(new.payment_date::timestamptz, now()),
        days_overdue = 0
      where id = v_installment.id;

      v_remaining_payment := v_remaining_payment - v_due_needed;
    else
      -- Pago parcial de la cuota
      update public.credit_installments
      set
        amount_paid = amount_paid + v_remaining_payment,
        status = 'parcial'
      where id = v_installment.id;

      v_remaining_payment := 0;
    end if;
  end loop;

  -- 2. Recalcular días de atraso en cuotas no pagadas
  update public.credit_installments
  set
    days_overdue = greatest(0, (current_date - due_date)::integer),
    status = case
      when status = 'pagada' then 'pagada'
      when due_date < current_date and amount_paid > 0 then 'parcial'
      when due_date < current_date and amount_paid = 0 then 'vencida'
      when amount_paid > 0 then 'parcial'
      else 'pendiente'
    end
  where credit_id = new.credit_id and status != 'pagada';

  -- 3. Verificar si queda alguna cuota vencida
  select exists(
    select 1 from public.credit_installments
    where credit_id = new.credit_id and status in ('vencida', 'parcial') and due_date < current_date
  ) into v_any_overdue;

  -- 4. Actualizar el saldo del crédito y su estado
  update public.credits
  set
    remaining_balance = greatest(0, remaining_balance - new.amount),
    status = case
      when (remaining_balance - new.amount) <= 0 then 'cancelado'
      when v_any_overdue then 'atrasado'
      else 'activo'
    end,
    updated_at = now()
  where id = new.credit_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_credit_payment_inserted on public.credit_payments;
create trigger on_credit_payment_inserted
  after insert on public.credit_payments
  for each row execute procedure public.process_credit_payment();

-- 5. Función auxiliar para refrescar el estado de mora de los créditos
create or replace function public.refresh_credits_overdue_status()
returns void as $$
begin
  -- Actualizar cuotas vencidas
  update public.credit_installments
  set
    days_overdue = greatest(0, (current_date - due_date)::integer),
    status = case
      when status = 'pagada' then 'pagada'
      when amount_paid > 0 then 'parcial'
      else 'vencida'
    end
  where status != 'pagada' and due_date < current_date;

  -- Actualizar estado de créditos activos con cuotas vencidas
  update public.credits c
  set status = 'atrasado'
  where status = 'activo'
    and exists (
      select 1 from public.credit_installments i
      where i.credit_id = c.id and i.status in ('vencida', 'parcial') and i.due_date < current_date
    );
end;
$$ language plpgsql security definer;
