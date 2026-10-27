import 'installment_model.dart';
import 'payment_model.dart';

class CreditModel {
  final String id;
  final String clientId;
  final double amount;
  final double interestRate;
  final double monthlyPayment;
  final int totalInstallments;
  final String status; // 'active', 'completed', 'overdue', 'pending_approval'
  final String? startDate;
  final String? createdAt;
  final List<InstallmentModel> installments;
  final List<PaymentModel> payments;

  CreditModel({
    required this.id,
    required this.clientId,
    required this.amount,
    required this.interestRate,
    required this.monthlyPayment,
    required this.totalInstallments,
    required this.status,
    this.startDate,
    this.createdAt,
    this.installments = const [],
    this.payments = const [],
  });

  factory CreditModel.fromJson(
    Map<String, dynamic> json, {
    List<InstallmentModel> installments = const [],
    List<PaymentModel> payments = const [],
  }) {
    return CreditModel(
      id: json['id']?.toString() ?? '',
      clientId: json['client_id']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      interestRate: (json['interest_rate'] as num?)?.toDouble() ?? 0.0,
      monthlyPayment: (json['monthly_payment'] as num?)?.toDouble() ?? 0.0,
      totalInstallments: (json['total_installments'] as num?)?.toInt() ?? 0,
      status: json['status']?.toString() ?? 'active',
      startDate: json['start_date']?.toString(),
      createdAt: json['created_at']?.toString(),
      installments: installments,
      payments: payments,
    );
  }

  // Calculated properties
  int get paidInstallmentsCount =>
      installments.where((i) => i.isPaid).length;

  int get pendingInstallmentsCount =>
      installments.where((i) => !i.isPaid).length;

  double get totalPaidAmount =>
      payments.fold(0.0, (sum, p) => sum + p.amount);

  double get pendingBalance {
    final pendingSum = installments
        .where((i) => !i.isPaid)
        .fold(0.0, (sum, i) => sum + i.amount);
    return pendingSum > 0 ? pendingSum : (amount - totalPaidAmount);
  }

  double get progressPercentage {
    if (totalInstallments == 0) return 0.0;
    return (paidInstallmentsCount / totalInstallments).clamp(0.0, 1.0);
  }

  InstallmentModel? get nextPendingInstallment {
    try {
      return installments.firstWhere((i) => !i.isPaid);
    } catch (_) {
      return null;
    }
  }
}
