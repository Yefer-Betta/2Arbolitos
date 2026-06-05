# 10 — Interfaz de Usuario (UI/UX)

## 10.1 Principios de Diseño

2Arbolitos sigue tres principios de diseño fundamentales:

1. **Táctil primero**: botones con `min-h-[44px] min-w-[44px]`, espaciado generoso, feedback visual inmediato.
2. **Información visible**: el estado más importante siempre está a la vista (mesa actual, items en carrito, total).
3. **Mínimo cambio de contexto**: el usuario no abandona la pantalla principal para operaciones frecuentes (cobrar, modificar pedido).

## 10.2 Paleta de Colores de Marca

Definida en `tailwind.config.js`:

| Color | Hex | Uso | Contraste sobre |
|:------|:----|:----|:----------------|
| `primary` | `#1A4D2E` | Verde bosque profundo | Sidebar, header, botones primarios |
| `primary-light` | `#2D6A42` | Verde medio | Hover, acentos |
| `primary-dark` | `#113520` | Verde muy oscuro | Sombras, bordes |
| `secondary` | `#D4A373` | Dorado ocre terroso | Badges, destacado, reloj |
| `secondary-light` | `#E5C09C` | Beige claro | Hover secundario |
| `background` | `#F9F7F2` | Crema suave | Fondo general de la app |
| `surface` | `#F0EBE0` | Crema oscuro | Cards, sidebars internos |
| `background.paper` | `#FFFFFF` | Blanco puro | Modales, tickets |

