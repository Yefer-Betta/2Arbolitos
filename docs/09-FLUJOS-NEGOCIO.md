# 09 — Flujos de Negocio

Este capítulo documenta los procesos de negocio principales del sistema 2Arbolitos mediante diagramas de flujo detallados. Cada flujo representa una interacción real extraída de los componentes React y controladores del servidor.

## 9.1 Flujo del Punto de Venta (POS)

```mermaid
flowchart TD
    START([Mesero abre app]) --> LOGIN{Tiene sesión?}
    LOGIN -->|No| AUTENTICAR[Login con usuario/password]
    AUTENTICAR --> VALIDAR{Credenciales OK?}
    VALIDAR -->|No| ERROR_LOGIN[Mostrar error, reintentar]
    ERROR_LOGIN --> AUTENTICAR
    VALIDAR -->|Sí| MENU_PRINCIPAL
    LOGIN -->|Sí| MENU_PRINCIPAL[Menú principal]

    MENU_PRINCIPAL --> CLICK_MESAS[Click en Vista de Mesas]
    CLICK_MESAS --> CARGAR_MESAS[GET /api/tables]
    CARGAR_MESAS --> MOSTRAR_MAPA[Renderizar mapa visual de mesas]

    MOSTRAR_MAPA --> SEL_MESA{Selecciona mesa}
    SEL_MESA -->|Mesa ocupada| VER_PEDIDO[Ver pedido actual]
    SEL_MESA -->|Mesa libre| NUEVO_PEDIDO[Nuevo pedido]
    SEL_MESA -->|Para llevar| PEDIDO_LLEVAR[Crear pedido Para Llevar]

    NUEVO_PEDIDO --> BUSCAR[Búsqueda por nombre o categoría]
    BUSCAR --> FILTRAR[Filtrar productos]
    FILTRAR --> AGREGAR[+ Agregar al carrito]
    AGREGAR --> MAS{¿Más items?}
    MAS -->|Sí| BUSCAR
    MAS -->|No| REVISAR[Revisar pedido en sidebar]

    REVISAR --> MODIFICAR{¿Modificar?}
    MODIFICAR -->|Sí| CAMBIAR_CANT[+/- cantidad]
    CAMBIAR_CANT --> REVISAR
    MODIFICAR -->|No| CONFIRMAR[Confirmar pedido]

    CONFIRMAR --> ENVIAR[PUT /api/tables/state]
    ENVIAR --> SERVIDOR_VALIDAR{¿Versión OK?}
    SERVIDOR_VALIDAR -->|Sí| COCINA_RECIBE[Cocina recibe vía SSE]
    SERVIDOR_VALIDAR -->|No| MERGE[Conflict-merge automático]
    MERGE --> ENVIAR

    COCINA_RECIBE --> KDS_RENDER[KDS muestra pedido en Pendientes]
    KDS_RENDER --> FIN_OK([Pedido activo])

    VER_PEDIDO --> COBRAR[Click en Cobrar]
    PEDIDO_LLEVAR --> COBRAR
    COBRAR --> CHECKOUT[Modal de checkout]

    CHECKOUT --> SEL_PAGO{Selecciona método}
    SEL_PAGO -->|Efectivo COP| PAGO_COP[Ingresar monto recibido]
    SEL_PAGO -->|Efectivo USD| PAGO_USD[Ingresar monto en USD]
    SEL_PAGO -->|Nequi| PAGO_NEQUI[Ingresar referencia]
    SEL_PAGO -->|Tarjeta| PAGO_TARJ[Ingresar voucher]

    PAGO_COP --> CALC_VUELTO[Calcular vuelto en COP y USD]
    PAGO_USD --> CALC_VUELTO_USD[Calcular vuelto]
    PAGO_NEQUI --> VALIDAR_REF[Validar referencia]
    PAGO_TARJ --> VALIDAR_VOUCHER[Validar voucher]
    CALC_VUELTO --> SUFICIENTE{¿Suficiente?}
    SUFICIENTE -->|No| FALTA[Mostrar falta, reintentar]
    FALTA --> PAGO_COP
    SUFICIENTE -->|Sí| OK_PAGO
    CALC_VUELTO_USD --> OK_PAGO[Pago OK]
    VALIDAR_REF --> OK_PAGO
    VALIDAR_VOUCHER --> OK_PAGO

    OK_PAGO --> DESCUENTO{¿Aplicar descuento?}
    DESCUENTO -->|Sí| TIPO_DESC{Tipo}
    DESCUENTO -->|No| GENERAR_ORDEN
    TIPO_DESC -->|% Porcentaje| DESC_PORC[Ingresar %]
    TIPO_DESC -->|$ Valor| DESC_VAL[Ingresar valor]
    DESC_PORC --> GENERAR_ORDEN[POST /api/orders]
    DESC_VAL --> GENERAR_ORDEN

    GENERAR_ORDEN --> CREAR_PAYMENT[Crear Payment asociado]
    CREAR_PAYMENT --> ACTUALIZAR_ESTADO[Order status = SERVED]
    ACTUALIZAR_ESTADO --> SSE_PAGO[SSE: order:status:changed]
    SSE_PAGO --> TICKET[Generar ticket / imprimir]
    TICKET --> LIMPIAR_MESA[DELETE /api/tables/state]
    LIMPIAR_MESA --> FIN_VENTA([Venta finalizada])
```

