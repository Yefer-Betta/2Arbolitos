#!/bin/sh
set -e

if [ "$DOCKER" = "true" ] && [ "$HOST_IP" = "0.0.0.0" ]; then
  GATEWAY=$(ip route 2>/dev/null | awk '/default/ { print $3 }' | head -1)
  if [ -n "$GATEWAY" ]; then
    HOST_IP="$GATEWAY"
    export HOST_IP
    echo "  HOST_IP autodetectada: $HOST_IP"
  else
    CONTAINER_IP=$(hostname -i 2>/dev/null | awk '{print $1}')
    echo "  No se pudo detectar gateway, usando IP de contenedor: $CONTAINER_IP"
  fi
fi

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

cd /app/server
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️  prisma db push omitido (posiblemente ya sincronizado)"

echo "🚀 Iniciando servidor 2Arbolitos..."
exec "$@"
