class InstallmentModel {
  final String id;
  final String creditId;
  final int installmentNumber;
  final String dueDate;
  final double amount;
  final double capital;
  final double interest;
  final String status; // 'pending', 'paid', 'overdue', 'partially_paid'
  final bool promotionalPayment;

  InstallmentModel({
    required this.id,
    required this.creditId,
    required this.installmentNumber,
    required this.dueDate,
    required this.amount,
    required this.capital,
    required this.interest,
    required this.status,
    required this.promotionalPayment,
  });

  factory InstallmentModel.fromJson(Map<String, dynamic> json) {
    return InstallmentModel(
      id: json['id']?.toString() ?? '',
      creditId: json['credit_id']?.toString() ?? '',
      installmentNumber: (json['installment_number'] as num?)?.toInt() ?? 0,
      dueDate: json['due_date']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      capital: (json['capital'] as num?)?.toDouble() ?? 0.0,
      interest: (json['interest'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? 'pending',
      promotionalPayment: json['promotional_payment'] == true,
    );
  }

  bool get isPaid => status == 'paid';
  bool get isOverdue => status == 'overdue';
  bool get isPending => status == 'pending';
}
