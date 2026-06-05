# 13 — Manual de Usuario

> 📷 **Nota sobre capturas**: Las imágenes referenciadas como `[CAPTURA REQUERIDA]` deben ser reemplazadas con screenshots reales de la app en uso. Se sugiere resolución 1280×720 para desktop y 375×812 para móvil.

## 13.1 Roles de Usuario

| Rol | Permisos | Uso típico |
|:----|:---------|:-----------|
| **👑 Administrador** | Acceso total: usuarios, menú, finanzas, configuración | Dueño, gerente |
| **🛒 Mesero** | Tomar pedidos, modificar mesas, ver estado | Personal de salón |
| **🧑‍🍳 Cocina** | Ver cola KDS, marcar estados de preparación | Cocineros |
| **💰 Cajero** | Procesar pagos, descuentos, vueltos, cierres | Caja |

## 13.2 Acceso Inicial

### Login

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/01-login.png`

1. Abrir 2Arbolitos POS (app o navegador).
2. En la pantalla de inicio, ingresar:
   - **Usuario**: `admin` (o su usuario)
   - **Contraseña**: `admin123` (la inicial)
3. Click "Ingresar".

> ⚠️ **Cambie la contraseña del admin inmediatamente después del primer ingreso** (mejora pendiente en UI).

### Recuperar Contraseña Olvidada

(No implementado en v1.0)

Solución temporal: editar directamente en la base de datos:

```sql
UPDATE users 
SET password = '$2a$10$...' -- hash bcrypt generado
WHERE username = 'admin';
```

O usar el script:

```bash
node scripts/reset-password.js admin nuevaPassword123
```

## 13.3 Manual del Mesero

### 13.3.1 Tomar un Pedido en Mesa

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/02-mesas.png` y `03-pos.png`

1. En la **Vista de Mesas** (icono 🪑 en sidebar), localizar la mesa del cliente.
2. Click en la mesa. Si está libre, se abre el POS. Si está ocupada, ves el pedido actual.
3. En el **POS**:
   - Usar la **búsqueda** (🔍) o seleccionar una **categoría** arriba.
   - Tocar el producto deseado para agregarlo al carrito.
   - El producto aparece en el **panel derecho** con cantidad 1.
   - Para modificar cantidad: usar botones **+/−** en el carrito.
   - Para eliminar: tocar el **X** al lado del item.
4. Cuando el pedido esté completo, tocar **"Cobrar"**.

### 13.3.2 Cobrar / Procesar Pago

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/05-checkout.png`

1. Click en "💳 Cobrar".
2. Se abre el modal con el total en COP y USD.
3. **Seleccionar método de pago**:
   - **💵 COP**: pago en efectivo colombiano
   - **💵 USD**: pago en efectivo dólar
   - **📱 Nequi**: transferencia Nequi
   - **💳 Tarjeta**: datáfono
4. Si es efectivo, **ingresar monto recibido**. La app calcula el vuelto automáticamente.
5. **Aplicar descuento** (opcional): % o valor fijo.
6. Click "**✓ Confirmar Pago**".
7. Se genera el **ticket** y la mesa se libera.

### 13.3.3 Modificar un Pedido Existente

1. En Vista de Mesas, click en la mesa ocupada.
2. Se abre el POS con los items actuales.
3. Agregar/quitar/modificar productos según necesidad.
4. Los cambios se sincronizan automáticamente en todos los dispositivos.

### 13.3.4 Pedido Para Llevar

1. Vista de Mesas → botón **"+ Para Llevar"** (parte inferior).
2. Se abre el POS con un pedido temporal.
3. Agregar productos.
4. Cobrar normalmente.

### 13.3.5 Pedido a Domicilio

1. Vista de Mesas → botón **"+ Domicilio"**.
2. Se abre el POS.
3. (Pendiente UI) Ingresar dirección de entrega.
4. Agregar productos.
5. Cobrar.

## 13.4 Manual del Cocinero

### 13.4.1 Ver Cola de Pedidos (KDS)

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/04-kds.png`

1. Abrir la app con usuario `cocina`.
2. Aparece el **Kitchen Display System** (KDS) con 3 columnas:
   - 🟡 **Pendientes** — recién llegados
   - 🟠 **En Preparación** — aceptados
   - 🟢 **Listos** — terminados
3. Cada pedido muestra: número de mesa, items con cantidades, notas, tiempo transcurrido.

### 13.4.2 Aceptar un Pedido

