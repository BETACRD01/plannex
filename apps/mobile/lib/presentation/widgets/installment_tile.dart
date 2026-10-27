import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/installment_model.dart';
import 'status_badge.dart';

class InstallmentTile extends StatelessWidget {
  final InstallmentModel installment;
  final VoidCallback? onPay;

  const InstallmentTile({
    super.key,
    required this.installment,
    this.onPay,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: installment.isPaid
            ? Colors.grey.shade50
            : (installment.isOverdue ? AppTheme.errorLight.withValues(alpha: 0.4) : Colors.white),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: installment.isOverdue ? AppTheme.error.withValues(alpha: 0.3) : AppTheme.border,
        ),
      ),
      child: Row(
        children: [
          // Cuota number circle
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: installment.isPaid
                  ? AppTheme.successLight
                  : (installment.isOverdue ? AppTheme.errorLight : AppTheme.primaryLight),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              '#${installment.installmentNumber}',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: installment.isPaid
                    ? AppTheme.success
                    : (installment.isOverdue ? AppTheme.error : AppTheme.primary),
              ),
            ),
          ),
          const SizedBox(width: 14),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      Formatters.formatCurrency(installment.amount),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: installment.isPaid
                            ? AppTheme.textSecondary
                            : AppTheme.textPrimary,
                        decoration: installment.isPaid
                            ? TextDecoration.lineThrough
                            : null,
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (installment.promotionalPayment)
                      const StatusBadge(status: '', isPromotional: true)
                    else
                      StatusBadge(status: installment.status),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Vence: ${Formatters.formatDate(installment.dueDate)}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),

          // Action button if not paid
          if (!installment.isPaid && onPay != null)
            ElevatedButton(
              onPressed: onPay,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                visualDensity: VisualDensity.compact,
              ),
              child: const Text(
                'Pagar',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            )
          else if (installment.isPaid)
            const Icon(
              Icons.check_circle_rounded,
              color: AppTheme.success,
              size: 22,
            ),
        ],
      ),
    );
  }
}
