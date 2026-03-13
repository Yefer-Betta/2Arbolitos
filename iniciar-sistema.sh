#!/bin/bash

echo "========================================"
echo "   SISTEMA DE GESTION 2ARBOLITOS"
echo "========================================"
echo
echo "Iniciando servidor local..."
echo

# Moverse al directorio del script
cd "$(dirname "$0")"

# Verificar si las dependencias estan instaladas
if [ ! -d "node_modules" ]; then
    echo "[ERROR] Dependencias no instaladas."
    echo "Por favor ejecuta ./instalar.sh primero"
    exit
fi

# Iniciar el servidor de previsualizacion, exponerlo a la red (--host)
# y abrir el navegador.
echo "BUSCA LA LINEA 'Network:' en los mensajes del servidor."
echo "Esa es la direccion para los celulares (Ej: http://192.168.1.5:4173)"
npm run preview -- --host --open