#!/bin/bash

echo "========================================"
echo "   INSTALADOR 2ARBOLITOS (Linux)"
echo "========================================"
echo

# Moverse al directorio del script
cd "$(dirname "$0")"

echo "[1/3] Verificando Node.js..."
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js no esta instalado."
    echo "Por favor, instala Node.js usando el gestor de paquetes de tu distribucion."
    echo "Ejemplo en Ubuntu/Debian: sudo apt install nodejs npm"
    exit
fi
echo "[OK] Node.js detectado."
echo

echo "[2/3] Instalando dependencias..."
npm install
if [ $? -ne 0 ]; then echo "[ERROR] Fallo la instalacion de dependencias."; exit 1; fi
echo

echo "[3/3] Construyendo la aplicacion para produccion..."
npm run build
if [ $? -ne 0 ]; then echo "[ERROR] Fallo la construccion del sistema."; exit 1; fi
echo

echo "========================================"
echo "   INSTALACION COMPLETADA"
echo "========================================"
echo "Ahora puedes usar ./iniciar-sistema.sh para abrir el sistema."