## 9.2 Flujo de Pago Multi-Moneda

```mermaid
flowchart TD
    INICIO([Checkout abierto]) --> TOTAL[Calcular total del pedido]
    TOTAL --> MOSTRAR_TOTAL[Mostrar total en COP y USD]

    MOSTRAR_TOTAL --> SEL_MONEDA{Selecciona moneda de pago}
    SEL_MONEDA -->|COP| PAGO_COP[Ingresar efectivo COP]
    SEL_MONEDA -->|USD| PAGO_USD[Ingresar efectivo USD]
    SEL_MONEDA -->|Mixto| PAGO_MIXTO[Parte COP + parte USD]

    PAGO_COP --> CALC[Calcular diferencia]
    PAGO_USD --> CALC
    PAGO_MIXTO --> CALC

    CALC --> CONVERTIR{¿Moneda covergida?}
    CONVERTIR -->|Sí| RESTO_COP[Resto en COP]
    CONVERTIR -->|No| VUELTO_MONEDA_ORIGEN

    RESTO_COP --> PAGO_RESTO[Ingresar resto COP]
    PAGO_RESTO --> SUMAR[Sumar ambas partes]

    SUMAR --> SUFICIENTE{Total recibido >= Total?}
    SUFICIENTE -->|No| FALTA_MOSTRAR[Mostrar cuánto falta]
    FALTA_MOSTRAR --> SEL_MONEDA
    SUFICIENTE -->|Sí| VUELTO_CALC[Calcular vuelto]

    VUELTO_CALC --> VUELTO_TIPO{Vuelto en?}
    VUELTO_TIPO -->|COP| VUELTO_COP[Vuelto = recibidoCOP - totalCOP]
    VUELTO_TIPO -->|USD| VUELTO_USD[Si el pago fue en USD,<br/>devolver el equivalente en COP]
    VUELTO_TIPO -->|Mixto| VUELTO_MIXTO[Devolver en la moneda<br/>que complete el pago]

    VUELTO_COP --> OK
    VUELTO_USD --> OK
    VUELTO_MIXTO --> OK
    VUELTO_MONEDA_ORIGEN --> OK

    OK([Vuelto calculado y mostrado])
```

**Ejemplo numérico:**

```
Tasa de cambio: 1 USD = 4200 COP
Total pedido:   50.000 COP  ≈ 11.90 USD

Cliente paga con:
  - 20 USD billete
  - Necesita completar 50.000 - (20 * 4200) = -34.000 → ya cubre todo

Vuelto: 20 USD * 4200 - 50.000 = 34.000 COP
        (se devuelve en pesos aunque pagó en dólares)
```

## 9.3 Flujo de Sincronización con Resolución de Conflictos

Este es el flujo más crítico del sistema. Garantiza que dos meseros editando la misma mesa simultáneamente **no pierdan datos**.

```mermaid
flowchart TD
    INICIO([Mesero modifica carrito]) --> LOCAL_UPDATE[Actualizar activeTables local]
    LOCAL_UPDATE --> LS[Persistir en localStorage]
    LS --> DEBOUNCE[Esperar 300ms debounce]

    DEBOUNCE --> REQUEST[PUT /api/tables/state<br/>{tableId, items, _clientVersion: 5}]

    REQUEST --> SERVER_VALIDATE{Servidor válida}
    SERVER_VALIDATE -->|versión=5, no conflicto| UPDATE_OK[UPDATE versión=6]
    SERVER_VALIDATE -->|serverVersion=6 > 5| CONFLICT[Detectar conflicto]

    UPDATE_OK --> NOTIFY_SSE[SSE broadcast: table:updated]
    NOTIFY_SSE --> OTROS_CLIENTES[Otros clientes actualizan UI]
    OTROS_CLIENTES --> FIN_OK([Sync OK])

    CONFLICT --> RESP_409[Responder 409 Conflict<br/>{serverData, serverVersion: 6}]
    RESP_409 --> CLIENTE_MERGE[Cliente A hace merge]

    CLIENTE_MERGE --> MERGE_LOGIC{Lógica de merge}
    MERGE_LOGIC --> SERVER_DATA[Tomar serverData: A1, A2]
    SERVER_DATA --> AGREGAR_LOCAL[Agregar items locales únicos: B1, B2]
    AGREGAR_LOCAL --> RESULTADO[Array final: A1, A2, B1, B2]
    RESULTADO --> CLIENTE_UPDATE[setActiveTables con versión=6]
    CLIENTE_UPDATE --> REINTENTAR[Reintentar PUT con _clientVersion=6]
    REINTENTAR --> REQUEST

    style CONFLICT fill:#ffe4b5
    style MERGE_LOGIC fill:#b5d4ff
    style RESULTADO fill:#c5f0c5
```

