#!/bin/sh
set -e

echo "⏳ Esperando a MySQL..."
MAX_TRIES=30
TRIES=0
until nc -z db 3306 2>/dev/null || [ $TRIES -eq $MAX_TRIES ]; do
  TRIES=$((TRIES+1))
  sleep 2
done

if [ $TRIES -eq $MAX_TRIES ]; then
  echo "❌ MySQL no respondió después de 60s"
  exit 1
fi

echo "✅ MySQL disponible. Sincronizando esquema..."

# Pre-migration: crear índice no único en payments.orderId si hace falta
node --input-type=module -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  await prisma.\$executeRawUnsafe('CREATE INDEX payments_orderId_idx ON payments (orderId)');
  console.log('  Índice payments_orderId_idx creado');
} catch (e) {
  const msg = String(e.message || e);
  if (!msg.includes('Duplicate key name') && !msg.includes('already exists')) {
    console.log('  (pre-migration)', msg.slice(0, 100));
  }
}
await prisma.\$disconnect();
" 2>&1 || true
if [ -f /app/prisma/schema.prisma ]; then
  PRISMA_DIR=/app
elif [ -f /app/server/prisma/schema.prisma ]; then
  PRISMA_DIR=/app/server
else
  echo "ERROR: prisma/schema.prisma no encontrado"
  exit 1
fi

cd "$PRISMA_DIR"

# Detectar el estado: 'migrated' (ya usa migraciones), 'legacy' (BD de prisma db push)
# o 'empty' (BD nueva). En legacy hay que baselinar la migración inicial antes de aplicar.
MIGRATION_STATE=$(node --input-type=module -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const mig = await p.\$queryRawUnsafe(\"SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations'\");
  const usr = await p.\$queryRawUnsafe(\"SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'\");
  const hasMig = Number(mig[0].c) > 0;
  const hasUsers = Number(usr[0].c) > 0;
  console.log(hasMig ? 'migrated' : (hasUsers ? 'legacy' : 'empty'));
} catch (e) {
  console.log('error');
} finally {
  await p.\$disconnect();
}
" 2>/dev/null || true)

if [ "$MIGRATION_STATE" = "legacy" ]; then
  echo "  BD existente sin historial de migraciones → baselinando 20240101000000_init"
  npx prisma migrate resolve --applied 20240101000000_init 2>&1 || echo "⚠️  no se pudo baselinar la migración inicial"
fi

echo "Aplicando migraciones (prisma migrate deploy)..."
npx prisma migrate deploy 2>&1 || echo "⚠️  prisma migrate deploy falló"

echo "Verificando si ya hay datos en la base de datos..."
ALREADY_SEEDED=$(node --input-type=module -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const count = await p.user.count();
  console.log(count);
} finally {
  await p.\$disconnect();
}
" 2>/dev/null)

if [ "$ALREADY_SEEDED" != "0" ] && [ -n "$ALREADY_SEEDED" ]; then
  echo "✅ Seed omitido — la base de datos ya tiene datos ($ALREADY_SEEDED usuarios)"
else
  echo "Ejecutando seed de datos iniciales..."
  if node prisma/seed.js; then
    echo "✅ Seed completado"
  else
    echo "⚠️  ERROR durante el seed — revisa los logs arriba"
  fi
fi

cd /app
echo "🚀 Iniciando servidor 2Arbolitos..."
exec "$@"
