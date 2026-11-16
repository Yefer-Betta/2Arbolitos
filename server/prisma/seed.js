import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function randomPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

async function assertCanWipe() {
  const [users, orders, expenses] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.expense.count(),
  ]);

  if (users === 0 && orders === 0 && expenses === 0) return;

  const forced = process.argv.includes('--force') || process.env.ALLOW_SEED_WIPE === '1';
  if (!forced) {
    console.error('\n❌ El seed borra TODOS los datos y la base no está vacía.');
    console.error(`   Usuarios: ${users} · Pedidos: ${orders} · Gastos: ${expenses}`);
    console.error('   Si de verdad quieres empezar de cero:');
    console.error('     npm run db:seed -- --force');
    console.error('   o define ALLOW_SEED_WIPE=1 en el entorno.\n');
    process.exit(1);
  }

  console.warn(`\n⚠️  ALLOW_SEED_WIPE/--force activo: se borrarán ${users} usuarios, ${orders} pedidos y ${expenses} gastos.\n`);
}

async function main() {
  console.log('🌱 Starting seed...');
  await assertCanWipe();

  await prisma.attendance.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.closure.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableState.deleteMany();
  await prisma.productModifierGroup.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  const initialUsers = [
    { username: 'admin', name: 'Administrador', role: 'ADMIN' },
    { username: 'gerente', name: 'Gerente', role: 'MANAGER' },
    { username: 'cajero', name: 'Cajero', role: 'CASHIER' },
    { username: 'mesero', name: 'Mesero', role: 'WAITER' },
    { username: 'cocina', name: 'Cocinero', role: 'COOK' },
  ];

  const credentials = [];
  for (const user of initialUsers) {
    const password = user.role === 'ADMIN' && process.env.SEED_ADMIN_PASSWORD
      ? process.env.SEED_ADMIN_PASSWORD
      : randomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username: user.username,
        password: hashedPassword,
        name: user.name,
        role: user.role,
        mustChangePassword: true,
      },
    });

    credentials.push({ ...user, password });
  }

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

  await Promise.all([
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

  const credentialLines = credentials
    .map(c => `║  - ${c.username.padEnd(10)} / ${c.password.padEnd(16)} (${c.role})`)
    .join('\n');

  console.log(`
╔═══════════════════════════════════════════════════════╗
║                    SEED COMPLETO                      ║
╠═══════════════════════════════════════════════════════╣
║  CONTRASEÑAS INICIALES (se muestran UNA sola vez):    ║
${credentialLines}
║                                                       ║
║  Debes cambiarlas en el primer inicio de sesión.       ║
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
