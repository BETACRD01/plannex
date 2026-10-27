import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/credit_model.dart';
import '../../data/models/installment_model.dart';
import '../../data/services/payment_service.dart';

class RegisterPaymentSheet extends StatefulWidget {
  final CreditModel credit;
  final InstallmentModel? preselectedInstallment;
  final VoidCallback onSuccess;

  const RegisterPaymentSheet({
    super.key,
    required this.credit,
    this.preselectedInstallment,
    required this.onSuccess,
  });

  @override
  State<RegisterPaymentSheet> createState() => _RegisterPaymentSheetState();
}

class _RegisterPaymentSheetState extends State<RegisterPaymentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _paymentService = PaymentService();
  final _picker = ImagePicker();

  InstallmentModel? _selectedInstallment;
  late TextEditingController _amountController;
  final _referenceController = TextEditingController();
  final _notesController = TextEditingController();

  String _paymentMethod = 'transferencia';
  Uint8List? _voucherBytes;
  String? _voucherExt;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _selectedInstallment = widget.preselectedInstallment ??
        widget.credit.nextPendingInstallment;

    final initialAmount = _selectedInstallment != null
        ? _selectedInstallment!.amount.toStringAsFixed(2)
        : widget.credit.monthlyPayment.toStringAsFixed(2);

    _amountController = TextEditingController(text: initialAmount);
  }

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 85,
      );

      if (file != null) {
        final bytes = await file.readAsBytes();
        final ext = file.name.split('.').last.toLowerCase();
        setState(() {
          _voucherBytes = bytes;
          _voucherExt = ext.isNotEmpty ? ext : 'jpg';
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al capturar comprobante: $e')),
        );
      }
    }
  }

  Future<void> _submitPayment() async {
    if (!_formKey.currentState!.validate()) return;

    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor ingresa un monto válido')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      String? voucherUrl;
      if (_voucherBytes != null && _voucherExt != null) {
        voucherUrl = await _paymentService.uploadVoucher(
          bytes: _voucherBytes!,
          extension: _voucherExt!,
        );
      }

      await _paymentService.registerPayment(
        creditId: widget.credit.id,
        installmentId: _selectedInstallment?.id,
        amount: amount,
        paymentMethod: _paymentMethod,
        referenceCode: _referenceController.text.trim().isNotEmpty
            ? _referenceController.text.trim()
            : null,
        voucherUrl: voucherUrl,
        notes: _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : null,
      );

      if (mounted) {
        Navigator.pop(context);
        widget.onSuccess();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.success,
            content: Text('¡Pago registrado exitosamente!'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.error,
            content: Text('Error al registrar pago: $e'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingInstallments =
        widget.credit.installments.where((i) => !i.isPaid).toList();

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Registrar Pago',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(color: AppTheme.border, height: 20),

              // Installment selection
              const Text(
                'Cuota a abonar',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<InstallmentModel?>(
                initialValue: _selectedInstallment,
                isExpanded: true,
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                items: [
                  ...pendingInstallments.map((inst) {
                    return DropdownMenuItem<InstallmentModel>(
                      value: inst,
                      child: Text(
                        'Cuota #${inst.installmentNumber} - ${Formatters.formatCurrency(inst.amount)} (${Formatters.formatDate(inst.dueDate)})',
                        style: const TextStyle(fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }),
                ],
                onChanged: (val) {
                  setState(() {
                    _selectedInstallment = val;
                    if (val != null) {
                      _amountController.text = val.amount.toStringAsFixed(2);
                    }
                  });
                },
              ),
              if (_selectedInstallment != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.errorLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppTheme.error.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.event_busy, color: AppTheme.error, size: 16),
                      const SizedBox(width: 8),
                      const Text(
                        'Fecha máxima de pago: ',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.error,
                        ),
                      ),
                      Text(
                        Formatters.formatDate(_selectedInstallment!.dueDate),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.error,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Amount
              const Text(
                'Monto a pagar (\$ USD)',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  prefixText: '\$ ',
                  hintText: '0.00',
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Ingresa el monto';
                  }
                  if (double.tryParse(val.trim()) == null) {
                    return 'Monto inválido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Payment Method
              const Text(
                'Método de Pago',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _methodChip('transferencia', 'Transferencia', Icons.swap_horiz_rounded),
                  const SizedBox(width: 8),
                  _methodChip('deposito', 'Depósito', Icons.account_balance_rounded),
                  const SizedBox(width: 8),
                  _methodChip('efectivo', 'Efectivo', Icons.payments_rounded),
                ],
              ),
              const SizedBox(height: 16),

              // Reference
              const Text(
                'Número de Referencia / Comprobante (Opcional)',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _referenceController,
                decoration: const InputDecoration(
                  hintText: 'Ej. REF-98471293',
                ),
              ),
              const SizedBox(height: 16),

              // Voucher attachment
              const Text(
                'Foto del comprobante (Opcional)',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              if (_voucherBytes != null) ...[
                Stack(
                  children: [
                    Container(
                      height: 140,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                        image: DecorationImage(
                          image: MemoryImage(_voucherBytes!),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: GestureDetector(
                        onTap: () => setState(() {
                          _voucherBytes = null;
                          _voucherExt = null;
                        }),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: Colors.black54,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.close,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ] else ...[
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _pickImage(ImageSource.camera),
                        icon: const Icon(Icons.camera_alt_outlined, size: 18),
                        label: const Text('Cámara'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _pickImage(ImageSource.gallery),
                        icon: const Icon(Icons.photo_library_outlined, size: 18),
                        label: const Text('Galería'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 24),

              // Submit button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitPayment,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Confirmar Pago'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _methodChip(String method, String label, IconData icon) {
    final isSelected = _paymentMethod == method;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _paymentMethod = method),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primaryLight : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.primary : AppTheme.border,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
