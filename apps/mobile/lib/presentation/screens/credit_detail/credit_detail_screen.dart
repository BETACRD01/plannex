import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/credit_model.dart';
import '../../../data/models/installment_model.dart';
import '../../../data/services/credit_service.dart';
import '../../widgets/installment_tile.dart';
import '../../widgets/payment_tile.dart';
import '../../widgets/register_payment_sheet.dart';
import '../../widgets/status_badge.dart';

class CreditDetailScreen extends StatefulWidget {
  final String creditId;
  final VoidCallback onCreditUpdated;

  const CreditDetailScreen({
    super.key,
    required this.creditId,
    required this.onCreditUpdated,
  });

  @override
  State<CreditDetailScreen> createState() => _CreditDetailScreenState();
}

class _CreditDetailScreenState extends State<CreditDetailScreen>
    with SingleTickerProviderStateMixin {
  final _creditService = CreditService();

  CreditModel? _credit;
  bool _isLoading = true;
  String? _errorMessage;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadDetails();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final credit = await _creditService.fetchCreditDetails(widget.creditId);
      setState(() {
        _credit = credit;
      });
      widget.onCreditUpdated();
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al cargar detalles: $e';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _openPaymentSheet([InstallmentModel? installment]) {
    if (_credit == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RegisterPaymentSheet(
        credit: _credit!,
        preselectedInstallment: installment,
        onSuccess: _loadDetails,
      ),
    );
  }

  void _viewVoucher(String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            InteractiveViewer(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  url,
                  fit: BoxFit.contain,
                  loadingBuilder: (_, child, progress) {
                    if (progress == null) return child;
                    return const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) => Container(
                    padding: const EdgeInsets.all(32),
                    color: Colors.white,
                    child: const Text('No se pudo cargar la imagen del comprobante'),
                  ),
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(
          _credit != null
              ? 'Crédito #${_credit!.id.substring(0, 8).toUpperCase()}'
              : 'Detalle del Crédito',
        ),
        actions: [
          if (_credit != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: StatusBadge(status: _credit!.status),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            )
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_errorMessage!),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _loadDetails,
                        child: const Text('Reintentar'),
                      ),
                    ],
                  ),
                )
              : _credit == null
                  ? const Center(child: Text('Crédito no encontrado'))
                  : Column(
                      children: [
                        _buildOverviewCard(),
                        _buildNextInstallmentBanner(),
                        Container(
                          color: Colors.white,
                          child: TabBar(
                            controller: _tabController,
                            labelColor: AppTheme.primary,
                            unselectedLabelColor: AppTheme.textSecondary,
                            indicatorColor: AppTheme.primary,
                            indicatorWeight: 3,
                            labelStyle: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                            tabs: [
                              Tab(
                                text:
                                    'Tabla de Amortización (${_credit!.installments.length})',
                              ),
                              Tab(
                                text:
                                    'Historial de Pagos (${_credit!.payments.length})',
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: TabBarView(
                            controller: _tabController,
                            children: [
                              _buildInstallmentsTab(),
                              _buildPaymentsTab(),
                            ],
                          ),
                        ),
                      ],
                    ),
      floatingActionButton: _credit != null &&
              _credit!.nextPendingInstallment != null
          ? FloatingActionButton.extended(
              onPressed: () => _openPaymentSheet(),
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add_card_rounded),
              label: const Text(
                'Registrar Pago',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            )
          : null,
    );
  }

  Widget _buildOverviewCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      color: Colors.white,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _overviewItem('Monto Total', Formatters.formatCurrency(_credit!.amount)),
              _overviewItem('Saldo Restante',
                  Formatters.formatCurrency(_credit!.pendingBalance),
                  isPrimary: true),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(color: AppTheme.border, height: 1),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _overviewItem('Cuota Mensual',
                  Formatters.formatCurrency(_credit!.monthlyPayment)),
              _overviewItem('Tasa de Interés', '${_credit!.interestRate}%'),
              _overviewItem(
                'Plazo',
                '${_credit!.paidInstallmentsCount}/${_credit!.totalInstallments} cuotas',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _overviewItem(String label, String value, {bool isPrimary = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppTheme.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            fontSize: isPrimary ? 20 : 16,
            fontWeight: FontWeight.w800,
            color: isPrimary ? AppTheme.primary : AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildNextInstallmentBanner() {
    final nextInst = _credit!.nextPendingInstallment;
    if (nextInst == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.primaryLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.alarm_rounded,
                      size: 16, color: AppTheme.primary),
                  const SizedBox(width: 6),
                  Text(
                    'Próxima Cuota #${nextInst.installmentNumber}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                'Vence: ${Formatters.formatDate(nextInst.dueDate)} • ${Formatters.formatCurrency(nextInst.amount)}',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          ElevatedButton(
            onPressed: () => _openPaymentSheet(nextInst),
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
              'Abonar',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstallmentsTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _credit!.installments.length,
      itemBuilder: (_, index) {
        final inst = _credit!.installments[index];
        return InstallmentTile(
          installment: inst,
          onPay: () => _openPaymentSheet(inst),
        );
      },
    );
  }

  Widget _buildPaymentsTab() {
    if (_credit!.payments.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.history_rounded, size: 48, color: AppTheme.textMuted),
              SizedBox(height: 12),
              Text(
                'Aún no se han registrado pagos para este crédito',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _credit!.payments.length,
      itemBuilder: (_, index) {
        final payment = _credit!.payments[index];
        return PaymentTile(
          payment: payment,
          onViewVoucher: payment.voucherUrl != null
              ? () => _viewVoucher(payment.voucherUrl!)
              : null,
        );
      },
    );
  }
}
