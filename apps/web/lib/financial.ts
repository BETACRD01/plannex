/**
 * Algoritmo financiero de cálculo de cuotas, amortización y liquidación en cascada.
 * Utilizado por Plannex para garantizar precisión bancaria y conservación del dinero.
 */

export interface FinancingInput {
  totalPrice: number;
  downPayment: number;
  interestRate: number; // Porcentaje de interés (ej: 10 para 10%)
  totalInstallments: number;
  frequency: 'semanal' | 'quincenal' | 'mensual';
  firstDueDate: string;
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amount: number;
}

export interface FinancingCalculation {
  price: number;
  down: number;
  financed: number;
  interestAmount: number;
  totalDebt: number;
  installmentValue: number;
  schedule: InstallmentScheduleItem[];
}

/**
 * Calcula la estructura financiera completa y el cronograma de amortización.
 */
export function calculateFinancing(input: FinancingInput): FinancingCalculation {
  const price = Math.max(0, Number(input.totalPrice) || 0);
  const down = Math.max(0, Number(input.downPayment) || 0);
  const rate = Math.max(0, Number(input.interestRate) || 0);
  const count = Math.max(1, parseInt(String(input.totalInstallments), 10) || 1);

  const financed = Math.max(0, price - down);
  const interestAmount = Number(((financed * rate) / 100).toFixed(2));
  const totalDebt = Number((financed + interestAmount).toFixed(2));

  // Redondeo exacto por cuota a 2 decimales
  const rawInstallment = count > 0 ? totalDebt / count : 0;
  const installmentValue = Number(rawInstallment.toFixed(2));

  // Generar cronograma preliminar
  const schedule: InstallmentScheduleItem[] = [];
  const baseDate = new Date(input.firstDueDate + 'T12:00:00');

  let accumulatedSum = 0;

  for (let i = 1; i <= count; i++) {
    const d = new Date(baseDate);
    if (input.frequency === 'mensual') {
      d.setMonth(d.getMonth() + (i - 1));
    } else if (input.frequency === 'quincenal') {
      d.setDate(d.getDate() + (i - 1) * 15);
    } else if (input.frequency === 'semanal') {
      d.setDate(d.getDate() + (i - 1) * 7);
    }

    let cuotaAmount = installmentValue;
    // Ajuste de centavos en la última cuota para cuadratura perfecta
    if (i === count) {
      cuotaAmount = Number((totalDebt - accumulatedSum).toFixed(2));
    } else {
      accumulatedSum = Number((accumulatedSum + cuotaAmount).toFixed(2));
    }

    schedule.push({
      installmentNumber: i,
      dueDate: d.toISOString().split('T')[0],
      amount: cuotaAmount,
    });
  }

  return {
    price,
    down,
    financed,
    interestAmount,
    totalDebt,
    installmentValue,
    schedule,
  };
}

/**
 * Operación inversa (Reverse Calculation):
 * Dado un valor total de deuda y una tasa de interés, reconstruye el capital financiado original.
 */
export function reverseCalculateCapital(totalDebt: number, interestRate: number, downPayment: number = 0): {
  reconstructedFinanced: number;
  reconstructedPrice: number;
} {
  const rateFactor = 1 + (interestRate / 100);
  const reconstructedFinanced = Number((totalDebt / rateFactor).toFixed(2));
  const reconstructedPrice = Number((reconstructedFinanced + downPayment).toFixed(2));

  return {
    reconstructedFinanced,
    reconstructedPrice,
  };
}

export interface InstallmentState {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  amount_paid: number;
  status: 'pendiente' | 'parcial' | 'pagada' | 'vencida';
  days_overdue: number;
}

export interface PaymentCascadeResult {
  newBalance: number;
  totalPaid: number;
  creditStatus: 'activo' | 'atrasado' | 'cancelado';
  updatedInstallments: InstallmentState[];
}

/**
 * Simula el motor de abonos en cascada (idéntico al trigger PL/pgSQL de PostgreSQL en Supabase).
 */
export function applyPaymentCascade(
  paymentAmount: number,
  installments: InstallmentState[],
  currentBalance: number,
  asOfDate: string = new Date().toISOString().split('T')[0]
): PaymentCascadeResult {
  let remainingPayment = Number(paymentAmount.toFixed(2));
  const updatedInstallments = installments.map(i => ({ ...i }));

  // Ordenar cuotas por número ascendente para respetar la cronología
  updatedInstallments.sort((a, b) => a.installment_number - b.installment_number);

  for (const inst of updatedInstallments) {
    if (remainingPayment <= 0) break;
    if (inst.status === 'pagada') continue;

    const dueNeeded = Number((inst.amount - inst.amount_paid).toFixed(2));

    if (remainingPayment >= dueNeeded) {
      inst.amount_paid = inst.amount;
      inst.status = 'pagada';
      inst.days_overdue = 0;
      remainingPayment = Number((remainingPayment - dueNeeded).toFixed(2));
    } else {
      inst.amount_paid = Number((inst.amount_paid + remainingPayment).toFixed(2));
      inst.status = 'parcial';
      remainingPayment = 0;
    }
  }

  // Recalcular mora en cuotas no pagadas según fecha de corte
  const asOf = new Date(asOfDate + 'T12:00:00');
  let hasOverdue = false;

  for (const inst of updatedInstallments) {
    if (inst.status === 'pagada') continue;

    const dueDate = new Date(inst.due_date + 'T12:00:00');
    const diffDays = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      inst.days_overdue = diffDays;
      inst.status = inst.amount_paid > 0 ? 'parcial' : 'vencida';
      hasOverdue = true;
    } else {
      inst.days_overdue = 0;
      inst.status = inst.amount_paid > 0 ? 'parcial' : 'pendiente';
    }
  }

  const newBalance = Math.max(0, Number((currentBalance - paymentAmount).toFixed(2)));

  let creditStatus: 'activo' | 'atrasado' | 'cancelado' = 'activo';
  if (newBalance <= 0) {
    creditStatus = 'cancelado';
  } else if (hasOverdue) {
    creditStatus = 'atrasado';
  }

  return {
    newBalance,
    totalPaid: paymentAmount,
    creditStatus,
    updatedInstallments,
  };
}
