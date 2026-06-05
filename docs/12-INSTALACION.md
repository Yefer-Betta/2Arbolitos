# 12 — Instalación

## 12.1 Requisitos del Sistema

### 12.1.1 Hardware Mínimo (PC Servidor)

| Componente | Mínimo | Recomendado |
|:-----------|:-------|:------------|
| **Procesador** | Dual-core 1.6 GHz | Quad-core 2.5 GHz+ |
| **RAM** | 4 GB | 8 GB+ |
| **Disco** | 2 GB libres (sin datos) | 20 GB+ SSD (con backup) |
| **Red** | Ethernet 100 Mbps | Gigabit Ethernet |
| **WiFi** | 802.11n | 802.11ac / WiFi 5 |

### 12.1.2 Software

| Componente | Versión | Notas |
|:-----------|:--------|:------|
| **Node.js** | 18.0+ (LTS) | https://nodejs.org |
| **MySQL** | 8.0+ | O usar XAMPP/WAMP/MAMP |
| **Sistema Operativo** | Windows 10+, macOS 12+, Ubuntu 22.04+ | Cualquiera con Node.js |

### 12.1.3 Red

- **Router WiFi** con DHCP habilitado
- **Subredes permitidas**: 192.168.x.x, 10.x.x.x
- **Ancho de banda**: mínimo 1 Mbps (uso típico < 100 Kbps por dispositivo)

## 12.2 Métodos de Instalación

Existen **3 métodos**, de menor a mayor dificultad:

| Método | Dificultad | Tiempo | Recomendado para |
|:-------|:-----------|:-------|:-----------------|
| 🟢 **Instalador NSIS** | Baja | 10 min | Usuario final, restaurant |
| 🟡 **Wizard Electron** | Baja | 15 min | Primera ejecución post-instalación |
| 🟠 **Servidor manual** | Media | 30 min | Servidor Linux/Mac, admins |
| 🔴 **Docker** | Media-Alta | 20 min | Despliegues reproducibles, cloud |

## 12.3 Método 1: Instalador Gráfico (Recomendado)

> **Estado:** Instalador NSIS ya generado en `release/2Arbolitos POS Setup 1.0.0.exe` (168 MB). 
> Probado en Windows 10/11 con instalación silenciosa (`/S`), desinstalador registrado en 
> Panel de Control, accesos directos creados automáticamente en Escritorio y Menú Inicio.

### Paso 1: Descargar / Ubicar

```
release/2Arbolitos POS Setup 1.0.0.exe (~168 MB)
```

O desde GitHub Releases:
```
https://github.com/Yefer-Betta/2Arbolitos/releases
→ 2Arbolitos POS Setup 1.0.0.exe
```

#### Instalación silenciosa (avanzada / para deploys)

```cmd
:: Instalar sin mostrar UI
"2Arbolitos POS Setup 1.0.0.exe" /S

:: Instalar en directorio personalizado
"2Arbolitos POS Setup 1.0.0.exe" /S /D=C:\Apps\2Arbolitos POS

:: Desinstalar silenciosamente
"C:\Users\<user>\AppData\Local\Programs\2Arbolitos POS\Uninstall 2Arbolitos POS.exe" /S
```

> **Nota:** Con la configuración `perMachine: false` la app se instala por usuario en 
> `%LOCALAPPDATA%\Programs\2Arbolitos POS\` (no requiere permisos de Administrador para 
> ejecutarse, solo el instalador NSIS los solicita una vez).

### Paso 2: Ejecutar Instalador

```
Doble clic en 2Arbolitos-POS-Setup-1.0.0.exe
```

### Paso 3: Wizard NSIS

```
┌────────────────────────────────────────────┐
│ 2Arbolitos POS Setup                      │
│────────────────────────────────────────────│
│                                            │
│   Bienvenido al instalador de 2Arbolitos  │
│   POS, el sistema de gestión integral     │
│   para restaurantes.                       │
│                                            │
│   Click "Siguiente" para continuar.        │
│                                            │
│              [Siguiente >]                 │
└────────────────────────────────────────────┘
```

### Paso 4: Aceptar Licencia

Marcar "Acepto los términos" → Siguiente.

### Paso 5: Directorio de Instalación

```
Directorio: C:\Program Files\2Arbolitos POS

[ Examinar... ] [Siguiente]
```

### Paso 6: Accesos Directos

```
☑ Acceso directo en Escritorio
☑ Acceso directo en Menú Inicio

[Instalar]
```

### Paso 7: Instalación

Espera 3-5 minutos. Barra de progreso.

### Paso 8: Finalizar

```
☑ Ejecutar 2Arbolitos POS

[Finalizar]
```

## 12.4 Método 2: Wizard de Primera Ejecución

Al lanzar por primera vez, se abre el **wizard de 4 pasos**:

```mermaid
flowchart LR
    A[1. Bienvenida] --> B[2. Detección]
    B --> C[3. Configuración MySQL]
    C --> D[4. Finalizar]
    D --> E([App Lista])
