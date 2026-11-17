import { describe, expect, it } from 'vitest';

// Pruebas de integración contra MySQL real.
// Se saltan si no hay DATABASE_URL o si no se puede conectar (p. ej. Docker Desktop apagado).
// Para correr:
//   cd server && DATABASE_URL="mysql://root:root@localhost:3306/2arbolitos_test" npx prisma migrate deploy
//   DATABASE_URL="mysql://root:root@localhost:3306/2arbolitos_test" npx vitest run ../tests/integration.skipIf.test.js

const canRun = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL.includes('mysql');

describe.skipIf(!canRun)('integración MySQL real', () => {
  it('P2002 en clientOrderId devuelve el pedido existente (no 500)', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const clientOrderId = `integ-p2002-${Date.now()}`;
      const first = await prisma.order.create({
        data: {
          orderType: 'MESA',
          clientOrderId,
          totalCop: 40000,
          exchangeRate: 4000,
          exchangeRateBs: 40,
          items: { create: [] },
        },
        include: { items: true, payments: true },
      });

      // Segundo envío con el mismo clientOrderId (simula doble clic / reintento)
      const second = await prisma.order.create({
        data: {
          orderType: 'MESA',
          clientOrderId,
          totalCop: 40000,
          exchangeRate: 4000,
          exchangeRateBs: 40,
          items: { create: [] },
        },
        include: { items: true, payments: true },
      });

      // Si el backend captura P2002 y devuelve el existente, ambos comparten id
      expect(second.id).toBe(first.id);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('gasto upsert con id del cliente: doble envío no duplica', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const gastoId = `integ-gasto-${Date.now()}`;
      const ahora = new Date();

      const primera = await prisma.expense.upsert({
        where: { id: gastoId },
        update: { description: 'Salsas', amount: 12000, category: 'insumos', date: ahora },
        create: { id: gastoId, description: 'Salsas', amount: 12000, category: 'insumos', date: ahora },
      });

      const segunda = await prisma.expense.upsert({
        where: { id: gastoId },
        update: { description: 'Salsas', amount: 12000, category: 'insumos', date: ahora },
        create: { id: gastoId, description: 'Salsas', amount: 12000, category: 'insumos', date: ahora },
      });

      expect(segunda.id).toBe(primera.id);

      const duplicados = await prisma.expense.count({ where: { id: gastoId } });
      expect(duplicados).toBe(1);
    } finally {
      await prisma.$disconnect();
    }
  });
});
