import { supabase } from '../../lib/supabase';
import { base64ToUint8Array } from '../utils/image';
import type { NewPaymentPayload } from '../types/credit.types';

export async function uploadPaymentVoucher(
  creditId: string,
  base64Data: string,
  fileNameOriginal?: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const fileExt = fileNameOriginal?.split('.').pop() || 'jpg';
  const filePath = `creditos/${creditId}/${Date.now()}_movil.${fileExt}`;
  const fileBytes = base64ToUint8Array(base64Data);

  const { data, error } = await supabase.storage
    .from('payment-vouchers')
    .upload(filePath, fileBytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error('Error al subir el comprobante a la nube: ' + error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from('payment-vouchers')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function submitCreditPayment(payload: NewPaymentPayload) {
  const { error } = await supabase.from('credit_payments').insert({
    credit_id: payload.creditId,
    amount: payload.amount,
    payment_method: payload.paymentMethod,
    payment_date: payload.paymentDate,
    previous_balance: payload.previousBalance,
    new_balance: payload.newBalance,
    voucher_url: payload.voucherUrl,
    user_notes: payload.userNotes || 'Pago reportado desde Plannex Móvil',
    admin_notes: payload.adminNotes,
    created_by: payload.createdBy || null,
  });

  if (error) {
    throw new Error('Error al registrar el pago: ' + error.message);
  }
}
