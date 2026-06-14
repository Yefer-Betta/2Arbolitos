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
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️  prisma db push omitido"

echo "Ejecutando seed de datos iniciales..."
node prisma/seed.js 2>/dev/null && echo "✅ Seed completado" || echo "⚠️  Seed omitido (probablemente ya hay datos)"

cd /app
echo "🚀 Iniciando servidor 2Arbolitos..."
exec "$@"
