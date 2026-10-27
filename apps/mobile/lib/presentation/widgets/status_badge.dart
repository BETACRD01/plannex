import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final bool isPromotional;

  const StatusBadge({
    super.key,
    required this.status,
    this.isPromotional = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isPromotional) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.purple.shade50,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.purple.shade200),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.star, size: 12, color: Colors.purple.shade700),
            const SizedBox(width: 4),
            Text(
              'Promoción',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Colors.purple.shade700,
              ),
            ),
          ],
        ),
      );
    }

    Color bgColor;
    Color textColor;
    String label;

    switch (status.toLowerCase()) {
      case 'active':
        bgColor = AppTheme.successLight;
        textColor = AppTheme.success;
        label = 'Activo';
        break;
      case 'paid':
        bgColor = AppTheme.successLight;
        textColor = AppTheme.success;
        label = 'Pagado';
        break;
      case 'pending':
        bgColor = AppTheme.warningLight;
        textColor = AppTheme.warning;
        label = 'Pendiente';
        break;
      case 'overdue':
        bgColor = AppTheme.errorLight;
        textColor = AppTheme.error;
        label = 'Vencido';
        break;
      case 'partially_paid':
        bgColor = Colors.blue.shade50;
        textColor = Colors.blue.shade700;
        label = 'Pago Parcial';
        break;
      default:
        bgColor = Colors.grey.shade100;
        textColor = AppTheme.textSecondary;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: textColor,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
