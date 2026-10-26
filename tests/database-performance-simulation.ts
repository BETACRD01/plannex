/**
 * Simulación en Tiempo Real en la Base de Datos PostgreSQL de Supabase
 * Prueba de rendimiento, latencia de triggers, cuadratura matemática inversa y limpieza.
 */

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'feefwrtilzifxwyacrle';
const SUPABASE_API_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_API_TOKEN || '';

async function queryDatabase(sql: string) {
  const start = performance.now();
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const duration = performance.now() - start;
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Database error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return { data, duration };
}

async function runDatabaseSimulation() {
  console.log('\n=============================================================');
  console.log('⚡ SIMULACIÓN EN VIVO EN POSTGRESQL & ANÁLISIS DE RENDIMIENTO');
  console.log('=============================================================\n');

  if (!SUPABASE_API_TOKEN) {
    console.log('ℹ️  SUPABASE_ACCESS_TOKEN no detectado en variables de entorno.');
    console.log('   Para ejecutar la prueba de estrés en vivo contra la base de datos de Supabase:');
    console.log('   SUPABASE_ACCESS_TOKEN=<tu_token> npm run test:db\n');
    return;
  }

  // 1. Prueba de rendimiento de lectura general
  process.stdout.write('1. Midiendo latencia de consulta en tabla credits... ');
  const { data: credits, duration: creditsLatency } = await queryDatabase(
    'SELECT count(*) FROM public.credits;'
  );
  console.log(`✓ Latencia: ${creditsLatency.toFixed(1)}ms (Registros: ${credits[0].count})`);

  process.stdout.write('2. Midiendo latencia de consulta en credit_installments... ');
  const { duration: installmentsLatency } = await queryDatabase(
    'SELECT count(*) FROM public.credit_installments;'
  );
  console.log(`✓ Latencia: ${installmentsLatency.toFixed(1)}ms`);

  // 2. Creación de un Crédito Sintético de Prueba para el ciclo de vida
  const testCreditId = '99999999-0000-0000-0000-000000000001';
  console.log(`\n3. Insertando crédito de prueba sintético (Moto Yamaha Test)...`);

  await queryDatabase(`
    DELETE FROM public.credits WHERE id = '${testCreditId}';
    INSERT INTO public.credits (
      id, customer_name, customer_email, item_description, item_category,
      total_price, down_payment, financed_amount, interest_rate,
      total_debt, remaining_balance, total_installments, installment_amount,
      frequency, start_date, first_due_date, status
    ) VALUES (
      '${testCreditId}', 'Deudor Simulación', 'simulacion@test.com', 'Moto Yamaha R3 Test', 'vehiculo',
      3000.00, 500.00, 2500.00, 10.00,
      2750.00, 2750.00, 5, 550.00,
      'mensual', current_date, current_date + interval '30 days', 'activo'
    );
  `);

  // Insertar las 5 cuotas de $550 cada una (5 * 550 = 2750)
  for (let i = 1; i <= 5; i++) {
    await queryDatabase(`
      INSERT INTO public.credit_installments (
        credit_id, installment_number, due_date, amount, amount_paid, status, days_overdue
      ) VALUES (
        '${testCreditId}', ${i}, current_date + interval '${i * 30} days', 550.00, 0.00, 'pendiente', 0
      );
    `);
  }
  console.log('   ✓ Crédito y 5 cuotas generadas ($2,750.00 de deuda total).');

  // 3. Simulación de Abono 1 (Pago Parcial de $200)
  process.stdout.write('\n4. Simulando Abono 1 (Pago Parcial de $200.00)... ');
  const payment1Start = performance.now();
  await queryDatabase(`
    INSERT INTO public.credit_payments (
      credit_id, amount, payment_method, previous_balance, new_balance
    ) VALUES (
      '${testCreditId}', 200.00, 'transferencia', 2750.00, 2550.00
    );
  `);
  const payment1TriggerTime = performance.now() - payment1Start;

  // Verificar estado tras abono 1
  const { data: state1 } = await queryDatabase(`
    SELECT remaining_balance, status FROM public.credits WHERE id = '${testCreditId}';
  `);
  const { data: inst1 } = await queryDatabase(`
    SELECT installment_number, amount, amount_paid, status 
    FROM public.credit_installments WHERE credit_id = '${testCreditId}' ORDER BY installment_number;
  `);

  if (
    Number(state1[0].remaining_balance) === 2550 &&
    inst1[0].status === 'parcial' &&
    Number(inst1[0].amount_paid) === 200
  ) {
    console.log(`✓ EXITOSO (Trigger ejecutado en ${payment1TriggerTime.toFixed(1)}ms).`);
    console.log(`   → Saldo restante: $${state1[0].remaining_balance} | Cuota 1: $${inst1[0].amount_paid}/$${inst1[0].amount} (${inst1[0].status})`);
  } else {
    throw new Error('Fallo en Abono 1');
  }

  // 4. Simulación de Abono 2 (Multicuota extraordinario de $900)
  process.stdout.write('\n5. Simulando Abono 2 (Multicuota extraordinario de $900.00)... ');
  await queryDatabase(`
    INSERT INTO public.credit_payments (
      credit_id, amount, payment_method, previous_balance, new_balance
    ) VALUES (
      '${testCreditId}', 900.00, 'de_una', 2550.00, 1650.00
    );
  `);

  const { data: state2 } = await queryDatabase(`
    SELECT remaining_balance, status FROM public.credits WHERE id = '${testCreditId}';
  `);
  const { data: inst2 } = await queryDatabase(`
    SELECT installment_number, amount_paid, status 
    FROM public.credit_installments WHERE credit_id = '${testCreditId}' ORDER BY installment_number;
  `);

  if (
    Number(state2[0].remaining_balance) === 1650 &&
    inst2[0].status === 'pagada' &&
    inst2[1].status === 'pagada'
  ) {
    console.log('✓ EXITOSO.');
    console.log(`   → Saldo restante: $${state2[0].remaining_balance} | Cuota 1: ${inst2[0].status} | Cuota 2: ${inst2[1].status}`);
  } else {
    throw new Error('Fallo en Abono 2');
  }

  // 5. Simulación de Abono 3 (Cancelación Total de los $1650 restantes)
  process.stdout.write('\n6. Simulando Abono 3 (Cancelación y Liquidación Total por $1650.00)... ');
  await queryDatabase(`
    INSERT INTO public.credit_payments (
      credit_id, amount, payment_method, previous_balance, new_balance
    ) VALUES (
      '${testCreditId}', 1650.00, 'efectivo', 1650.00, 0.00
    );
  `);

  const { data: state3 } = await queryDatabase(`
    SELECT remaining_balance, status FROM public.credits WHERE id = '${testCreditId}';
  `);
  const { data: inst3 } = await queryDatabase(`
    SELECT count(*) as pagadas FROM public.credit_installments 
    WHERE credit_id = '${testCreditId}' AND status = 'pagada';
  `);

  if (
    Number(state3[0].remaining_balance) === 0 &&
    state3[0].status === 'cancelado' &&
    Number(inst3[0].pagadas) === 5
  ) {
    console.log('✓ EXITOSO.');
    console.log(`   → Saldo restante: $${state3[0].remaining_balance} | Estado: ${state3[0].status.toUpperCase()} | Cuotas pagadas: 5 de 5`);
  } else {
    throw new Error('Fallo en Abono 3');
  }

  // 6. Prueba Matemática Inversa (Conservación de Dinero en la Base de Datos)
  process.stdout.write('\n7. Verificando Invariante de Simetría Inversa en la BD... ');
  const { data: invariantCheck } = await queryDatabase(`
    SELECT 
      c.total_debt,
      c.remaining_balance,
      coalesce(sum(p.amount), 0) as total_abonado,
      (c.remaining_balance + coalesce(sum(p.amount), 0)) as suma_total
    FROM public.credits c
    LEFT JOIN public.credit_payments p ON p.credit_id = c.id
    WHERE c.id = '${testCreditId}'
    GROUP BY c.id;
  `);

  const inv = invariantCheck[0];
  const isInvariantConserved = Number(inv.suma_total) === Number(inv.total_debt);
  if (isInvariantConserved) {
    console.log('✓ CONSERVACIÓN EXACTA AL CENTAVO.');
    console.log(`   → Total Abonado ($${inv.total_abonado}) + Saldo Restante ($${inv.remaining_balance}) === Deuda Total ($${inv.total_debt})`);
  } else {
    throw new Error('Asimetría matemática en la base de datos');
  }

  // 7. Limpieza / Teardown
  console.log('\n8. Limpieza de datos sintéticos de simulación...');
  await queryDatabase(`
    DELETE FROM public.credits WHERE id = '${testCreditId}';
  `);
  console.log('   ✓ Datos temporales eliminados de la base de datos.');

  console.log('\n=============================================================');
  console.log('🏁 RESULTADO: Todas las pruebas en vivo y de reversa pasaron con 0 errores.');
  console.log('=============================================================\n');
}

runDatabaseSimulation();
