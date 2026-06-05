# 05 — Diagramas UML

Este capítulo presenta los diagramas UML que modelan el sistema 2Arbolitos. Todos los diagramas están escritos en sintaxis Mermaid y se renderizan automáticamente en GitHub, VS Code y la mayoría de visores Markdown modernos.

## 5.1 Diagrama de Casos de Uso

Los casos de uso están agrupados por actor (rol de usuario).

```mermaid
flowchart LR
    %% Actores
    ADMIN(["👤 Administrador"])
    MESERO(["👤 Mesero"])
    COCINA(["👤 Cocina"])
    CAJERO(["👤 Cajero"])
    SISTEMA([🖥️ Sistema])

    %% Casos de uso - Administrador
    subgraph ADMIN_UC[" "]
        UC1[Gestionar Usuarios]
        UC2[Gestionar Menú y Categorías]
        UC3[Ver Reportes Financieros]
        UC4[Cerrar Caja Z]
        UC5[Registrar Gastos Operativos]
        UC6[Configurar Sistema]
        UC7[Respaldar Base de Datos]
    end

    %% Casos de uso - Mesero
    subgraph MESERO_UC[" "]
        UC8[Tomar Pedido en Mesa]
        UC9[Ver Estado de Mesas]
        UC10[Modificar Pedido]
        UC11[Transferir Mesa]
    end

    %% Casos de uso - Cocina
    subgraph COCINA_UC[" "]
        UC12[Ver Cola de Pedidos]
        UC13[Marcar como En Preparación]
        UC14[Marcar como Listo]
    end

    %% Casos de uso - Cajero
    subgraph CAJERO_UC[" "]
        UC15[Procesar Pago]
        UC16[Aplicar Descuento]
        UC17[Generar Vuelto Multi-moneda]
        UC18[Emitir Ticket]
    end

    %% Sistema
    UC19[Sincronizar Cambios SSE]
    UC20[Resolver Conflictos]
    UC21[Detectar Desconexiones]

    %% Relaciones
    ADMIN --> UC1
    ADMIN --> UC2
    ADMIN --> UC3
    ADMIN --> UC4
    ADMIN --> UC5
    ADMIN --> UC6
    ADMIN --> UC7

    MESERO --> UC8
    MESERO --> UC9
    MESERO --> UC10
    MESERO --> UC11

    COCINA --> UC12
    COCINA --> UC13
    COCINA --> UC14

    CAJERO --> UC15
    CAJERO --> UC16
    CAJERO --> UC17
    CAJERO --> UC18

    SISTEMA --> UC19
    SISTEMA --> UC20
    SISTEMA --> UC21

    UC8 -.incluye.-> UC19
    UC15 -.incluye.-> UC17
    UC12 -.incluye.-> UC19
```

## 5.2 Diagrama de Clases (Modelo de Dominio)

```mermaid
classDiagram
    class User {
        +String id
        +String username
        +String password (bcrypt)
        +String name
        +Role role
        +Boolean active
        +DateTime createdAt
    }

    class Role {
        <<enumeration>>
        ADMIN
        WAITER
        COOK
        CASHIER
    }

    class Category {
        +String id
        +String name
        +Boolean active
        +Int order
    }

    class Product {
        +String id
        +String name
        +String categoryId
        +Float price
        +Boolean isUsd
        +Boolean active
        +String imageUrl
        +String description
    }

    class Table {
        +String id
        +Int number
        +String name
        +Int capacity
        +Boolean active
    }

    class TableState {
        +String id
        +String tableId
        +String items (JSON)
        +Int version
        +DateTime updatedAt
    }

    class Order {
        +String id
        +String tableId
        +String userId
        +OrderType orderType
        +OrderStatus status
        +Float totalCop
        +Float totalUsd
        +Float exchangeRate
        +Float discountValue
        +Float discountPercent
        +String notes
        +DateTime completedAt
    }

    class OrderItem {
        +String id
        +String orderId
        +String productId
        +Int quantity
        +Float unitPrice
        +Float totalPrice
        +String notes
    }

    class Payment {
        +String id
        +String orderId
        +PaymentMethod method
        +String currency
        +Float amount
        +Float change
        +String reference
    }

    class Settings {
        +String id
        +String key
        +String value
        +String type
    }

    class Closure {
        +String id
        +DateTime date
        +Int orderCount
        +Float totalSalesCOP
        +Float totalSalesUSD
        +Float totalExpenses
        +Float exchangeRate
        +String notes
    }

    class Expense {
        +String id
        +String description
        +Float amount
        +String category
        +DateTime date
    }

    User "1" --> "*" Order
    Category "1" --> "*" Product
    Product "1" --> "*" OrderItem
    Table "1" --> "0..1" TableState
    Table "1" --> "*" Order
    Order "1" --> "*" OrderItem
    Order "1" --> "0..1" Payment
    User --> Role

    class OrderType {
        <<enumeration>>
        MESA
        PARA_LLEVAR
        DOMICILIO
    }

    class OrderStatus {
        <<enumeration>>
        PENDING
        PREPARING
        READY
        SERVED
        CANCELLED
    }

    class PaymentMethod {
        <<enumeration>>
        CASH_COP
        CASH_USD
        NEQUI
        CARD
    }

    Order --> OrderType
    Order --> OrderStatus
    Payment --> PaymentMethod
```

