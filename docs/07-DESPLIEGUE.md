# 07 — Despliegue

## 7.1 Escenarios de Despliegue

2Arbolitos se puede desplegar de **tres formas complementarias**:

1. **Aplicación de escritorio empaquetada** (recomendado para PC servidor).
2. **Servidor Node.js standalone** (para servidores Linux/Mac).
3. **Contenedores Docker** (para entornos cloud o desarrollo reproducible).

## 7.2 Topología de Red LAN

```
                     Internet (opcional)
                          │
                          │  ↑ ↓
                    [Router WiFi]
                   192.168.1.1
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   192.168.1.10      192.168.1.11      192.168.1.12
   ┌─────────┐      ┌──────────┐      ┌──────────┐
   │Servidor │      │ Tablet   │      │ Cocina   │
   │  2A     │◄────►│ Mesero 1 │      │  (KDS)   │
   │  :3002  │      └──────────┘      └──────────┘
   └────┬────┘                            ▲
        │ mDNS:                           │
        │ 2arbolitos-pos.local            │
        ▼                                 │
   ┌─────────┐      ┌──────────┐          │
   │ Tablet  │      │ Celular  │──────────┘
   │ Mesero 2│      │  Admin   │
   └──────────┘      └──────────┘
```

### Componentes de la Topología

| Componente | Función | Requisitos |
|:-----------|:--------|:-----------|
| **Router WiFi** | Conecta todos los dispositivos, asigna IPs DHCP | 802.11n mínimo, ancho de banda bajo (poco tráfico) |
| **PC Servidor** | Ejecuta Node.js + MySQL + (opcional) Electron | 4 GB RAM, 2 GB disco, SO moderno |
| **Tablets Meseros** | Navegador Chrome/Edge apuntando al servidor | Android 8+ / iOS 13+ / Windows |
| **Pantalla Cocina** | KDS en navegador maximizado | TV/Monitor con navegador, puede ser PC vieja |
| **Celular Admin** | Acceso remoto en LAN, lecturas, configuración | Smartphone estándar |

### Direccionamiento

- **Servidor**: IP fija recomendada (configurar en router con DHCP reservation).
- **Servidor mDNS**: `2arbolitos-pos.local:3002` (vía bonjour-service).
- **QR de acceso**: el servidor publica un QR en `/qr` con la URL actual.
- **Subredes permitidas en CORS**: `192.168.x.x`, `10.x.x.x`, `localhost`, `127.0.0.1`.

## 7.3 Diagrama de Despliegue Detallado

```mermaid
flowchart TB
    subgraph EXTERNA["Internet (opcional)"]
        CLOUD[("Backup en la nube<br/>(no incluido)")]
        UPDATES[("GitHub Releases<br/>updates.2arbolitos")]
    end

    subgraph LAN["Red Local del Restaurante (LAN 192.168.1.0/24)"]
        ROUTER[("Router WiFi<br/>192.168.1.1<br/>DHCP Server")]
        
        subgraph SERVIDOR["PC Servidor (192.168.1.10)"]
            ELECTRON["Electron App<br/>(2Arbolitos POS.exe)"]
            NODEJS["Node.js + Express<br/>Puerto 3002"]
            MYSQL[("MySQL 8.0+<br/>Puerto 3306")]
            MDNS["bonjour-service<br/>mDNS Publisher"]
            QR["QR Endpoint<br/>/qr"]
        end
        
        subgraph CLIENTES["Dispositivos Cliente"]
            T1["Tablet Mesero 1<br/>192.168.1.11"]
            T2["Tablet Mesero 2<br/>192.168.1.12"]
            COCINA["Pantalla Cocina<br/>192.168.1.13"]
            ADMIN["Celular Admin<br/>192.168.1.14"]
        end
    end

    ROUTER ---|WiFi| T1
    ROUTER ---|WiFi| T2
    ROUTER ---|Ethernet/WiFi| COCINA
    ROUTER ---|WiFi| ADMIN
    ROUTER ---|Ethernet/WiFi| SERVIDOR

    ELECTRON -.->|carga| NODEJS
    NODEJS --> MYSQL
    NODEJS --> MDNS
    NODEJS --> QR

    T1 -->|HTTP :3002| NODEJS
    T2 -->|HTTP :3002| NODEJS
    COCINA -->|HTTP :3002| NODEJS
    ADMIN -->|HTTP :3002| NODEJS

    MDNS -.anuncia.-> ROUTER

    MYSQL -.backup.-> CLOUD
    ELECTRON -.actualiza.-> UPDATES
```

## 7.4 Despliegue como Aplicación de Escritorio (Electron)

### 7.4.1 Build del Instalador

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar frontend
npm run build

# 3. Generar instalador (Windows)
npm run dist

