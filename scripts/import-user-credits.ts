import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://feefwrtilzifxwyacrle.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CUSTOMER = {
  name: 'William David Cerda Aguinda',
  dni: '1501070328',
  phone: '0993148173',
  email: 'wd1501070@gmail.com',
  userId: '1a37c615-d20e-4435-a0d0-ea4a40f14bda',
};

async function uploadFile(localPath: string, storagePath: string, contentType: string): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath);
  const { data, error } = await supabase.storage
    .from('payment-vouchers')
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`Error uploading ${localPath}:`, error);
    throw error;
  }

  const { data: urlData } = supabase.storage.from('payment-vouchers').getPublicUrl(storagePath);
  console.log(`✓ Archivo subido: ${storagePath} -> ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

async function main() {
  console.log('======================================================');
  console.log('🚀 IMPORTANDO CRÉDITOS REALES A SUPABASE DESDE /vb');
  console.log('======================================================\n');

  // 1. Subir archivos a Storage
  const vbDir = '/Users/macbookairm1/Downloads/vb';
  const pdfPichinchaPath = path.join(vbDir, 'TablaAmortizacion_261026_180312.pdf');
  const imgClaroPath = path.join(vbDir, 'WhatsApp Image 2026-10-26 at 18.01.21 (1).jpeg');
  const imgUnicomerTablaPath = path.join(vbDir, 'WhatsApp Image 2026-10-26 at 18.01.21.jpeg');
  const imgArtefactaFacturaPath = path.join(vbDir, 'WhatsApp Image 2026-10-26 at 18.01.21 (2).jpeg');

  const pichinchaDocUrl = await uploadFile(pdfPichinchaPath, 'documentos/TablaAmortizacion_Pichincha_8003701661.pdf', 'application/pdf');
  const claroDocUrl = await uploadFile(imgClaroPath, 'documentos/Solicitud_Claro_HonorX8b.jpeg', 'image/jpeg');
  const unicomerTablaDocUrl = await uploadFile(imgUnicomerTablaPath, 'documentos/Tabla_Unicomer_Moto_DY250.jpeg', 'image/jpeg');
  const artefactaFacturaDocUrl = await uploadFile(imgArtefactaFacturaPath, 'documentos/Factura_Artefacta_Moto_DY250.jpeg', 'image/jpeg');

  // ----------------------------------------------------------------------------------
  // 2. CRÉDITO 1: CELULAR CLARO (Honor X8b 256GB - $43.30 mensual)
  // ----------------------------------------------------------------------------------
  console.log('\n--- 1. Insertando Crédito Celular Claro (Honor X8b) ---');
  const phoneTotalDebt = +(43.30 * 18).toFixed(2); // $779.40
  const phoneCreditId = '11111111-2222-4444-8888-000000000001';

  // Limpiar si ya existiera
  await supabase.from('credit_installments').delete().eq('credit_id', phoneCreditId);
  await supabase.from('credits').delete().eq('id', phoneCreditId);

  const { error: phoneErr } = await supabase.from('credits').insert({
    id: phoneCreditId,
    customer_name: CUSTOMER.name,
    customer_dni: CUSTOMER.dni,
    customer_phone: CUSTOMER.phone,
    customer_email: CUSTOMER.email,
    customer_user_id: CUSTOMER.userId,
    customer_address: 'CAC Tena, Napo',
    item_description: 'Celular Honor X8b 256GB + Plan Claro',
    item_category: 'telefonia',
    item_identifier: 'Trámite: 20004832504 / Solicitud: 12019947832',
    total_price: phoneTotalDebt,
    down_payment: 0,
    financed_amount: phoneTotalDebt,
    interest_rate: 0,
    total_debt: phoneTotalDebt,
    remaining_balance: phoneTotalDebt,
    total_installments: 18,
    installment_amount: 43.30,
    frequency: 'mensual',
    start_date: '2026-07-22',
    first_due_date: '2026-08-22',
    status: 'activo',
    notes: `Celular Honor X8b 256GB (Claro Ecuador). Pago mensual de $43.30 ($27.21 financiamiento equipo + plan). Documento adjunto: ${claroDocUrl}`,
  });

  if (phoneErr) console.error('Error insertando crédito celular:', phoneErr);
  else console.log('✓ Crédito Celular Claro creado con ID:', phoneCreditId);

  // Cuotas Celular (18 cuotas, día 22 de cada mes)
  const phoneInstallments = [];
  let pDate = new Date(2026, 7, 22); // Agosto 2026
  for (let i = 1; i <= 18; i++) {
    const year = pDate.getFullYear();
    const month = String(pDate.getMonth() + 1).padStart(2, '0');
    const day = String(pDate.getDate()).padStart(2, '0');
    const dueDateStr = `${year}-${month}-${day}`;

    phoneInstallments.push({
      credit_id: phoneCreditId,
      installment_number: i,
      due_date: dueDateStr,
      amount: 43.30,
      amount_paid: 0,
      status: dueDateStr < '2026-10-26' ? 'vencida' : 'pendiente',
      days_overdue: dueDateStr < '2026-10-26' ? Math.floor((new Date('2026-10-26').getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    });

    pDate = new Date(pDate.getFullYear(), pDate.getMonth() + 1, 22);
  }

  const { error: pInstErr } = await supabase.from('credit_installments').insert(phoneInstallments);
  if (pInstErr) console.error('Error insertando cuotas celular:', pInstErr);
  else console.log(`✓ ${phoneInstallments.length} cuotas insertadas para Celular Claro.`);

  // ----------------------------------------------------------------------------------
  // 3. CRÉDITO 2: MOTO DAYTONA DY250 GP-1 R (Artefacta / Unicomer)
  // ----------------------------------------------------------------------------------
  console.log('\n--- 2. Insertando Crédito Moto Daytona (Artefacta - Unicomer) ---');
  const motoTotalDebt = 6916.10;
  const motoPrice = 5180.96;
  const motoCreditId = '11111111-2222-4444-8888-000000000002';

  await supabase.from('credit_installments').delete().eq('credit_id', motoCreditId);
  await supabase.from('credits').delete().eq('id', motoCreditId);

  const { error: motoErr } = await supabase.from('credits').insert({
    id: motoCreditId,
    customer_name: CUSTOMER.name,
    customer_dni: CUSTOMER.dni,
    customer_phone: CUSTOMER.phone,
    customer_email: CUSTOMER.email,
    customer_user_id: CUSTOMER.userId,
    customer_address: 'Sector Guamaní Calle S57 y Av. Pedro Vicente Maldonado, Quito',
    item_description: 'Moto DY250 GP-1 R Plateado Daytona 2027 + Casco + Licuadora',
    item_category: 'vehiculo',
    item_identifier: 'Chasis: LMHPDN119V0H58183 / Motor: 171FMM26058124 / Factura: 151-041-000002562',
    total_price: motoPrice,
    down_payment: 0,
    financed_amount: motoPrice,
    interest_rate: 16.77,
    total_debt: motoTotalDebt,
    remaining_balance: motoTotalDebt,
    total_installments: 46,
    installment_amount: 150.35,
    frequency: 'mensual',
    start_date: '2026-09-04',
    first_due_date: '2026-10-25',
    status: 'activo',
    notes: `Artefacta - Unicomer de Ecuador S.A. Código crédito: 1096800494819. Cuota base $150.35 + $1.86 seguros = $152.21 mensual. Factura: ${artefactaFacturaDocUrl} | Tabla: ${unicomerTablaDocUrl}`,
  });

  if (motoErr) console.error('Error insertando crédito moto:', motoErr);
  else console.log('✓ Crédito Moto Daytona creado con ID:', motoCreditId);

  // Cuotas Moto (46 cuotas, día 25 de cada mes)
  const motoInstallments = [];
  let mDate = new Date(2026, 9, 25); // 25 Octubre 2026
  for (let i = 1; i <= 46; i++) {
    const year = mDate.getFullYear();
    const month = String(mDate.getMonth() + 1).padStart(2, '0');
    const day = String(mDate.getDate()).padStart(2, '0');
    const dueDateStr = `${year}-${month}-${day}`;

    motoInstallments.push({
      credit_id: motoCreditId,
      installment_number: i,
      due_date: dueDateStr,
      amount: 150.35,
      amount_paid: 0,
      status: dueDateStr < '2026-10-26' ? 'vencida' : 'pendiente',
      days_overdue: dueDateStr < '2026-10-26' ? Math.floor((new Date('2026-10-26').getTime() - mDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    });

    mDate = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 25);
  }

  const { error: mInstErr } = await supabase.from('credit_installments').insert(motoInstallments);
  if (mInstErr) console.error('Error insertando cuotas moto:', mInstErr);
  else console.log(`✓ ${motoInstallments.length} cuotas insertadas para Moto Daytona.`);

  // ----------------------------------------------------------------------------------
  // 4. CRÉDITO 3: PRÉSTAMO MICROEMPRESA (Banco Pichincha)
  // ----------------------------------------------------------------------------------
  console.log('\n--- 3. Insertando Préstamo Microempresa (Banco Pichincha) ---');
  const pichinchaCapital = 3000.00;
  const pichinchaTotalDebt = 4134.70; // 3000 capital + 1063.19 int + 71.51 seg
  const pichinchaCreditId = '11111111-2222-4444-8888-000000000003';

  await supabase.from('credit_installments').delete().eq('credit_id', pichinchaCreditId);
  await supabase.from('credits').delete().eq('id', pichinchaCreditId);

  const { error: pichErr } = await supabase.from('credits').insert({
    id: pichinchaCreditId,
    customer_name: CUSTOMER.name,
    customer_dni: CUSTOMER.dni,
    customer_phone: CUSTOMER.phone,
    customer_email: CUSTOMER.email,
    customer_user_id: CUSTOMER.userId,
    customer_address: 'Quito / Napo, Ecuador',
    item_description: 'Préstamo GAF Microempresa Banco Pichincha',
    item_category: 'prestamo',
    item_identifier: 'Operación: 8003701661',
    total_price: pichinchaCapital,
    down_payment: 0,
    financed_amount: pichinchaCapital,
    interest_rate: 25.12,
    total_debt: pichinchaTotalDebt,
    remaining_balance: pichinchaTotalDebt,
    total_installments: 30,
    installment_amount: 138.88,
    frequency: 'mensual',
    start_date: '2026-11-01',
    first_due_date: '2026-11-01',
    status: 'activo',
    notes: `Banco Pichincha - Operación 8003701661. Tasa 25.12%. Capital: $3,000.00, Intereses: $1,063.19, Seguros: $71.51. Tabla oficial adjunta: ${pichinchaDocUrl}`,
  });

  if (pichErr) console.error('Error insertando crédito Pichincha:', pichErr);
  else console.log('✓ Préstamo Banco Pichincha creado con ID:', pichinchaCreditId);

  // Cuotas Banco Pichincha (30 cuotas exactas de la tabla oficial)
  // Cuota 1: $105.37 (2026-11-01)
  // Cuotas 2 a 29: $138.88
  // Cuota 30: $140.69 (2029-04-01)
  const pichinchaInstallments = [];
  let bpDate = new Date(2026, 10, 1); // 1 Noviembre 2026
  for (let i = 1; i <= 30; i++) {
    const year = bpDate.getFullYear();
    const month = String(bpDate.getMonth() + 1).padStart(2, '0');
    const day = String(bpDate.getDate()).padStart(2, '0');
    const dueDateStr = `${year}-${month}-${day}`;

    let amount = 138.88;
    if (i === 1) amount = 105.37;
    if (i === 30) amount = 140.69;

    pichinchaInstallments.push({
      credit_id: pichinchaCreditId,
      installment_number: i,
      due_date: dueDateStr,
      amount,
      amount_paid: 0,
      status: 'pendiente',
      days_overdue: 0,
    });

    bpDate = new Date(bpDate.getFullYear(), bpDate.getMonth() + 1, 1);
  }

  const { error: bpInstErr } = await supabase.from('credit_installments').insert(pichinchaInstallments);
  if (bpInstErr) console.error('Error insertando cuotas Pichincha:', bpInstErr);
  else console.log(`✓ ${pichinchaInstallments.length} cuotas insertadas para Banco Pichincha.`);

  console.log('\n======================================================');
  console.log('🎉 ¡TODOS LOS CRÉDITOS Y DOCUMENTOS FUERON IMPORTADOS!');
  console.log('======================================================');
}

main().catch(console.error);
