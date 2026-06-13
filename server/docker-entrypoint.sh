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

# Detectar dónde está prisma/schema.prisma
if [ -f /app/server/prisma/schema.prisma ]; then
  PRISMA_DIR=/app/server
elif [ -f /app/prisma/schema.prisma ]; then
  PRISMA_DIR=/app
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
