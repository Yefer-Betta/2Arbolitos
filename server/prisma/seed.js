import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  await prisma.auditLog.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
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

  const manager = await prisma.user.create({
    data: {
      username: 'gerente',
      password: waiterPassword,
      name: 'Gerente',
      role: 'MANAGER',
    },
  });

  const cashier = await prisma.user.create({
    data: {
      username: 'cajero',
      password: waiterPassword,
      name: 'Cajero',
      role: 'CASHIER',
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

  const permissions = await Promise.all([
    prisma.permission.create({ data: { name: 'CREATE_PRODUCT' } }),
    prisma.permission.create({ data: { name: 'EDIT_PRODUCT' } }),
    prisma.permission.create({ data: { name: 'DELETE_PRODUCT' } }),
    prisma.permission.create({ data: { name: 'MANAGE_INVENTORY' } }),
    prisma.permission.create({ data: { name: 'VIEW_REPORTS' } }),
    prisma.permission.create({ data: { name: 'MANAGE_USERS' } }),
    prisma.permission.create({ data: { name: 'MANAGE_ORDERS' } }),
    prisma.permission.create({ data: { name: 'VIEW_ORDERS' } }),
    prisma.permission.create({ data: { name: 'VIEW_AUDIT' } }),
    prisma.permission.create({ data: { name: 'MANAGE_PERMISSIONS' } }),
    prisma.permission.create({ data: { name: 'MANAGE_SETTINGS' } }),
    prisma.permission.create({ data: { name: 'MANAGE_BACKUP' } }),
  ]);

  console.log('✅ Permissions created');

  // ADMIN: todos los permisos
  for (const perm of permissions) {
    await prisma.rolePermission.create({
      data: { roleName: 'ADMIN', permissionId: perm.id },
    });
  }

  // MANAGER: permisos de operación excepto MANAGE_USERS y MANAGE_PERMISSIONS
  const managerPerms = permissions.filter(p =>
    !['MANAGE_USERS', 'MANAGE_PERMISSIONS', 'DELETE_PRODUCT', 'VIEW_AUDIT'].includes(p.name)
  );
  for (const perm of managerPerms) {
    await prisma.rolePermission.create({
      data: { roleName: 'MANAGER', permissionId: perm.id },
    });
  }

  // CASHIER: productos, órdenes, inventario, reportes
  const cashierPerms = permissions.filter(p =>
    ['CREATE_PRODUCT', 'EDIT_PRODUCT', 'MANAGE_INVENTORY', 'VIEW_REPORTS', 'MANAGE_ORDERS'].includes(p.name)
  );
  for (const perm of cashierPerms) {
    await prisma.rolePermission.create({
      data: { roleName: 'CASHIER', permissionId: perm.id },
    });
  }

  // WAITER: solo crear/ver órdenes
  const waiterPerms = permissions.filter(p =>
    ['MANAGE_ORDERS', 'VIEW_ORDERS'].includes(p.name)
  );
  for (const perm of waiterPerms) {
    await prisma.rolePermission.create({
      data: { roleName: 'WAITER', permissionId: perm.id },
    });
  }

  // COOK: solo ver órdenes
  for (const perm of permissions.filter(p => p.name === 'VIEW_ORDERS')) {
    await prisma.rolePermission.create({
      data: { roleName: 'COOK', permissionId: perm.id },
    });
  }

  console.log('✅ Role permissions assigned');

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

  await prisma.settings.create({
    data: {
      key: 'exchangeRateBs',
      value: '40',
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
║  - gerente / waiter123 (MANAGER)                      ║
║  - cajero / waiter123 (CASHIER)                       ║
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