1. En la columna **Pendientes**, localizar el pedido.
2. Click en **"✓ Aceptar"**.
3. El pedido se mueve a **En Preparación**.

### 13.4.3 Marcar como Listo

1. En la columna **En Preparación**, cuando el plato esté terminado.
2. Click en **"✓ Listo"**.
3. El pedido se mueve a **Listas** y suena alerta para el mesero.

### 13.4.4 Marcar como Entregado

1. En la columna **Listas**, cuando el mesero retira.
2. Click en **"✓ Entregado"**.
3. El pedido sale del KDS.

### 13.4.5 Cancelar un Plato

(Pendiente en UI. Por ahora, contactar al administrador.)

## 13.5 Manual del Cajero

### 13.5.1 Procesar Pago (ya cubierto en 13.3.2)

### 13.5.2 Aplicar Descuento

1. En el modal de cobro, click en **"Aplicar Descuento"** (icono %).
2. Elegir tipo:
   - **Porcentaje** (ej: 10%): se descuenta del subtotal.
   - **Valor fijo** (ej: $5000): se resta directamente.
3. Ingresar valor.
4. El total se actualiza.
5. Confirmar el pago.

### 13.5.3 Generar Ticket

El ticket se genera automáticamente al confirmar el pago. Opciones:

- **🖨️ Imprimir**: requiere impresora conectada. (Pendiente: integración con driver).
- **📧 Email**: enviar al cliente. (Pendiente en UI).
- **📱 Mostrar en pantalla**: el ticket aparece con código QR de validación.

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/07-ticket.png`

### 13.5.4 Cierre de Caja (Reporte Z)

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/08-cierre.png`

1. Sidebar → **📊 Finanzas**.
2. Click en **"Cerrar Caja"**.
3. El sistema muestra preview:
   - Total de órdenes del día
   - Ventas por método de pago
   - Gastos operativos
   - Neto del día
4. Confirmar.
5. Se guarda el **Closure** con snapshot.
6. Opcional: exportar a PDF (mejora futura).

## 13.6 Manual del Administrador

### 13.6.1 Configuración Inicial

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/06-settings.png`

#### Pestaña Negocio

1. Sidebar → **⚙️ Configuración**.
2. Pestaña **🏪 Negocio**.
3. **Tasa de Cambio**: ingresar valor actual (ej: 4200 COP por USD).
4. **Datos del Negocio**:
   - Nombre
   - Dirección
   - Teléfono
   - Logo (subir imagen)
5. Click "**💾 Guardar**".

#### Pestaña Móvil

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/09-qr.png`

1. Pestaña **📱 Móvil**.
2. Aparece el **código QR** para acceso desde dispositivos móviles.
3. Opciones:
   - **📥 Descargar QR**: guarda como PNG.
   - **📋 Copiar URL**: copia la URL del servidor.
   - **🌐 Abrir /qr**: abre la página completa con QR.

#### Pestaña Datos (Backup)

1. Pestaña **💾 Datos**.
2. **Descargar Backup**: exporta todos los datos a JSON.
3. **Restaurar Backup**: sube un JSON previo.
4. (Pendiente) Programar backup automático.

#### Pestaña Servidor

1. Pestaña **🖥️ Servidor**.
2. **Estado de Sincronización**: ver dispositivos conectados.
3. **Auto-Start**: toggle para iniciar con el sistema.

### 13.6.2 Gestión de Usuarios (Pendiente en UI)

(No implementado completamente en v1.0. Solución: editar BD directamente.)

```sql
-- Crear usuario
INSERT INTO users (id, username, password, name, role, active, createdAt, updatedAt)
VALUES (UUID(), 'nuevo_user', '$2a$10$...', 'Nombre', 'WAITER', true, NOW(), NOW());

-- Cambiar rol
UPDATE users SET role = 'ADMIN' WHERE username = 'nuevo_user';

-- Desactivar
UPDATE users SET active = false WHERE username = 'usuario_viejo';
```

### 13.6.3 Gestión del Menú

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/10-menu.png`

1. Sidebar → **📋 Menú** (o `MenuManager.jsx`).
2. Aparece lista de **categorías** con sus productos.
3. **Agregar categoría**:
   - Click en "+ Nueva Categoría".
   - Ingresar nombre.
4. **Agregar producto**:
   - Click en "+ Nuevo Producto" dentro de una categoría.
   - Completar: nombre, precio, moneda (COP/USD), descripción, imagen.
5. **Editar/Eliminar**: usar botones en cada item.

### 13.6.4 Historial de Ventas

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/11-historial.png`