## 5.3 Diagrama de Secuencia: Crear Orden Completa

```mermaid
sequenceDiagram
    autonumber
    actor M as Mesero
    participant UI as POS.jsx
    participant Ctx as OrdersContext
    participant Sync as syncManager
    participant API as Express API
    participant Ctrl as orderController
    participant DB as MySQL/Prisma
    participant SSE as sse.js
    participant K as Cocina (KDS)

    M->>UI: Selecciona productos + mesa
    UI->>Ctx: agregarPlatilloAMesa(tableId, product)
    Ctx->>Ctx: setActiveTables(local)
    Ctx->>Ctx: setData('activeTables', ...)
    Ctx->>Sync: debouncedSyncTable(tableId)  [300ms]
    
    Note over Sync: Esperar 300ms (debounce)
    
    Sync->>API: PUT /api/tables/state<br/>{tableId, items, _clientVersion}
    API->>API: auth middleware (JWT)
    API->>Ctrl: tableController.updateState
    Ctrl->>DB: prisma.tableState.findUnique
    DB-->>Ctrl: {version: 5}
    Ctrl->>Ctrl: Validar version: 5 >= 5 ✓
    Ctrl->>DB: prisma.tableState.update<br/>{version: 6, items}
    DB-->>Ctrl: OK
    Ctrl->>SSE: notifySSEClients('table:updated', payload)
    SSE-->>K: event: table:updated
    K->>K: Actualizar UI KDS
    
    Ctrl-->>API: {version: 6}
    API-->>Sync: 200 OK {version: 6}
    Sync-->>Ctx: setActiveTables(version: 6)
```

## 5.4 Diagrama de Secuencia: Resolución de Conflicto (Versionado)

```mermaid
sequenceDiagram
    autonumber
    participant A as Cliente A (Mesero 1)
    participant B as Cliente B (Mesero 2)
    participant API as Express API
    participant Ctrl as tableController
    participant DB as MySQL
    participant SSE as sse.js

    Note over A,B: Ambos clientes tienen version=5
    
    A->>API: PUT /api/tables/state<br/>{items: A1+A2, _clientVersion: 5}
    API->>Ctrl: updateState
    Ctrl->>DB: SELECT version FROM table_states
    DB-->>Ctrl: version=5
    Ctrl->>DB: UPDATE SET items=A1+A2, version=6
    Ctrl->>SSE: notifySSEClients('table:updated', v6)
    SSE-->>B: event: table:updated {version: 6}
    
    B->>B: Actualizar local a version=6
    
    Note over B: Mientras tanto, B ya tenía pedido para enviar
    
    B->>API: PUT /api/tables/state<br/>{items: B1+B2, _clientVersion: 5}  ⚠️
    API->>Ctrl: updateState
    Ctrl->>DB: SELECT version FROM table_states
    DB-->>Ctrl: version=6
    Ctrl-->>API: {conflict: true, serverData: [A1,A2], serverVersion: 6}
    API-->>B: 409 Conflict {conflict: true, serverData, serverVersion: 6}
    
    B->>B: Merge: serverData + [B1,B2]<br/>(evita duplicados por product.id)
    B->>API: PUT /api/tables/state<br/>{items: [A1,A2,B1,B2], _clientVersion: 6}
    API->>Ctrl: updateState
    Ctrl->>DB: UPDATE version=7
    Ctrl->>SSE: notifySSEClients
    SSE-->>A: event: table:updated {version: 7}
```