```

### Paso 1: Bienvenida

```
┌─────────────────────────────────────────────┐
│         🌳 2Arbolitos POS                   │
│         Asistente de Configuración          │
│─────────────────────────────────────────────│
│  Bienvenido al sistema integral de gestión  │
│  para restaurantes.                         │
│                                             │
│  Este asistente configurará:                │
│   ✓ Conexión a base de datos MySQL          │
│   ✓ Creación de tablas y datos iniciales   │
│   ✓ Acceso directo en el escritorio         │
│                                             │
│  [Cancelar]              [Siguiente >]      │
└─────────────────────────────────────────────┘
```

### Paso 2: Detección del Sistema

Click "Detectar" para que el sistema verifique:
- Node.js (versión)
- MySQL cliente (en PATH)
- Conexión a MySQL server

```
✓ Node.js v20.10.0 detectado
✓ Cliente MySQL encontrado
⚠ Conexión a MySQL: requiere configuración

[Cancelar]  [Volver]  [Siguiente >]
```

### Paso 3: Configuración de MySQL

```
┌─────────────────────────────────────────────┐
│  Configuración de Base de Datos             │
│─────────────────────────────────────────────│
│                                             │
│  Host:     [ localhost          ]           │
│  Puerto:   [ 3306               ]           │
│  Usuario:  [ root               ]           │
│  Password: [ ********           ]           │
│  BD:       [ 2arbolitos         ]           │
│                                             │
│  [ Probar Conexión ]                        │
│                                             │
│  Resultado: ✓ Conexión exitosa             │
│                                             │
│  [Cancelar]  [Volver]  [Siguiente >]       │
└─────────────────────────────────────────────┘
```

### Paso 4: Finalizar

Click "Finalizar" ejecuta:
- `npm install` (raíz + server)
- `npx prisma generate`
- `npx prisma db push` (crea tablas)
- `node prisma/seed.js` (datos iniciales)
- Crea acceso directo en escritorio

```
┌─────────────────────────────────────────────┐
│  ✓ Configuración completada                │
│─────────────────────────────────────────────│
│                                             │
│  Se ha configurado:                         │
│   ✓ Base de datos '2arbolitos' creada       │
│   ✓ 3 usuarios creados (admin/mesero/cocina)│
│   ✓ 20 productos de ejemplo cargados       │
│   ✓ 10 mesas configuradas                  │
│   ✓ Acceso directo en escritorio           │
│                                             │
│  [ Acceder al Sistema ]                     │
└─────────────────────────────────────────────┘
```

## 12.5 Método 3: Servidor Manual (Linux/Mac)

```bash
# 1. Clonar repositorio
git clone https://github.com/Yefer-Betta/2Arbolitos.git
cd 2Arbolitos

# 2. Instalar dependencias
npm install
cd server && npm install && cd ..

# 3. Crear base de datos
sudo mysql <<EOF
CREATE DATABASE IF NOT EXISTS \`2arbolitos\` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
EOF

# 4. Configurar .env
cat > server/.env << 'EOF'
PORT=3002
DATABASE_URL="mysql://root:password@localhost:3306/2arbolitos?schema=public&charset=utf8mb4"
JWT_SECRET="$(openssl rand -hex 32)"
JWT_EXPIRES_IN=7d
EOF

# 5. Inicializar Prisma
cd server
npx prisma generate
npx prisma db push
node prisma/seed.js
cd ..

# 6. Compilar frontend
npm run build

# 7. Iniciar con PM2
sudo npm install -g pm2
pm2 start npm --name "2arbolitos" -- run api
pm2 startup
pm2 save
```

## 12.6 Método 4: Docker

```bash
# Clonar y levantar
git clone https://github.com/Yefer-Betta/2Arbolitos.git
cd 2Arbolitos

# Crear .env
cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=tu_password_seguro
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Levantar servicios
docker compose up -d

# Verificar
docker compose ps
docker compose logs -f app

# Sembrar datos iniciales
docker compose exec -T app node server/prisma/seed.js
```

## 12.7 Primer Acceso

Una vez instalado y configurado, abre el navegador o ejecuta la app:

```
URL local:    http://localhost:3002
URL LAN:      http://<IP-servidor>:3002
URL mDNS:     http://2arbolitos-pos.local:3002
URL QR:       http://<IP-servidor>:3002/qr
```

**Credenciales iniciales:**

| Rol | Usuario | Contraseña |
|:----|:--------|:-----------|
| Administrador | `admin` | `admin123` |
| Mesero | `mesero` | `waiter123` |
| Cocina | `cocina` | `cook123` |

> ⚠️ **Cambiar inmediatamente** en producción.