**Tipografía:** [Outfit](https://fonts.google.com/specimen/Outfit) (sans-serif geométrica, moderna, alta legibilidad).

## 10.3 Mapa de Navegación

```mermaid
flowchart TB
    LOGIN[🔐 Login]
    LOGIN --> MAIN[🏠 Layout Principal]

    MAIN --> MESAS[🪑 Vista de Mesas]
    MAIN --> POS[🛒 Punto de Venta]
    MAIN --> KDS[🧑‍🍳 Cocina KDS]
    MAIN --> MENU[📋 Gestión de Menú]
    MAIN --> FIN[📊 Finanzas]
    MAIN --> HIST[📜 Historial]
    MAIN --> SET[⚙️ Configuración]

    MESAS --> POS: Click en mesa
    POS --> CHECKOUT[💳 Modal de Cobro]
    CHECKOUT --> TICKET[🧾 Ticket]

    SET --> SNEG[🏪 Negocio]
    SET --> SMOV[📱 Móvil QR]
    SET --> SDAT[💾 Datos]
    SET --> SSER[🖥️ Servidor]

    FIN --> CIERRE[📋 Cierre de Caja]
    FIN --> GASTOS[💸 Gastos Operativos]

    HIST --> DETALLE[🔍 Detalle de Orden]
```

## 10.4 Estructura del Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]    ●Online                              ⏰ HH:MM 📅  │ Header Móvil (md:hidden)
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐                                               │
│  │          │                                               │
│  │  LOGO    │                                               │
│  │ ──────── │                                               │
│  │ ●Online  │              CONTENIDO PRINCIPAL              │
│  │ PV·14:38 │              (cambia según tab)               │
│  │ ──────── │                                               │
│  │  🏠 Mesas │                                               │
│  │  🛒 POS  │                                               │
│  │  🧑‍🍳 KDS  │                                               │
│  │  📋 Menú │                                               │
│  │  📊 Fin  │                                               │
│  │  📜 Hist │                                               │
│  │  ⚙️ Conf │                                               │
│  │ ──────── │                                               │
│  │  👤 User │                                               │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

## 10.5 Wireframes por Pantalla

### 10.5.1 Login (`LoginScreen.jsx`)

```
┌──────────────────────────────────────────────┐
│                                              │
│         [LOGO 2Arbolitos 160px]              │
│         Texto "2Arbolitos"                   │
│         Subtítulo "Bienvenido"               │
│                                              │
│         ┌────────────────────────┐           │
│         │  Usuario               │           │
│         │  [____________________]│           │
│         └────────────────────────┘           │
│         ┌────────────────────────┐           │
│         │  Contraseña            │           │
│         │  [____________________]│           │
│         └────────────────────────┘           │
│                                              │
│         ┌────────────────────────┐           │
│         │     [ INGRESAR ]       │           │
│         └────────────────────────┘           │
│                                              │
│         v1.0.0                               │
└──────────────────────────────────────────────┘
```

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/01-login.png`
- Formulario centrado con logo 2Arbolitos
- Campos de usuario/contraseña
- Fondo verde #1A4D2E con card blanca

### 10.5.2 Vista de Mesas (`VistaMesas.jsx`)

```
┌──────────────────────────────────────────────────────────┐
│  🪑 Vista de Mesas                                       │
│  [TODAS] [OCUPADAS] [LIBRES]                             │
│                                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                 │
│  │  1   │  │  2   │  │  3   │  │  4   │                 │
│  │ Libre│  │Ocup. │  │ Libre│  │Ocup. │                 │
│  │  👥4  │  │ 👥3  │  │  👥4  │  │ 👥2  │                 │
│  └──────┘  └──────┘  └──────┘  └──────┘                 │
│                                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                 │
│  │  5   │  │  6   │  │  7   │  │  8   │                 │
│  │Ocup. │  │ Libre│  │Ocup. │  │ Libre│                 │
│  │  👥5  │  │  👥4  │  │ 👥2  │  │  👥6  │                 │
│  └──────┘  └──────┘  └──────┘  └──────┘                 │
│                                                          │
│  [+ Para Llevar]  [+ Domicilio]                          │
└──────────────────────────────────────────────────────────┘
```

**Estados de mesa:**
- 🟢 **Libre**: borde verde claro, fondo crema
- 🟠 **Ocupada**: borde naranja, fondo crema con badge
- ⏰ Con tiempo transcurrido (color rojo después de 1h)

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/02-mesas.png`

### 10.5.3 Punto de Venta (`POS.jsx`)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Mesa 3              🛒 Pedido (4 items)      $ 45.000  │
├──────────────────────────────┬──────────────────────────────┤
│  🔍 [Buscar producto...]     │  MESA 3 - 4 items            │
│                              │  ┌────────────────────────┐  │
│  [Todos] [Bebidas] [Platos]  │  │ 2x Hamburguesa  $36.000│  │
│       [Postres] [Entradas]   │  │ [-] [2] [+]      [×]   │  │
│                              │  ├────────────────────────┤  │
│  ┌─────────┐  ┌─────────┐    │  │ 1x Coca-Cola    $ 5.000│  │
│  │  IMG    │  │  IMG    │    │  │ [-] [1] [+]      [×]   │  │
│  │Hambur-  │  │ Pizza   │    │  ├────────────────────────┤  │
│  │guesa    │  │ Margh.  │    │  │ 1x Papas       $ 4.000│  │
│  │$18.000  │  │$22.000  │    │  │ [-] [1] [+]      [×]   │  │
│  │ [+ Añadir]│  │[+ Añadir]│   │  └────────────────────────┘  │
│  └─────────┘  └─────────┘    │                              │
│                              │  Subtotal:     $ 45.000      │
│  ┌─────────┐  ┌─────────┐    │  ─────────────────────────  │
│  │  IMG    │  │  IMG    │    │  [ 💳 COBRAR ]  [ 🧹 Limpiar]│
│  │Ensalada │  │ Jugo    │    │                              │
│  │$12.000  │  │ $ 6.000 │    │                              │
│  │[+ Añadir]│  │[+ Añadir]│   │                              │
│  └─────────┘  └─────────┘    │                              │
└──────────────────────────────┴──────────────────────────────┘
```

**Layout móvil**: tabs con toggle entre productos/carrito.

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/03-pos.png`

### 10.5.4 Cocina KDS (`KitchenView.jsx`)

```
┌────────────────────────────────────────────────────────────────┐
│  🧑‍🍳 COCINA - 2Arbolitos                          [🔔] [⏰] │
├──────────────────┬──────────────────┬──────────────────────────┤
│ 🟡 PENDIENTES (3)│ 🟠 EN PREP. (2) │ 🟢 LISTAS (1)            │
├──────────────────┼──────────────────┼──────────────────────────┤
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────────────────────┐│
│ │ Mesa 3       │ │ │ Mesa 5       │ │ │ Mesa 1               ││
│ │ 14:32 ⏱️      │ │ │ 14:28 ⏱️      │ │ │ 14:15 ⏱️              ││
│ │              │ │ │              │ │ │                      ││
│ │ 2 Hamburg.   │ │ │ 1 Pizza      │ │ │ 1 Ensalada César     ││
│ │ 1 Coca       │ │ │ 1 Jugo       │ │ │ 1 Limonada           ││
│ │              │ │ │              │ │ │                      ││
│ │[✓ Aceptar]   │ │ │[✓ Listo]     │ │ │[✓ Entregado]         ││
│ └──────────────┘ │ └──────────────┘ │ └──────────────────────┘│
│ ┌──────────────┐ │ ┌──────────────┐ │                        │
│ │ Mesa 7       │ │ │ Mesa 2       │ │                        │
│ │ 14:35 ⏱️      │ │ │ 14:25 ⏱️      │ │                        │
│ │ ...          │ │ │ ...          │ │                        │
│ └──────────────┘ │ └──────────────┘ │                        │
└──────────────────┴──────────────────┴──────────────────────────┘
```

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/04-kds.png`

### 10.5.5 Modal de Checkout

```
┌────────────────────────────────────────┐
│  💳 Cobrar Mesa 3                   [×]│
├────────────────────────────────────────┤
│                                        │
│  Subtotal:           $ 45.000         │
│  Descuento (10%):    -$  4.500         │
│  ─────────────────────────────         │
│  TOTAL:              $ 40.500         │
│                       $ 9.64 USD       │
│                                        │
│  MÉTODO DE PAGO:                       │
│  [💵 COP] [💵 USD] [📱 Nequi] [💳 Tarj]│
│                                        │
│  Si [💵 COP]:                         │
│  Recibido: [_________________]         │
│  Vuelto:   $ 4.500                     │
│  ✓ Suficiente                          │
│                                        │
│  [✓ CONFIRMAR PAGO]                    │
└────────────────────────────────────────┘
```

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/05-checkout.png`

### 10.5.6 Configuración (4 sub-tabs)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Configuración                                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │🏪Negocio │ │📱Móvil   │ │💾Datos   │ │🖥️Servidor│       │
│  │ ACTIVO   │ │          │ │          │ │          │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ═══════════                                                │
│                                                              │
│  Tasa de Cambio (COP/USD)                                   │
│  [ 4200 ]                                                   │
│                                                              │
│  Datos del Negocio                                           │
│  Nombre:     [ 2Arbolitos Restaurante          ]            │
│  Dirección:  [ Calle 123 #45-67                ]            │
│  Teléfono:   [ +57 300 123 4567                ]            │
│  Logo:       [ Subir imagen ]                                │
│                                                              │
│  [ 💾 Guardar ]                                              │
└─────────────────────────────────────────────────────────────┘
```

📷 **[CAPTURA REQUERIDA]**: `assets/screenshots/06-settings.png`

## 10.6 Patrones de UI Reutilizables

### 10.6.1 Tarjetas de Producto (POS)

```jsx
<div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-3 group">
  <div className="aspect-square rounded-xl overflow-hidden bg-surface mb-2">
    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
  </div>
  <h3 className="font-semibold text-sm text-gray-800 truncate">{product.name}</h3>
  <p className="text-primary font-bold">$ {formatPrice(product.price)}</p>
  <button className="mt-2 w-full bg-primary text-white py-2 rounded-lg
                     opacity-100 md:opacity-0 md:group-hover:opacity-100
                     transition-opacity">
    + Añadir
  </button>
</div>
```

**Decisión UX**: el botón "Añadir" es visible siempre en móvil (táctil), pero en desktop solo aparece en hover para no saturar visualmente.

### 10.6.2 Items de Carrito

```jsx
<div className="flex items-center gap-3 p-2 hover:bg-surface rounded-lg group">
  <div className="flex items-center gap-1">
    <button onClick={dec} className="min-w-[44px] min-h-[44px]
                                       flex items-center justify-center
                                       bg-primary text-white rounded-full">
      <Minus className="w-4 h-4" />
    </button>
    <span className="w-8 text-center font-bold">{item.quantity}</span>
    <button onClick={inc} className="min-w-[44px] min-h-[44px] ...">
      <Plus className="w-4 h-4" />
    </button>
  </div>
  <div className="flex-1">
    <p className="font-semibold text-sm">{item.product.name}</p>
    <p className="text-xs text-gray-500">{formatPrice(item.totalPrice)}</p>
  </div>
  <button onClick={remove} className="opacity-100 md:opacity-0
                                       md:group-hover:opacity-100 ...">
    <X className="w-5 h-5" />
  </button>
</div>
```

### 10.6.3 Badges de Estado

| Estado | Clases Tailwind | Apariencia |
|:-------|:----------------|:-----------|
| Online | `bg-green-500/20 text-green-400` | Verde translúcido |
| Offline | `bg-red-500/20 text-red-400` | Rojo translúcido |
| Pendiente (cambios) | `bg-yellow-500/20 text-yellow-400` | Amarillo translúcido |
| Sincronizado | `bg-green-500/20 text-green-400` | Verde |
| Mesa ocupada | `bg-orange-100 text-orange-700` | Naranja claro |
| Mesa libre | `bg-green-50 text-green-700` | Verde claro |

## 10.7 Responsive Design

### Breakpoints

| Prefijo | Ancho | Dispositivo |
|:--------|:------|:------------|
| (sin prefijo) | < 640 px | Móvil |
| `sm:` | ≥ 640 px | Móvil grande |
| `md:` | ≥ 768 px | Tablet |
| `lg:` | ≥ 1024 px | Desktop |
| `xl:` | ≥ 1280 px | Desktop grande |

### Patrones Responsive Aplicados

| Componente | Móvil | Desktop |
|:-----------|:------|:--------|
| Sidebar | Drawer lateral (overlay) | Fijo a la izquierda |
| Header | Top bar con menú hamburguesa | Oculto (sidebar ya existe) |
| POS | Tabs productos/carrito | Vista side-by-side |
| Hover buttons | Visibles siempre | Solo en hover (group-hover) |
| Touch targets | ≥ 44 × 44 px | ≥ 32 × 32 px |
| Modales | Full-screen | Centrados 600×400 |
| Vista de Mesas | Grid 2 columnas | Grid 4-6 columnas |
| KDS | Vertical stack | 3 columnas horizontales |

## 10.8 Animaciones y Transiciones

```css
/* Patrones estándar */
.transition-all     /* Cambio suave general */
.transition-colors  /* Solo color */
.duration-200       /* 200ms (rápido) */
.duration-300       /* 300ms (medio) */
.duration-500       /* 500ms (lento) */

/* Casos de uso */
hover:shadow-lg     /* Sombra al pasar mouse */
group-hover:opacity-100  /* Mostrar elemento hijo en hover */
animate-spin        /* Loading spinners */
animate-pulse       /* Indicadores online */
```

**Regla de oro**: ninguna animación supera 500 ms. El sistema debe sentirse ágil.

## 10.9 Accesibilidad

Implementaciones básicas de accesibilidad:

- **`aria-label`** en botones con icono (`<button aria-label="Cerrar menú">`)
- **Contraste mínimo WCAG AA** en paleta (verificado manualmente)
- **Targets ≥ 44 × 44 px** en touch
- **Foco visible** con outline por defecto de Tailwind
- **Roles semánticos**: `<nav>`, `<header>`, `<main>`, `<aside>`, `<button>`

**Pendientes para v2**:

- Soporte completo de teclado (navegación con Tab/Enter)
- Screen reader testing (NVDA, VoiceOver)
- Modo alto contraste
- Internacionalización (i18n)

## 10.10 Conclusión

La interfaz de 2Arbolitos está diseñada para ser **intuitiva, rápida y táctil**. Los principios clave son:

- Verde bosque + dorado ocre transmiten naturaleza y calidez (acorde a "2Arbolitos")
- Layouts simples, sin clutter, con información esencial visible
- Responsive con mobile-first
- Sin animaciones excesivas ni dependencias pesadas
- Componentes reutilizables basados en Tailwind

El sistema **no intenta reinventar la rueda** en UI: sigue convenciones conocidas por meseros y cocineros, minimizando la curva de aprendizaje.
