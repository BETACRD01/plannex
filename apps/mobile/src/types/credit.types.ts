import type { Credit, CreditInstallment, CreditPayment, Profile } from '@workspace/supabase';

export type { Credit, CreditInstallment, CreditPayment, Profile };

export type PaymentMethod = 'transferencia' | 'deposito' | 'de_una' | 'efectivo';

export interface ConsolidatedMetrics {
  totalFinanced: number;
  totalRemaining: number;
  totalPaid: number;
  monthlyTotal: number;
  hasOverdue: boolean;
  creditsCount: number;
}

export interface CreditDetailData {
  credit: Credit;
  installments: CreditInstallment[];
  payments: CreditPayment[];
}

export interface NewPaymentPayload {
  creditId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  voucherUrl: string | null;
  userNotes?: string;
  adminNotes?: string;
  previousBalance: number;
  newBalance: number;
  createdBy?: string;
}