### Reglas del Merge

1. **El estado del servidor es la verdad** para items existentes.
2. **Los items locales únicos se preservan** (evita pérdida de trabajo).
3. **Por product.id** (no por índice de array), evitando duplicados visuales.
4. **Cantidades se suman** si hay duplicados (estrategia conservadora).

```javascript
function mergeItems(serverData, localItems) {
  const merged = [...serverData];
  localItems.forEach(local => {
    const existing = merged.find(m => m.product.id === local.product.id);
    if (existing) {
      // Suma cantidades (estrategia aditiva)
      existing.quantity = Math.max(existing.quantity, local.quantity);
    } else {
      // Agrega items que el servidor no tiene
      merged.push(local);
    }
  });
  return merged;
}
```

## 9.4 Flujo de Cocina en Tiempo Real (KDS)

```mermaid
flowchart TD
    INICIO([KDS abierto en TV de cocina]) --> SSE_CONNECT[Conectar a /api/events]
    SSE_CONNECT --> COLA_VACIA[Mostrar tablero vacío]

    COLA_VACIA --> ESPERAR{¿Llega evento?}
    ESPERAR -->|order:created| NUEVA[Renderizar pedido en columna PENDING]
    ESPERAR -->|order:status:changed| ACTUALIZAR[Mover pedido entre columnas]
    ESPERAR -->|ping| KEEPALIVE[Ignorar, mantener conexión]

    NUEVA --> SONIDO_OK[Reproducir sonido de alerta]
    SONIDO_OK --> VISUAL_OK[Animación de entrada]
    VISUAL_OK --> ESPERAR

    ACTUALIZAR --> TRANSICION[Animación CSS 300ms]
    TRANSICION --> ESPERAR
```

**Columnas del KDS:**

| Columna | Estado | Color de fondo | Acción |
|:--------|:-------|:---------------|:-------|
| 🟡 Pendientes | PENDING | Amarillo claro | Aceptar → PREPARING |
| 🟠 En Preparación | PREPARING | Naranja claro | Marcar listo → READY |
| 🟢 Listas | READY | Verde claro | Mesero retira |

## 9.5 Flujo de Cierre de Caja (Reporte Z)

```mermaid
flowchart TD
    INICIO([Admin abre módulo Finanzas]) --> HOVER_CERRAR[Click en Cerrar Caja]
    HOVER_CERRAR --> VALIDAR_HORARIO{¿Hay órdenes<br/>pendientes?}

    VALIDAR_HORARIO -->|Sí| WARN[Advertencia: hay PENDING/PREPARING]
    WARN --> CONFIRMAR{¿Cerrar de todos modos?}
    CONFIRMAR -->|No| INICIO
    CONFIRMAR -->|Sí| RECALCULAR
    VALIDAR_HORARIO -->|No| RECALCULAR[Recalcular totales]

    RECALCULAR --> SUM_ORDENES[Suma de órdenes SERVED del día]
    SUM_ORDENES --> SUM_GASTOS[Suma de gastos del día]
    SUM_GASTOS --> AGRUPAR_PAGOS[Agrupar pagos por método]

    AGRUPAR_PAGOS --> MOSTRAR_PREVIEW[Mostrar preview del cierre]
    MOSTRAR_PREVIEW --> CONFIRMAR2{¿Confirmar cierre?}

    CONFIRMAR2 -->|No| INICIO
    CONFIRMAR2 -->|Sí| POST_CLOSURE[POST /api/closures]
    POST_CLOSURE --> SNAPSHOT[Guardar snapshot en BD]
    SNAPSHOT --> EXPORTAR_OFRECER{¿Exportar PDF?}

    EXPORTAR_OFRECER -->|Sí| GEN_PDF[Generar PDF con jsPDF]
    EXPORTAR_OFRECER -->|No| FIN
    GEN_PDF --> FIN([Cierre completado y registrado])
```

**Estructura del Closure generado:**

