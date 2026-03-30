#!/bin/bash

echo "========================================"
echo "   INSTALADOR 2ARBOLITOS (Linux/Mac)"
echo "   (Frontend + Backend + MySQL)"
echo "========================================"
echo

# Moverse al directorio del script
cd "$(dirname "$0")"

echo "[1/6] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no esta instalado."
    echo "Por favor, instala Node.js:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  MacOS: brew install node"
    echo "  Fedora: sudo dnf install nodejs"
    exit 1
fi
echo "[OK] Node.js detectado: $(node --version)"
echo

echo "[2/6] Verificando MySQL..."
DB_HOST="localhost"
DB_USER="root"
DB_PASS=""

# Buscar MySQL/MariaDB
if command -v mysql &> /dev/null; then
    echo "[OK] MySQL encontrado"
    
    # Verificar si esta corriendo
    if ! mysql -u "$DB_USER" -e "SELECT 1" &> /dev/null; then
        echo "[INFO] MySQL no esta corriendo, intentando iniciar..."
        
        # Intentar diferentes servicios
        if command -v systemctl &> /dev/null; then
            sudo systemctl start mysql 2>/dev/null || sudo systemctl start mariadb 2>/dev/null
        elif command -v service &> /dev/null; then
            sudo service mysql start 2>/dev/null || sudo service mariadb start 2>/dev/null
        fi
        
        # Verificar de nuevo
        if ! mysql -u "$DB_USER" -e "SELECT 1" &> /dev/null; then
            echo "[AVISO] No se pudo iniciar MySQL automaticamente"
            echo "Por favor inicia MySQL manualmente y vuelve a ejecutar este script"
            read -p "Presiona Enter para continuar de todas formas..."
        else
            echo "[OK] MySQL iniciado"
        fi
    else
        echo "[OK] MySQL esta corriendo"
    fi
else
    echo "[AVISO] MySQL no encontrado en el sistema"
    echo "Por favor proporciona los datos de tu servidor MySQL:"
    read -p "Host MySQL (ej: localhost): " DB_HOST
    read -p "Usuario MySQL (ej: root): " DB_USER
    read -s -p "Contrasena MySQL (dejar vacio si no tiene): " DB_PASS
    echo
fi

echo
echo "[3/6] Actualizando configuracion de base de datos..."

# Generar DATABASE_URL
DATABASE_URL="mysql://$DB_USER"
if [ -n "$DB_PASS" ]; then
    DATABASE_URL="$DATABASE_URL:$DB_PASS"
fi
DATABASE_URL="$DATABASE_URL@$DB_HOST:3306/2arbolitos?schema=public&charset=utf8mb4"

# Escribir en .env
cat > server/.env << EOF
# Servidor
PORT=3001
NODE_ENV=development

# Base de datos MySQL
DATABASE_URL="$DATABASE_URL"

# JWT
JWT_SECRET=super_secret_jwt_change_this_in_production
JWT_EXPIRES_IN=7d

# Frontend (para CORS)
FRONTEND_URL=http://localhost:5173
EOF

echo "[OK] Configuracion guardada en server/.env"
echo

echo "[4/6] Conectando a MySQL y creando base de datos..."
mysql -h "$DB_HOST" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -e "CREATE DATABASE IF NOT EXISTS 2arbolitos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[OK] Base de datos creada/verificada"
else
    echo "[ERROR] No se pudo crear la base de datos"
    echo "Verifica que MySQL este corriendo y las credenciales sean correctas"
    exit 1
fi
echo

echo "[5/6] Instalando dependencias..."
echo
echo "Instalando frontend..."
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Fallo la instalacion del frontend"
    exit 1
fi

echo
echo "Instalando server..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Fallo la instalacion del server"
    exit 1
fi
cd ..
echo

echo "[6/6] Configurando base de datos..."
cd server
npx prisma generate
if [ $? -ne 0 ]; then
    echo "[ERROR] Fallo al generar Prisma client"
    exit 1
fi

npx prisma db push
if [ $? -ne 0 ]; then
    echo "[ERROR] Fallo al sincronizar schema con MySQL"
    exit 1
fi

echo
node prisma/seed.js
if [ $? -eq 0 ]; then
    echo "[OK] Datos de ejemplo creados"
else
    echo "[WARNING] El seed no se ejecuto (puede que ya haya datos)"
fi
cd ..

echo
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Fallo la construccion del sistema"
    exit 1
fi

echo
echo "========================================"
echo "   INSTALACION COMPLETADA"
echo "========================================"
echo
echo "Ahora ejecuta ./iniciar-sistema.sh"
echo "para iniciar el sistema"
echo
echo "Credenciales por defecto:"
echo "  - Admin: admin / admin123"
echo "  - Mesero: mesero / waiter123"
echo "  - Cocina: cocina / cook123"
echo
