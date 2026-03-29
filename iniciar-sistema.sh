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

# Construir si no existe dist (para modo servidor)
if [ ! -d "dist" ]; then
    echo "[AVISO] No hay build. Construyendo..."
    npm run build
fi

# Iniciar servidor Node: sirve app + API para que PC y celulares estén sincronizados
echo "En la consola verás la URL para este equipo y para la red."
echo "Abre esa URL en el celular (mismo WiFi) para atender desde el móvil."
npm run start