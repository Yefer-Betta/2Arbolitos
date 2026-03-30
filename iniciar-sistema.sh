#!/bin/bash

echo "========================================"
echo "   SISTEMA DE GESTION 2ARBOLITOS"
echo "========================================"
echo

# Moverse al directorio del script
cd "$(dirname "$0")"

# Verificar que las dependencias del frontend esten instaladas
if [ ! -d "node_modules" ]; then
    echo "[ERROR] Dependencias del frontend no instaladas."
    echo "Por favor ejecuta ./instalar.sh primero"
    exit 1
fi

# Verificar que las dependencias del server esten instaladas
if [ ! -d "server/node_modules" ]; then
    echo "[ERROR] Dependencias del server no instaladas."
    echo "Por favor ejecuta ./instalar.sh primero"
    exit 1
fi

# Verificar que la base de datos este configurada
if [ ! -f "server/.env" ]; then
    echo "[ERROR] Configuracion del servidor no encontrada."
    echo "Por favor ejecuta ./instalar.sh primero"
    exit 1
fi

# Verificar que el build exista
if [ ! -d "dist" ]; then
    echo "[AVISO] No hay build. Construyendo frontend..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "[ERROR] Fallo la construccion del frontend"
        exit 1
    fi
fi

echo "[1/3] Verificando MySQL..."

# Verificar si MySQL esta corriendo
MYSQL_RUNNING=0
if command -v mysql &> /dev/null; then
    if mysql -u root -e "SELECT 1" &> /dev/null; then
        MYSQL_RUNNING=1
        echo "[OK] MySQL esta corriendo"
    fi
fi

if [ $MYSQL_RUNNING -eq 0 ]; then
    echo "[AVISO] MySQL no esta corriendo"
    echo "Intentando iniciar..."

    # Intentar diferentes metodos
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mysql 2>/dev/null || sudo systemctl start mariadb 2>/dev/null
    elif command -v service &> /dev/null; then
        sudo service mysql start 2>/dev/null || sudo service mariadb start 2>/dev/null
    fi

    # Verificar de nuevo
    sleep 2
    if mysql -u root -e "SELECT 1" &> /dev/null; then
        echo "[OK] MySQL iniciado"
        MYSQL_RUNNING=1
    else
        echo "[AVISO] No se pudo iniciar MySQL automaticamente"
        echo "El sistema intentara iniciar de todas formas..."
    fi
fi

echo
echo "[2/3] Iniciando Backend (Puerto 3001)..."
cd server
npm run dev &
cd ..

echo
echo "[3/3] Iniciando Frontend (Puerto 5173)..."
npm run dev &

sleep 3

echo
echo "========================================"
echo "   Sistema iniciado correctamente"
echo "========================================"
echo
echo "URLs de acceso:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend API: http://localhost:3001"
echo
echo "Si abres estas URLs en otros dispositivos de tu red,"
echo "asegurate de que esten conectados al mismo WiFi"
echo
echo "Credenciales:"
echo "  Admin: admin / admin123"
echo "  Mesero: mesero / waiter123"
echo "  Cocina: cocina / cook123"
echo

# Mantener el script corriendo
echo "Presiona Ctrl+C para detener los servidores"
wait
