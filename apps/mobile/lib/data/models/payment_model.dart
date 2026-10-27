class PaymentModel {
  final String id;
  final String creditId;
  final String? installmentId;
  final double amount;
  final String paymentMethod;
  final String? referenceCode;
  final String paymentDate;
  final String? voucherUrl;
  final String? notes;

  PaymentModel({
    required this.id,
    required this.creditId,
    this.installmentId,
    required this.amount,
    required this.paymentMethod,
    this.referenceCode,
    required this.paymentDate,
    this.voucherUrl,
    this.notes,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id']?.toString() ?? '',
      creditId: json['credit_id']?.toString() ?? '',
      installmentId: json['installment_id']?.toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['payment_method']?.toString() ?? 'transferencia',
      referenceCode: json['reference_code']?.toString(),
      paymentDate: json['payment_date']?.toString() ?? '',
      voucherUrl: json['voucher_url']?.toString(),
      notes: json['notes']?.toString(),
    );
  }
}
