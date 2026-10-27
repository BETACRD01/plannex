import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/credit_model.dart';
import '../models/installment_model.dart';
import '../models/payment_model.dart';

class CreditService {
  final SupabaseClient _client = Supabase.instance.client;

  Future<List<CreditModel>> fetchCreditsForUser({
    required String userId,
    required String role,
  }) async {
    try {
      dynamic query = _client.from('credits').select('''
        id,
        client_id,
        amount,
        interest_rate,
        monthly_payment,
        total_installments,
        status,
        start_date,
        created_at,
        credit_installments (
          id,
          credit_id,
          installment_number,
          due_date,
          amount,
          capital,
          interest,
          status,
          promotional_payment
        ),
        credit_payments (
          id,
          credit_id,
          installment_id,
          amount,
          payment_method,
          reference_code,
          payment_date,
          voucher_url,
          notes
        )
      ''');

      // If user is a client, filter only their own credits
      if (role == 'cliente') {
        query = query.eq('client_id', userId);
      }

      query = query.order('created_at', ascending: false);

      final List<dynamic> response = await query;

      return response.map((item) {
        final Map<String, dynamic> creditMap = Map<String, dynamic>.from(item);

        final rawInstallments =
            (creditMap['credit_installments'] as List<dynamic>?) ?? [];
        final installments = rawInstallments
            .map((inst) =>
                InstallmentModel.fromJson(Map<String, dynamic>.from(inst)))
            .toList()
          ..sort((a, b) => a.installmentNumber.compareTo(b.installmentNumber));

        final rawPayments =
            (creditMap['credit_payments'] as List<dynamic>?) ?? [];
        final payments = rawPayments
            .map((pay) =>
                PaymentModel.fromJson(Map<String, dynamic>.from(pay)))
            .toList()
          ..sort((a, b) => b.paymentDate.compareTo(a.paymentDate));

        return CreditModel.fromJson(
          creditMap,
          installments: installments,
          payments: payments,
        );
      }).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<CreditModel> fetchCreditDetails(String creditId) async {
    final response = await _client.from('credits').select('''
      id,
      client_id,
      amount,
      interest_rate,
      monthly_payment,
      total_installments,
      status,
      start_date,
      created_at,
      credit_installments (
        id,
        credit_id,
        installment_number,
        due_date,
        amount,
        capital,
        interest,
        status,
        promotional_payment
      ),
      credit_payments (
        id,
        credit_id,
        installment_id,
        amount,
        payment_method,
        reference_code,
        payment_date,
        voucher_url,
        notes
      )
    ''').eq('id', creditId).single();

    final Map<String, dynamic> creditMap = Map<String, dynamic>.from(response);

    final rawInstallments =
        (creditMap['credit_installments'] as List<dynamic>?) ?? [];
    final installments = rawInstallments
        .map((inst) =>
            InstallmentModel.fromJson(Map<String, dynamic>.from(inst)))
        .toList()
      ..sort((a, b) => a.installmentNumber.compareTo(b.installmentNumber));

    final rawPayments = (creditMap['credit_payments'] as List<dynamic>?) ?? [];
    final payments = rawPayments
        .map((pay) => PaymentModel.fromJson(Map<String, dynamic>.from(pay)))
        .toList()
      ..sort((a, b) => b.paymentDate.compareTo(a.paymentDate));

    return CreditModel.fromJson(
      creditMap,
      installments: installments,
      payments: payments,
    );
  }
}