1. Sidebar → **📜 Historial**.
2. Lista de órdenes con:
   - Fecha
   - Mesa o tipo
   - Total
   - Estado
   - Método de pago
3. **Filtros**:
   - Por fecha (rango)
   - Por estado
   - Por tipo (mesa/llamar/domicilio)
4. Click en una orden para ver **detalle completo**.

### 13.6.5 Registrar Gasto Operativo

1. Sidebar → **📊 Finanzas** → **Gastos**.
2. Click en "+ Nuevo Gasto".
3. Completar:
   - Descripción (ej: "Insumos verduras")
   - Categoría (Insumos / Servicios / Nómina / Otros)
   - Monto
   - Fecha
4. Guardar.

## 13.7 Atajos de Teclado

| Atajo | Acción |
|:------|:-------|
| `F1` | Abrir ayuda |
| `F2` | Vista de Mesas |
| `F3` | POS (si hay mesa seleccionada) |
| `F4` | KDS Cocina |
| `F5` | Actualizar datos |
| `Ctrl+N` | Nuevo pedido |
| `Ctrl+S` | Guardar configuración |
| `Esc` | Cerrar modal actual |
| `Tab` | Navegar entre campos |

(Algunos atajos pendientes de implementación.)

## 13.8 Iconografía (Lucide)

| Icono | Significado |
|:------|:------------|
| 🪑 (Chair) | Vista de Mesas |
| 🛒 (ShoppingCart) | Punto de Venta |
| 🧑‍🍳 (ChefHat) | Cocina KDS |
| 📋 (ClipboardList) | Gestión de Menú |
| 📊 (BarChart) | Finanzas |
| 📜 (History) | Historial |
| ⚙️ (Settings) | Configuración |
| 💳 (CreditCard) | Cobrar / Pagos |
| 🧾 (Receipt) | Ticket |
| 💰 (DollarSign) | Ingresos / Vueltos |
| 📉 (TrendingDown) | Gastos |
| 📈 (TrendingUp) | Ganancias |
| 🔍 (Search) | Buscar |
| ➕ (Plus) | Agregar |
| ➖ (Minus) | Quitar |
| ✕ (X) | Cerrar / Eliminar |
| ✓ (Check) | Confirmar |
| 🔔 (Bell) | Notificaciones |
| 📶 (Wifi) | Online |
| 📴 (WifiOff) | Offline |
| 🔄 (RefreshCw) | Sincronizar |

## 13.9 FAQ (Preguntas Frecuentes)

### ¿Cómo cambio la contraseña del admin?

(Pendiente en UI) Directamente en la base de datos. Ver sección 13.6.2.

### ¿Puedo usar el sistema sin internet?

✅ Sí. Solo necesitas la red local (WiFi) del restaurante. Internet no es necesario.

### ¿Cuántos dispositivos puedo conectar?

Ilimitado, limitado por la capacidad del router WiFi. Probado con 5 dispositivos. Teóricamente soporta 20+ sin problemas.

### ¿Cómo hago backup de los datos?

**Opción 1**: Settings → Datos → Descargar Backup (JSON).

**Opción 2**: `mysqldump -u root -p 2arbolitos > backup.sql` (avanzado, recomendado).

### ¿Cómo cambio la tasa de cambio?

Settings → Negocio → Tasa de Cambio. Guardar.

### ¿Qué pasa si se va la luz durante un cobro?

El pedido queda en la mesa con su estado. Al volver la luz, la sincronización retoma automáticamente. No se pierden datos gracias al versionado.

### ¿Puedo usar el sistema desde dos ciudades diferentes?

❌ No, está diseñado para LAN local. Para multi-sucursal se necesitaría una versión con servidor central en la nube (roadmap v2).

### ¿Funciona con touchscreen resistivo o capacitivo?

✅ Ambos. El sistema usa eventos `pointer` estándar que funcionan con cualquier tipo de touch.

### ¿Soporta lector de código de barras?

❌ No en v1.0. Pendiente roadmap v1.1.

### ¿Soporta báscula de peso?

❌ No en v1.0.

## 13.10 Soporte Técnico

- **Repositorio**: https://github.com/Yefer-Betta/2Arbolitos/issues
- **Email**: _(definir)_
- **WhatsApp soporte**: _(definir)_

Para reportar bugs, por favor incluir:
1. Versión del software (menú Configuración → Acerca de).
2. Sistema operativo y versión.
3. Pasos para reproducir el problema.
4. Captura de pantalla o video (si aplica).
5. Logs del servidor (si está disponible).
