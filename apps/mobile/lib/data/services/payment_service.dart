import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';

class PaymentService {
  final SupabaseClient _client = Supabase.instance.client;

  Future<String?> uploadVoucher({
    required Uint8List bytes,
    required String extension,
  }) async {
    try {
      final fileName =
          'voucher_${DateTime.now().millisecondsSinceEpoch}.$extension';
      final path = 'payments/$fileName';

      await _client.storage.from('vouchers').uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(
              contentType: 'image/$extension',
              upsert: true,
            ),
          );

      return _client.storage.from('vouchers').getPublicUrl(path);
    } catch (_) {
      // If upload fails, continue without voucher or throw
      return null;
    }
  }

  Future<void> registerPayment({
    required String creditId,
    String? installmentId,
    required double amount,
    required String paymentMethod,
    String? referenceCode,
    String? voucherUrl,
    String? notes,
  }) async {
    final now = DateTime.now().toIso8601String();

    await _client.from('credit_payments').insert({
      'credit_id': creditId,
      'installment_id': installmentId,
      'amount': amount,
      'payment_method': paymentMethod,
      'reference_code': referenceCode,
      'voucher_url': voucherUrl,
      'notes': notes,
      'payment_date': now,
    });

    // Mark installment as paid if applicable
    if (installmentId != null && installmentId.isNotEmpty) {
      await _client.from('credit_installments').update({
        'status': 'paid',
      }).eq('id', installmentId);
    }
  }
}