# Alternativa: solo el .exe sin instalador
npx electron-builder --win --dir
```

**Salida:**

- `release/2Arbolitos POS Setup 1.0.0.exe` — instalador NSIS (~189 MB)
- `release/win-unpacked/2Arbolitos POS.exe` — versión portable

### 7.4.2 Proceso de Instalación (Usuario Final)

1. **Doble clic** en `2Arbolitos POS Setup.exe`.
2. **NSIS Welcome** — "Instalar 2Arbolitos POS".
3. **EULA** — Aceptar licencia.
4. **Directorio** — `C:\Program Files\2Arbolitos POS` (cambiable).
5. **Accesos directos** — Escritorio ✓, Menú inicio ✓.
6. **Instalar** — Extrae ~189 MB.
7. **Finalizar** — Checkbox "Ejecutar 2Arbolitos POS".

### 7.4.3 Primer Inicio (Wizard)

Si no existe `server/.env`, se lanza el **wizard gráfico de 4 pasos** dentro de la propia app:

1. **Bienvenida + Términos** — Logo, descripción, checkbox de aceptación.
2. **Detección del sistema** — Verifica Node.js, MySQL cliente, conexión a BD.
3. **Configuración de MySQL** — Host, puerto, usuario, password, nombre BD.
4. **Finalizar** — Instala deps, genera Prisma client, crea BD, siembra datos, crea accesos directos.

El wizard usa IPC handlers (`ipcMain.handle`) que ejecutan comandos con `execSync` y devuelven resultados a la UI HTML+CSS+JS.

### 7.4.4 System Tray (Bandeja del Sistema)

Una vez instalado, la app muestra un icono en la bandeja con menú:

```
┌─────────────────────────┐
│ ● Estado: Conectado     │
│ ────────────────────    │
│ 🪟 Mostrar ventana      │
│ 📱 Abrir QR acceso      │
│ 🌐 Abrir en navegador   │
│ ────────────────────    │
│ 🔄 Reiniciar servidor   │
│ ❌ Salir                │
└─────────────────────────┘
```

Al cerrar la ventana principal, la app se **minimiza a la bandeja** (no se cierra). Solo "Salir" cierra todo.

## 7.5 Despliegue como Servidor Standalone

Para servidores Linux/Mac o entornos sin Electron:

```bash
# 1. Clonar repositorio
git clone https://github.com/Yefer-Betta/2Arbolitos.git
cd 2Arbolitos

# 2. Instalar dependencias (raíz + server)
npm install
cd server && npm install && cd ..

# 3. Configurar MySQL
sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`2arbolitos\` CHARACTER SET utf8mb4"

# 4. Crear server/.env
cat > server/.env << EOF
PORT=3002
DATABASE_URL="mysql://root:password@localhost:3306/2arbolitos?schema=public&charset=utf8mb4"
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
EOF

# 5. Inicializar Prisma
cd server
npx prisma generate
npx prisma db push
node prisma/seed.js
cd ..

# 6. Build frontend
npm run build

# 7. Iniciar con PM2 (producción)
npm install -g pm2
pm2 start npm --name "2arbolitos-server" -- run api
pm2 startup
pm2 save

# 8. Abrir navegador
xdg-open http://localhost:3002  # Linux
open http://localhost:3002       # macOS
```

## 7.6 Despliegue con Docker

### 7.6.1 docker-compose.yml (Producción)

```yaml
versión: '3.8'

services:
  mysql:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: 2arbolitos
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: always
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/2arbolitos?schema=public&charset=utf8mb4
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3002
    ports:
      - "3002:3002"
    volumes:
      - ./dist:/app/dist

volumes:
  mysql_data:
```

### 7.6.2 Comandos

```bash
# Levantar todo
docker compose up -d

# Ver logs
docker compose logs -f app

# Detener
docker compose down

# Reconstruir
docker compose up -d --build

# Sembrar datos
docker compose exec -T app node server/prisma/seed.js
```

## 7.7 CI/CD con GitHub Actions

Workflow en `.github/workflows/docker-build.yml`:

```yaml
name: Docker Build

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build frontend
        run: npm ci && npm run build
      
      - name: Build server
        run: cd server && npm ci
      
      - name: Build Docker image
        run: docker build -t 2arbolitos:${{ github.sha }} .
      
      - name: Push to registry
        if: github.event_name == 'push'
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push 2arbolitos:${{ github.sha }}
```

## 7.8 Consideraciones de Red

### 7.8.1 CORS

El backend permite solo orígenes confiables:

```javascript
const allowedPatterns = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
];
```

### 7.8.2 Puertos

| Puerto | Servicio | Notas |
|:-------|:---------|:------|
| 3002 | Express Server (frontend + API) | Configurable via `PORT` |
| 3306 | MySQL | Estándar |
| 5353 | mDNS (UDP) | Bonjour / Avahi |

### 7.8.3 Firewall

En Windows, permitir Node.js en redes privadas:

```powershell
New-NetFirewallRule -DisplayName "2Arbolitos Node" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow -Profile Private
```

### 7.8.4 Auto-Start

Configurable en `Settings → Servidor → Inicio automático`. Implementa:

- **Windows**: tarea programada con `npx pm2-startup install`
- **macOS**: `launchd` plist
- **Linux**: `systemd` service

## 7.9 Backup y Recuperación

### 7.9.1 Backup Manual

```bash
mysqldump -u root -p 2arbolitos > backup_$(date +%Y%m%d).sql
```

### 7.9.2 Backup Automatizado (cron Linux)

```bash
# /etc/cron.daily/2arbolitos-backup
mysqldump -u root -p"$MYSQL_PWD" 2arbolitos | gzip > /backups/2arbolitos_$(date +\%Y\%m\%d).sql.gz
find /backups -name "2arbolitos_*.sql.gz" -mtime +30 -delete
```

### 7.9.3 Restaurar

```bash
mysql -u root -p 2arbolitos < backup_20260603.sql
```

### 7.9.4 Backup desde la UI

En `Settings → Datos → Backup/Restore`:

- **Descargar backup** — exporta todas las tablas a JSON.
- **Restaurar desde archivo** — sube JSON y reemplaza datos.
- **Solo para datos de usuario** (no incluye estructura).

## 7.10 Monitoreo

### Endpoint de Salud

```bash
curl http://localhost:3002/api/health
# {"status":"ok","timestamp":"2026-06-03T21:00:00.000Z"}
```

### Comando CLI

```bash
npm run health
```

Muestra:
- Estado del servidor (up/down)
- Latencia a MySQL
- Número de dispositivos SSE conectados
- Memoria del proceso Node.js
