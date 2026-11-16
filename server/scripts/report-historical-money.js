#!/usr/bin/env node
/**
 * Informe de solo lectura del dinero histórico.
 *
 * Detecta:
 *   a) pedidos con ítems isUsd cuyo total guardado parece estar en USD crudo
 *      (sin multiplicar por la tasa);
 *   b) pagos en efectivo con change > 0 que pudieron sumarse brutos en cierres.
 *
 * No escribe ni corrige nada. Uso:
 *   cd server && node scripts/report-historical-money.js
 *   docker compose exec -T backend node scripts/report-historical-money.js
 *   ... --json
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../src/config/database.js';
import { analyzeHistoricalMoney, proposedCutover } from '../src/lib/historicalMoneyReport.js';

function money(value) {
  return Number(value || 0).toLocaleString('es-CO');
}

function printHuman(report) {
  console.log('');
  console.log('=== Informe de dinero historico (SOLO LECTURA) ===');
  console.log(`Generado: ${report.generatedAt}`);
  console.log('');
  console.log('Pedidos');
  console.log(`  Total: ${report.orders.total}`);
  console.log(`  Con items en USD: ${report.orders.withUsdItems}`);
  console.log(`  Sospechosos de total en USD crudo: ${report.orders.suspicious}`);
  if (report.orders.examples.length > 0) {
    console.log('  Ejemplos (los de mayor diferencia):');
    for (const example of report.orders.examples) {
      console.log(
        `   - ${example.id} | ${example.date || 'sin fecha'} | ` +
        `guardado ${money(example.savedCop)} vs esperado ${money(example.expectedCop)} COP ` +
        `(dif ${money(example.differenceCop)}, confianza ${example.confidence})`
      );
    }
  }
  console.log('');
  console.log('Pagos en efectivo con vuelto');
  console.log(`  Cantidad: ${report.cashPayments.withChange}`);
  console.log(`  Bruto: ${money(report.cashPayments.grossCop)} COP`);
  console.log(`  Vuelto: ${money(report.cashPayments.changeCop)} COP`);
  console.log(`  Neto: ${money(report.cashPayments.netCop)} COP`);
  console.log('');
  console.log('Cierres');
  console.log(`  Total: ${report.closures.total}`);
  for (const period of report.closures.periods) {
    console.log(
      `   - ${period.date} | pagos con vuelto: ${period.paymentsWithChange} | ` +
      `bruto ${money(period.cashGrossCop)} - vuelto ${money(period.cashChangeCop)} = ` +
      `neto ${money(period.cashNetCop)} COP | reportado ${money(period.reportedCashCop)} ` +
      `(dif vs neto: ${money(period.reportedVsNetCop)})`
    );
  }
  const cutover = proposedCutover();
  console.log('');
  console.log('Criterio propuesto para separar registros viejos de nuevos');
  console.log(`  Fecha de corte sugerida: ${cutover.cutoffIso}`);
  for (const line of cutover.recommendation) {
    console.log(`   - ${line}`);
  }
  console.log('');
}

async function run() {
  const asJson = process.argv.includes('--json');

  const [orders, closures] = await Promise.all([
    prisma.order.findMany({
      include: {
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.closure.findMany({ orderBy: { date: 'asc' } }),
  ]);

  const report = analyzeHistoricalMoney({ orders, closures });

  if (asJson) {
    console.log(JSON.stringify({ ...report, proposedCutover: proposedCutover() }, null, 2));
  } else {
    printHuman(report);
  }
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  run()
    .catch((error) => {
      console.error('No se pudo generar el informe:', error.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
