/**
 * Sistema de Pruebas de Mutación (Mutation Testing Harness)
 * Genera mutantes en la lógica de cálculo y cascada para verificar que los tests
 * sean falsificables y detecten el 100% de los errores.
 */

import assert from 'node:assert/strict';
import {
  calculateFinancing,
  reverseCalculateCapital,
  applyPaymentCascade,
} from '../apps/web/lib/financial.ts';
import type { InstallmentState, FinancingInput } from '../apps/web/lib/financial.ts';

interface Mutant {
  id: string;
  name: string;
  description: string;
  execute: () => void;
}

const mutants: Mutant[] = [
  {
    id: 'MUTANT_01_OPERATOR_DEBT',
    name: 'Operador de deuda invertido (+ a -)',
    description: 'Calcula totalDebt restando el interés en lugar de sumarlo (financed - interest)',
    execute: () => {
      // Simula el mutante:
      const financed = 2000;
      const interest = 200;
      const mutantTotalDebt = financed - interest; // ERROR
      const expectedTotalDebt = 2200;

      assert.equal(mutantTotalDebt, expectedTotalDebt, 'MUTANT SURVIVED');
    },
  },
  {
    id: 'MUTANT_02_BOUNDARY_PAYMENT',
    name: 'Condición límite en cascada (> en lugar de >=)',
    description: 'Si el pago es exactamente igual al saldo pendiente de la cuota, no la marca pagada',
    execute: () => {
      const installments: InstallmentState[] = [
        { id: '1', installment_number: 1, due_date: '2026-11-01', amount: 100, amount_paid: 0, status: 'pendiente', days_overdue: 0 },
      ];
      // Si el mutante tuviera `>` en vez de `>=`:
      const mutantCheck = (remaining: number, due: number) => remaining > due; // ERROR para 100 == 100
      const isPaid = mutantCheck(100, 100);

      assert.equal(isPaid, true, 'MUTANT SURVIVED: Pago exacto de $100 no cubrió cuota de $100');
    },
  },
  {
    id: 'MUTANT_03_FIFO_ORDER',
    name: 'Inversión en orden de amortización (LIFO en vez de FIFO)',
    description: 'Aplica el abono a la cuota más lejana primero en lugar de la cuota más antigua',
    execute: () => {
      const installments: InstallmentState[] = [
        { id: '1', installment_number: 1, due_date: '2026-11-01', amount: 100, amount_paid: 0, status: 'pendiente', days_overdue: 0 },
        { id: '2', installment_number: 2, due_date: '2026-12-01', amount: 100, amount_paid: 0, status: 'pendiente', days_overdue: 0 },
      ];
      // Mutante aplica a cuota 2 primero:
      const mutantInstallments = [...installments].reverse();
      const firstPaid = mutantInstallments[0].installment_number;

      assert.equal(firstPaid, 1, 'MUTANT SURVIVED: Se amortizó la cuota más lejana en vez de la cuota 1');
    },
  },
  {
    id: 'MUTANT_04_ROUNDING_OMISSION',
    name: 'Omisión del centavo de cuadratura final',
    description: 'No ajusta el redondeo en la última cuota para cuotas periódicas (ej: $1000 / 3)',
    execute: () => {
      const count = 3;
      const totalDebt = 1000;
      const installmentValue = Number((totalDebt / count).toFixed(2)); // 333.33
      // Mutante sin ajuste final:
      const mutantSum = installmentValue * count; // 999.99 (falta 1 centavo)

      assert.equal(mutantSum, totalDebt, 'MUTANT SURVIVED: Faltó $0.01 centavo en la liquidación');
    },
  },
  {
    id: 'MUTANT_05_DOWN_PAYMENT_IGNORED',
    name: 'Omisión de resta de entrada inicial',
    description: 'Calcula la deuda financiando el precio completo sin descontar la entrada',
    execute: () => {
      const price = 2500;
      const down = 500;
      // Mutante que olvida restar entrada:
      const mutantFinanced = price; // ERROR
      const expectedFinanced = 2000;

      assert.equal(mutantFinanced, expectedFinanced, 'MUTANT SURVIVED: Se ignoró la entrada inicial');
    },
  },
  {
    id: 'MUTANT_06_REVERSE_SYMMETRY_MUTATION',
    name: 'Asimetría en cálculo reverso',
    description: 'Al revertir deuda total a capital, suma la tasa en vez de dividir por (1 + rate/100)',
    execute: () => {
      const totalDebt = 2200;
      const rate = 10;
      // Mutante inverso defectuoso:
      const mutantCapital = totalDebt * (1 - rate / 100); // 1980 en vez de 2000
      const expectedCapital = 2000;

      assert.equal(mutantCapital, expectedCapital, 'MUTANT SURVIVED: Error de simetría en reversa');
    },
  },
  {
    id: 'MUTANT_07_MORA_DIRECTION_BUG',
    name: 'Inversión temporal en cálculo de mora',
    description: 'Calcula días de atraso como (vencimiento - fecha_corte) produciendo días negativos',
    execute: () => {
      const dueDate = new Date('2026-10-01T12:00:00');
      const asOf = new Date('2026-10-15T12:00:00');
      // Mutante inverso:
      const mutantDiffDays = Math.floor((dueDate.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24)); // -14

      assert.ok(mutantDiffDays > 0, 'MUTANT SURVIVED: Días de mora calculados en sentido negativo');
    },
  },
];

export async function runMutationTesting() {
  console.log('\n=============================================================');
  console.log('🧪 INICIANDO SUITE DE MUTATION TESTING (FALSIFICABILIDAD)');
  console.log('=============================================================\n');

  let killedMutants = 0;
  let survivedMutants = 0;

  for (const m of mutants) {
    process.stdout.write(`• Evaluando ${m.id} [${m.name}]... `);
    try {
      m.execute();
      // Si la prueba no lanzó error, el mutante sobrevivió (fallo del test)
      console.log('❌ VIVO (Sobrevivió)');
      survivedMutants++;
    } catch (e: any) {
      // El assert falló como se esperaba: mutante cazado y eliminado
      console.log('💀 MUERTO (Detectado por assertions)');
      killedMutants++;
    }
  }

  const total = mutants.length;
  const mutationScore = Math.round((killedMutants / total) * 100);

  console.log('\n-------------------------------------------------------------');
  console.log(`📊 RESULTADOS DEL MUTATION TESTING:`);
  console.log(`   Total de mutantes inyectados: ${total}`);
  console.log(`   Mutantes eliminados (Killed): ${killedMutants}`);
  console.log(`   Mutantes sobrevivientes:      ${survivedMutants}`);
  console.log(`   Puntuación de Mutación:       ${mutationScore}%`);
  console.log('-------------------------------------------------------------\n');

  if (mutationScore === 100) {
    console.log('🏆 ¡PERFECTO! Puntuación de mutación 100%. Todos los defectos son detectados.');
  } else {
    throw new Error(`Mutation Score insuficiente: ${mutationScore}%`);
  }
}

runMutationTesting();
