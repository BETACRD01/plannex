import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFinancing,
  reverseCalculateCapital,
  applyPaymentCascade,
} from '../apps/web/lib/financial.ts';
import type {
  InstallmentState,
  FinancingInput,
} from '../apps/web/lib/financial.ts';

describe('1. Algoritmo de Cálculo de Financiamiento (Directo & Reversa)', () => {
  it('Debe calcular correctamente el financiamiento de una Moto (Precio $2400, Entrada $400, Interés 10%, 12 meses)', () => {
    const input: FinancingInput = {
      totalPrice: 2400,
      downPayment: 400,
      interestRate: 10,
      totalInstallments: 12,
      frequency: 'mensual',
      firstDueDate: '2026-11-26',
    };

    const result = calculateFinancing(input);

    assert.equal(result.price, 2400);
    assert.equal(result.down, 400);
    assert.equal(result.financed, 2000);
    assert.equal(result.interestAmount, 200); // 10% de $2000 = $200
    assert.equal(result.totalDebt, 2200); // $2000 + $200 = $2200
    assert.equal(result.schedule.length, 12);

    // Invariante de conservación de dinero: la suma de todas las cuotas debe ser idéntica a la deuda total al centavo
    const sumCuotas = Number(
      result.schedule.reduce((acc, c) => acc + c.amount, 0).toFixed(2)
    );
    assert.equal(sumCuotas, result.totalDebt, 'La suma de las cuotas no coincide con la deuda total');

    // Test a la Reversa: reconstrucción de capital desde la deuda total
    const reverse = reverseCalculateCapital(result.totalDebt, 10, 400);
    assert.equal(reverse.reconstructedFinanced, 2000);
    assert.equal(reverse.reconstructedPrice, 2400);
  });

  it('Debe calcular correctamente un Celular sin intereses (Precio $1200, Entrada $0, Interés 0%, 24 quincenas)', () => {
    const input: FinancingInput = {
      totalPrice: 1200,
      downPayment: 0,
      interestRate: 0,
      totalInstallments: 24,
      frequency: 'quincenal',
      firstDueDate: '2026-11-01',
    };

    const result = calculateFinancing(input);

    assert.equal(result.financed, 1200);
    assert.equal(result.interestAmount, 0);
    assert.equal(result.totalDebt, 1200);
    assert.equal(result.installmentValue, 50); // $1200 / 24 = $50.00
    assert.equal(result.schedule.length, 24);

    const sumCuotas = Number(
      result.schedule.reduce((acc, c) => acc + c.amount, 0).toFixed(2)
    );
    assert.equal(sumCuotas, 1200);
  });

  it('Debe ajustar centavos en cuotas con decimales periódicos ($1000 en 3 cuotas = 333.33 + 333.33 + 333.34)', () => {
    const input: FinancingInput = {
      totalPrice: 1000,
      downPayment: 0,
      interestRate: 0,
      totalInstallments: 3,
      frequency: 'mensual',
      firstDueDate: '2026-11-01',
    };

    const result = calculateFinancing(input);

    assert.equal(result.schedule[0].amount, 333.33);
    assert.equal(result.schedule[1].amount, 333.33);
    assert.equal(result.schedule[2].amount, 333.34); // Centavo de cuadratura

    const sum = Number(
      result.schedule.reduce((acc, c) => acc + c.amount, 0).toFixed(2)
    );
    assert.equal(sum, 1000.0, 'No hubo cuadratura perfecta de centavos');
  });
});

describe('2. Motor de Cascada de Pagos y Amortización', () => {
  const initialInstallments: InstallmentState[] = [
    { id: '1', installment_number: 1, due_date: '2026-10-01', amount: 100, amount_paid: 0, status: 'pendiente', days_overdue: 0 },
    { id: '2', installment_number: 2, due_date: '2026-11-01', amount: 100, amount_paid: 0, status: 'pendiente', days_overdue: 0 },
    { id: '3', installment_number: 3, due_date: '2026-12-01', amount: 100, amount_paid: 0, status: 'pendiente', days_overdue: 0 },
  ];

  it('Pago parcial: un abono de $50 debe cubrir la mitad de la cuota 1', () => {
    const res = applyPaymentCascade(50, initialInstallments, 300, '2026-09-15');

    assert.equal(res.newBalance, 250);
    assert.equal(res.updatedInstallments[0].amount_paid, 50);
    assert.equal(res.updatedInstallments[0].status, 'parcial');
    assert.equal(res.updatedInstallments[1].amount_paid, 0);
    assert.equal(res.updatedInstallments[1].status, 'pendiente');
    assert.equal(res.creditStatus, 'activo');
  });

  it('Pago multicuota extraordinario: un abono de $250 debe liquidar cuota 1, cuota 2 y dejar cuota 3 en parcial $50', () => {
    const res = applyPaymentCascade(250, initialInstallments, 300, '2026-09-15');

    assert.equal(res.newBalance, 50);
    assert.equal(res.updatedInstallments[0].status, 'pagada');
    assert.equal(res.updatedInstallments[0].amount_paid, 100);
    assert.equal(res.updatedInstallments[1].status, 'pagada');
    assert.equal(res.updatedInstallments[1].amount_paid, 100);
    assert.equal(res.updatedInstallments[2].status, 'parcial');
    assert.equal(res.updatedInstallments[2].amount_paid, 50);
    assert.equal(res.creditStatus, 'activo');
  });

  it('Cancelación total: cuando el saldo llega a 0, todas las cuotas quedan pagadas y estado cancelado', () => {
    const res = applyPaymentCascade(300, initialInstallments, 300, '2026-09-15');

    assert.equal(res.newBalance, 0);
    assert.equal(res.creditStatus, 'cancelado');
    assert.ok(res.updatedInstallments.every((i) => i.status === 'pagada'));
  });

  it('Detección automática de mora: si la fecha supera el vencimiento, la cuota pasa a vencida y calcula días de atraso', () => {
    // Corte al 2026-10-15 (cuota 1 venció el 2026-10-01 = 14 días de atraso)
    const res = applyPaymentCascade(0, initialInstallments, 300, '2026-10-15');

    assert.equal(res.updatedInstallments[0].status, 'vencida');
    assert.equal(res.updatedInstallments[0].days_overdue, 14);
    assert.equal(res.updatedInstallments[1].status, 'pendiente'); // Vence en noviembre
    assert.equal(res.creditStatus, 'atrasado');
  });
});

describe('3. Invariantes de Reversibilidad y Propiedades Matemáticas (Stress)', () => {
  it('Simulación de 100 créditos aleatorios: en todos los casos la suma de cuotas cuadra exactamente con totalDebt', () => {
    for (let i = 0; i < 100; i++) {
      const price = Math.floor(Math.random() * 5000) + 100;
      const down = Math.floor(Math.random() * (price * 0.4));
      const rate = Math.floor(Math.random() * 30);
      const installments = Math.floor(Math.random() * 36) + 1;

      const calc = calculateFinancing({
        totalPrice: price,
        downPayment: down,
        interestRate: rate,
        totalInstallments: installments,
        frequency: 'mensual',
        firstDueDate: '2026-11-01',
      });

      const sumSchedule = Number(
        calc.schedule.reduce((sum, c) => sum + c.amount, 0).toFixed(2)
      );

      assert.equal(
        sumSchedule,
        calc.totalDebt,
        `Falla de cuadratura en simulación #${i}: sum=${sumSchedule}, totalDebt=${calc.totalDebt}`
      );
    }
  });
});