## 5.5 Diagrama de Secuencia: Comunicación SSE Tiempo Real

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente (KDS)
    participant API as Express
    participant SSE as sse.js Map
    participant Ctrl as orderController
    participant DB as MySQL

    C->>API: GET /api/events<br/>Accept: text/event-stream
    API->>SSE: addSSEClient(clientId, res)
    API-->>C: 200 OK<br/>Content-Type: text/event-stream
    
    loop Heartbeat cada 30s
        API-->>C: :\n\n (comentario keep-alive)
    end
    
    Note over C: Cliente conectado en background
    
    Ctrl->>DB: prisma.order.create({...})
    DB-->>Ctrl: order
    Ctrl->>SSE: notifySSEClients('order:created', order)
    SSE-->>C: event: order:created<br/>data: {...order}
    
    C->>C: setOrders(prev => [order, ...prev])
    C->>C: Renderizar pedido en KDS
    
    Note over C: Usuario cierra la app
    
    C-->>API: Conexión cerrada
    API->>SSE: removeSSEClient(clientId)
    API->>API: clearInterval(heartbeat)
```

## 5.6 Diagrama de Actividad: Proceso Completo de Venta

```mermaid
stateDiagram-v2
    [*] --> SesionIniciada: Login

    SesionIniciada --> SeleccionMesa: Elegir mesa o Para Llevar

    state "Selección de Productos" as SP {
        [*] --> BuscarProductos
        BuscarProductos --> FiltrarCategoria
        FiltrarCategoria --> AgregarCarrito
        AgregarCarrito --> BuscarProductos: Continuar
        AgregarCarrito --> [*]: Ir a cobrar
    }

    SeleccionMesa --> SP
    SP --> ConfirmarOrden: Revisar pedido
    ConfirmarOrden --> SP: Agregar más
    ConfirmarOrden --> EnviarACocina: Confirmar

    EnviarACocina --> CocinaPreparando: Order status PENDING
    CocinaPreparando --> CocinaLista: status READY
    CocinaLista --> ServidoAlCliente: status SERVED

    ServidoAlCliente --> ProcesoPago: Generar cuenta
    ProcesoPago --> SeleccionMetodo: Elegir pago

    state "Cálculo de Vuelto" as CV {
        [*] --> IngresarEfectivo
        IngresarEfectivo --> CalcularVuelto
        CalcularVuelto --> Suficiente: OK
        CalcularVuelto --> IngresarEfectivo: Falta
        Suficiente --> [*]
    }

    SeleccionMetodo --> CV
    CV --> AplicarDescuento: Opcional
    AplicarDescuento --> GenerarTicket

    state "Pago Electrónico" as PE {
        [*] --> IngresarReferencia
        IngresarReferencia --> ValidarPago
        ValidarPago --> [*]
    }

    CV --> PE: Nequi/Tarjeta
    PE --> GenerarTicket

    GenerarTicket --> CierreVenta: Imprimir/Email
    CierreVenta --> MesaLiberada: status=SERVED + pago OK
    MesaLiberada --> [*]

    GenerarTicket --> CancelarVenta: Cliente desiste
    CancelarVenta --> [*]
```

## 5.7 Diagrama de Estados: Ciclo de Vida de una Orden

```mermaid
stateDiagram-v2
    [*] --> PENDING: Crear orden

    PENDING --> PREPARING: KDS acepta pedido
    PENDING --> CANCELLED: Admin cancela

    PREPARING --> READY: Cocina marca listo
    PREPARING --> CANCELLED: Sin ingredientes

    READY --> SERVED: Mesero entrega
    READY --> CANCELLED: Error grave

    SERVED --> [*]: Pago completo + cierre

    CANCELLED --> [*]: Stock restaurado

    note right of PENDING
      Items en preparación.
      Notificado vía SSE a KDS.
    end note

    note right of READY
      Alerta visual/sonora
      en KDS + POS del mesero.
    end note

    note right of SERVED
      Estado final antes
      de generar pago.
    end note