## 12.8 Configuración Post-Instalación

### 12.8.1 Cambiar Contraseña del Admin

1. Login como `admin/admin123`.
2. (Pendiente UI) Editar usuario en módulo de gestión.

### 12.8.2 Configurar Tasa de Cambio

1. Settings → Negocio → Tasa de Cambio.
2. Ingresar valor COP/USD (ej: 4200).
3. Guardar.

### 12.8.3 Datos del Negocio

1. Settings → Negocio → Datos del Negocio.
2. Completar:
   - Nombre
   - Dirección
   - Teléfono
   - Logo (subir imagen)

### 12.8.4 Auto-Start

1. Settings → Servidor → "Inicio automático con el sistema".
2. Activar toggle.
3. El sistema configura automáticamente el servicio del SO.

## 12.9 Conexión de Dispositivos Cliente

### 12.9.1 Desde Tablet o Celular

**Opción A: Escaneo QR**

1. En el PC servidor, abrir `http://localhost:3002/qr`.
2. Mostrar el QR a la tablet/celular.
3. Escanear con la cámara.
4. Se abre el navegador con la app.

**Opción B: IP manual**

1. En el PC servidor, obtener IP:
   - Windows: `ipconfig` → Dirección IPv4
   - macOS/Linux: `ifconfig` o `ip addr`
2. Ejemplo: `192.168.1.10`.
3. En la tablet, abrir navegador → `http://192.168.1.10:3002`.

**Opción C: mDNS**

1. En la tablet, abrir `http://2arbolitos-pos.local:3002`.
2. (Requiere que mDNS esté habilitado en el router/dispositivo).

### 12.9.2 Agregar Acceso Directo en Tablet (PWA)

1. Abrir la URL en Chrome/Safari.
2. Menú → "Agregar a pantalla de inicio".
3. Confirma nombre "2Arbolitos POS".
4. Aparece icono en el escritorio de la tablet como una app.

## 12.10 Solución de Problemas (Troubleshooting)

### 12.10.1 "No se puede conectar a MySQL"

**Causa**: MySQL no está corriendo o credenciales incorrectas.

**Solución**:

```bash
# Windows
net start mysql

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# Verificar
mysql -u root -p
```

### 12.10.2 "Puerto 3002 ocupado"

**Causa**: Otra app usa el puerto.

**Solución**:

```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3002
kill -9 <PID>
```

O cambiar el puerto en `server/.env`:
```env
PORT=3003
```

### 12.10.3 "Service Worker muestra versión antigua"

**Causa**: Caché del navegador.

**Solución**:
- DevTools → Application → Storage → "Clear site data"
- O `Ctrl+Shift+R` para hard reload.
- En Electron, el SW se desregistra automáticamente (ver `electron/main.js:33-49`).

### 12.10.4 "CORS error desde tablet"

**Causa**: Tablet en subred no permitida.

**Solución**: Verificar que la IP de la tablet está en `192.168.x.x` o `10.x.x.x`. Si está en otra subred, agregar al whitelist en `server/src/index.js`.

### 12.10.5 "Conflicto de versionado repetitivo"

**Causa**: Múltiples clientes modificando sin esperar el sync.

**Solución**: El sistema lo maneja automáticamente vía conflict-merge. Si persiste, revisar logs del servidor.

### 12.10.6 "No aparece en bandeja del sistema"

**Causa**: El SO oculta iconos.

**Solución**:
- Windows: Click flecha `^` en bandeja → "Personalizar" → mostrar icono 2Arbolitos.
- macOS: Preferencias → General → Iconos en barra de menús.

## 12.11 Actualización

```bash
# 1. Detener el sistema
# 2. Backup de la BD
mysqldump -u root -p 2arbolitos > backup_pre_update.sql

# 3. Actualizar código
git pull origin main

# 4. Reinstalar dependencias (por si acaso)
npm install
cd server && npm install && cd ..

# 5. Aplicar migraciones Prisma
cd server
npx prisma db push
cd ..

# 6. Reconstruir frontend
npm run build

# 7. Reiniciar
npm start
```

## 12.12 Desinstalación

### Windows

1. Panel de Control → Programas → "2Arbolitos POS" → Desinstalar.
2. Mantener checkbox "Conservar datos" para no perder la BD.
3. Opcional: Eliminar carpeta `C:\Program Files\2Arbolitos POS`.

### Linux/macOS

```bash
pm2 delete 2arbolitos
pm2 save
rm -rf /opt/2arbolitos
```

## 12.13 Conclusión

La instalación de 2Arbolitos está diseñada para ser **lo más simple posible** para el usuario final. El wizard gráfico elimina la necesidad de comandos, y la configuración post-instalación es guiada.

Para administradores técnicos, las opciones manuales (servidor, Docker) ofrecen control total y son ideales para entornos personalizados.
