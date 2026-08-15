import { ShoppingCart, ChefHat, Clock, Coffee, Package, Users, Layers, Building2, TrendingUp, Calculator, UserCog, ClipboardList, Settings } from 'lucide-react';

export const allTabs = [
    { id: 'pos', label: 'Pedidos', icon: ShoppingCart, roles: ['ADMIN', 'WAITER'], permissions: ['VIEW_ORDERS', 'MANAGE_ORDERS'] },
    { id: 'kitchen', label: 'Cocina', icon: ChefHat, roles: ['ADMIN', 'COOK'], permissions: ['VIEW_ORDERS'] },
    { id: 'history', label: 'Historial', icon: Clock, roles: ['ADMIN', 'MANAGER', 'CASHIER'], permissions: ['VIEW_REPORTS'] },
    { id: 'menu', label: 'Menú', icon: Coffee, roles: ['ADMIN'], permissions: ['CREATE_PRODUCT', 'EDIT_PRODUCT'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['ADMIN', 'MANAGER'], permissions: ['MANAGE_INVENTORY'] },
    { id: 'customers', label: 'Clientes', icon: Users, roles: ['ADMIN', 'MANAGER'], permissions: ['VIEW_REPORTS'] },
    { id: 'modifiers', label: 'Modificadores', icon: Layers, roles: ['ADMIN'], permissions: ['CREATE_PRODUCT', 'EDIT_PRODUCT'] },
    { id: 'suppliers', label: 'Proveedores', icon: Building2, roles: ['ADMIN', 'MANAGER'], permissions: ['MANAGE_INVENTORY'] },
    { id: 'finance', label: 'Contabilidad', icon: TrendingUp, roles: ['ADMIN'], permissions: ['VIEW_REPORTS'] },
    { id: 'escandallo', label: 'Escandallo', icon: Calculator, roles: ['ADMIN'], permissions: ['VIEW_REPORTS'] },
    { id: 'admin', label: 'Administración', icon: UserCog, roles: ['ADMIN', 'MANAGER'], permissions: ['MANAGE_USERS', 'MANAGE_PERMISSIONS'] },
    { id: 'audit', label: 'Auditoría', icon: ClipboardList, roles: ['ADMIN'], permissions: ['VIEW_AUDIT'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['ADMIN'], permissions: ['MANAGE_SETTINGS'] },
];