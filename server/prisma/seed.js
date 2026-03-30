import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  const adminPassword = await bcrypt.hash('admin123', 10);
  const waiterPassword = await bcrypt.hash('waiter123', 10);
  const cookPassword = await bcrypt.hash('cook123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });

  const waiter = await prisma.user.create({
    data: {
      username: 'mesero',
      password: waiterPassword,
      name: 'Mesero',
      role: 'WAITER',
    },
  });

  const cook = await prisma.user.create({
    data: {
      username: 'cocina',
      password: cookPassword,
      name: 'Cocinero',
      role: 'COOK',
    },
  });

  console.log('✅ Users created');

  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Bebidas', order: 1 } }),
    prisma.category.create({ data: { name: 'Entradas', order: 2 } }),
    prisma.category.create({ data: { name: 'Platos Fuertes', order: 3 } }),
    prisma.category.create({ data: { name: 'Postres', order: 4 } }),
  ]);

  console.log('✅ Categories created');

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Gaseosa',
        categoryId: categories[0].id,
        price: 3000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Jugo Natural',
        categoryId: categories[0].id,
        price: 5000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cerveza',
        categoryId: categories[0].id,
        price: 6000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Patacones',
        categoryId: categories[1].id,
        price: 8000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Nachos',
        categoryId: categories[1].id,
        price: 10000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Hamburguesa',
        categoryId: categories[2].id,
        price: 18000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Parrilla',
        categoryId: categories[2].id,
        price: 25000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Ensalada',
        categoryId: categories[2].id,
        price: 12000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Flan',
        categoryId: categories[3].id,
        price: 6000,
        isUsd: false,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Helado',
        categoryId: categories[3].id,
        price: 5000,
        isUsd: false,
      },
    }),
  ]);

  console.log('✅ Products created');

  for (let i = 1; i <= 10; i++) {
    await prisma.table.create({
      data: {
        number: i,
        name: `Mesa ${i}`,
        capacity: 4,
      },
    });
  }

  console.log('✅ Tables created');

  await prisma.settings.create({
    data: {
      key: 'business',
      value: JSON.stringify({
        name: '2 Arbolitos',
        address: '',
        phone: '',
        nit: '',
      }),
      type: 'object',
    },
  });

  await prisma.settings.create({
    data: {
      key: 'exchangeRate',
      value: '4000',
      type: 'number',
    },
  });

  console.log('✅ Settings created');

  console.log(`
╔═══════════════════════════════════════════════════════╗
║                    SEED COMPLETO                      ║
╠═══════════════════════════════════════════════════════╣
║  USUARIOS CREADOS:                                    ║
║  - admin / admin123 (ADMIN)                           ║
║  - mesero / waiter123 (WAITER)                        ║
║  - cocina / cook123 (COOK)                            ║
╚═══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