```

## 5.8 Diagrama de Componentes: Estructura Frontend

```mermaid
flowchart TB
    subgraph App["App.jsx"]
        ROUTER[Router con activeTab]
    end

    subgraph Layout["Layout.jsx"]
        SIDEBAR[Sidebar con Logo + Navegación]
        HEADER[Header Móvil]
        USERBAR[Barra Usuario + Logout]
    end

    subgraph Screens["Pantallas principales"]
        POS[POS.jsx<br/>Toma de pedidos]
        MESAS[VistaMesas.jsx<br/>Mapa de mesas]
        KDS[KitchenView.jsx<br/>Tablero Kanban]
        FIN[Finance.jsx<br/>Cierre Z + Gastos]
        HIST[History.jsx<br/>Historial ventas]
        MENU[MenuManager.jsx<br/>CRUD menú]
        SET[CurrencySettings.jsx<br/>4 sub-tabs]
    end

    subgraph SettingsTabs["Settings sub-tabs"]
        SNegocio[SettingsNegocio]
        SMovil[SettingsMovil]
        SDatos[SettingsDatos]
        SServ[SettingsServidor]
    end

    subgraph Contextos["Contextos Globales"]
        OC[OrdersContext]
        SC[SettingsContext]
        MC[MenuContext]
        UC[UserContext]
        FC[FinanceContext]
    end

    subgraph Comunes["Componentes comunes"]
        TICKET[Ticket.jsx]
        LOGIN[LoginScreen.jsx]
    end

    ROUTER --> Layout
    Layout --> POS
    Layout --> MESAS
    Layout --> KDS
    Layout --> FIN
    Layout --> HIST
    Layout --> MENU
    Layout --> SET

    SET --> SNegocio
    SET --> SMovil
    SET --> SDatos
    SET --> SServ

    POS --> OC
    POS --> MC
    POS --> SC
    POS --> TICKET
    MESAS --> OC
    KDS --> OC
    FIN --> FC
    FIN --> OC
    HIST --> OC
    MENU --> MC
    LOGIN --> UC
```

## 5.9 Diagrama de Despliegue (simplificado)

```mermaid
flowchart LR
    subgraph ServerPC["PC Servidor (Windows/Mac/Linux)"]
        EL["Electron App<br/>2Arbolitos POS.exe"]
        NODE["Node.js Process<br/>Express Server :3002"]
        MYSQL[("MySQL Server<br/>:3306")]
        BONJOUR[bonjour-service]
    end

    subgraph LAN["Red Local (Wi-Fi 192.168.x.x)"]
        TAB1[Tablet Mesero 1]
        TAB2[Tablet Mesero 2]
        COCINAPC[PC/TV Cocina]
        CEL[Celular Admin]
    end

    subgraph Internet["Internet (opcional)"]
        CLOUD[("Respaldo MySQL<br/>en la nube")]
    end

    EL -.Carga.-> NODE
    NODE --> MYSQL
    NODE --> BONJOUR

    BONJOUR -.mDNS.-> LAN
    TAB1 -->|HTTP :3002| NODE
    TAB2 -->|HTTP :3002| NODE
    COCINAPC -->|HTTP :3002| NODE
    CEL -->|HTTP :3002| NODE

    MYSQL -.Backup opcional.-> CLOUD
```

## 5.10 Conclusión

Los diagramas UML presentados modelan el sistema desde múltiples perspectivas:

- **Casos de uso**: qué hace cada actor.
- **Clases**: estructura de datos y relaciones.
- **Secuencia**: cómo colaboran los componentes en escenarios clave.
- **Actividad**: flujo del proceso de negocio principal.
- **Estados**: ciclo de vida de las órdenes.
- **Componentes y despliegue**: estructura física y lógica.

Estos diagramas son **vivos**: se actualizan cuando el código cambia, evitando la degradación típica de la documentación estática.