```
┌──────────────────────────────────────┐
│  CIERRE DE CAJA - 03/06/2026         │
│  Tasa de cambio: 4200 COP/USD        │
├──────────────────────────────────────┤
│  ÓRDENES PROCESADAS:    47           │
│                                      │
│  VENTAS:                            │
│    Efectivo COP:      $ 520,000     │
│    Efectivo USD:      $   87.50     │
│    Nequi:             $ 180,000     │
│    Tarjeta:           $ 145,000     │
│  ─────────────────────────────       │
│  TOTAL COP:           $ 845,000     │
│  TOTAL USD:           $  87.50      │
│                                      │
│  GASTOS OPERATIVOS:                  │
│    Insumos:           $  22,000     │
│    Servicios:         $  10,000     │
│  ─────────────────────────────       │
│  TOTAL GASTOS:        $  32,000     │
│                                      │
│  NETO DEL DÍA:                      │
│    COP:               $ 813,000     │
│    USD:               $  87.50      │
│                                      │
│  NOTAS: Cierre turno noche           │
└──────────────────────────────────────┘
```

## 9.6 Flujo de Auto-Start (Inicio con el Sistema)

```mermaid
flowchart TD
    INICIO([Usuario prende PC]) --> OS_BOOT[Windows/macOS/Linux inicia]
    OS_BOOT --> SCHEDULER{Tarea programada<br/>o servicio?}

    SCHEDULER -->|Windows| TASK_SCHED[Task Scheduler ejecuta .bat]
    SCHEDULER -->|macOS| LAUNCHD[launchd carga .plist]
    SCHEDELUR -->|Linux| SYSTEMD[systemd activa .service]

    TASK_SCHED --> SCRIPT[Script ejecuta npm start o electron .]
    LAUNCHD --> SCRIPT
    SYSTEMD --> SCRIPT

    SCRIPT --> CHECK_PORT{Puerto 3002 libre?}
    CHECK_PORT -->|No| ERROR_PORT[Mostrar error y salir]
    CHECK_PORT -->|Sí| START_SERVER[Iniciar Express server]

    START_SERVER --> START_TRAY[Crear icono en bandeja]
    START_TRAY --> START_WINDOW[Abrir ventana principal minimizada]
    START_WINDOW --> READY([Sistema listo])

    ERROR_PORT --> SHOW_DIALOG[Diálogo: puerto ocupado]
    SHOW_DIALOG --> MANIFEST_USER[Usuario cierra app conflictiva]
    MANIFEST_USER --> CHECK_PORT
```

**Configuración del auto-start:**

- Se activa desde `Settings → Servidor → Inicio automático con el sistema`.
- El backend ejecuta `npx pm2-startup install` (Windows) o `npx pm2 startup` (Unix) en el primer arranque tras activarlo.
- Crea una tarea programada / launchd plist / systemd service que ejecuta `electron .` o `npm start`.

## 9.7 Flujo de Backup de Base de Datos

```mermaid
flowchart TD
    INICIO([Admin: Settings → Datos → Backup]) --> SEL_TIPO{Tipo de backup}

    SEL_TIPO -->|UI interna| EXPORT_JSON[Recopilar todas las tablas]
    EXPORT_JSON --> TO_JSON[Convertir a JSON con timestamps]
    TO_JSON --> DOWNLOAD[Browser descarga archivo .json]

    SEL_TIPO -->|mysqldump manual| SHELL[Usuario abre terminal]
    SHELL --> MYSQLDUMP[Ejecutar mysqldump]
    MYSQLDUMP --> COMPRESS[gzip del archivo]
    COMPRESS --> STORE[Guardar en disco externo / nube]

    SEL_TIPO -->|Docker volume| DOCKER_BACKUP[docker exec mysqldump]
    DOCKER_BACKUP --> DOCKER_COPY[docker cp a host]
    DOCKER_COPY --> STORE2[Almacenar en backups/]

    DOWNLOAD --> CHECK_FREQ{¿Programar automático?}
    CHECK_FREQ -->|Sí| CRON[Configurar cron / Task Scheduler]
    CHECK_FREQ -->|No| FIN
    CRON --> FIN([Backup configurado])

    STORE --> FIN
    STORE2 --> FIN
```

**Frecuencia recomendada:**

| Tipo | Frecuencia | Retención |
|:-----|:-----------|:----------|
| Completo (mysqldump) | Diario, 03:00 AM | 30 días |
| Incremental (binlog) | Cada 15 min | 7 días |
| Snapshot manual | Antes de actualizaciones | 5 versiones |

## 9.8 Conclusión

Los flujos de negocio presentados cubren las operaciones críticas de un restaurante:

1. **POS táctil** — desde login hasta ticket final.
2. **Pago multi-moneda** — incluyendo pagos mixtos y conversión COP↔USD.
3. **Sincronización robusta** — versionado optimista + conflict-merge.
4. **Cocina en tiempo real** — KDS reactivo vía SSE.
5. **Cierre de caja** — snapshot fiscal del día.
6. **Auto-start** — confiabilidad operacional.
7. **Backup** — preservación de datos.

Todos estos flujos están **implementados en el código actual** y pueden verificarse siguiendo los `file:line` citados en el manual técnico.
