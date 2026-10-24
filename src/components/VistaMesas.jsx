import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, LayoutGrid, MapPin, Phone, Plus, ShoppingBag, Truck, X, Pencil, Settings2, Trash2, Check } from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import { useSettings } from '../context/SettingsContext';
import { useUser } from '../context/UserContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api.js';
import { Modal } from './Modal';
import { useConfirm, useToast } from './ui/feedback-context';
import { PageHeader } from './ui/PageHeader';
import { Badge } from './ui/Badge';
import { Money } from './ui/Money';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { cn } from '../lib/utils';

export const PARA_LLEVAR_ID = 'para-llevar';

const FALLBACK_TABLE_COUNT = 10;

export function VistaMesas({ onSelectTable }) {
    const { activeTables, crearDomicilio } = useOrders();
    const { exchangeRate } = useSettings();
    const { currentUser } = useUser();
    const toast = useToast();
    const confirm = useConfirm();

    const [showNuevoDomicilio, setShowNuevoDomicilio] = useState(false);
    const [domForm, setDomForm] = useState({ direccion: '', telefono: '', costoEnvio: '' });
    const [tablesList, setTablesList] = useState([]);
    const [tablesLoaded, setTablesLoaded] = useState(false);
    const [showManage, setShowManage] = useState(false);
    const [newTable, setNewTable] = useState({ number: '', name: '', capacity: '4' });
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [savingTable, setSavingTable] = useState(false);

    const canManage = ['ADMIN', 'MANAGER'].includes(String(currentUser?.role || '').toUpperCase());

    const loadTables = useCallback(async () => {
        try {
            const data = await apiGet('/tables?active=true');
            if (Array.isArray(data)) {
                setTablesList(data);
                setTablesLoaded(true);
            }
        } catch {
            // Sin conexión: se usa el grid de respaldo
        }
    }, []);

    useEffect(() => { loadTables(); }, [loadTables]);

    const rate = exchangeRate > 0 ? exchangeRate : 1;

    const calculateTableTotal = (tableOrder) => {
        if (!tableOrder) return { cop: 0, usd: 0 };

        let cop = 0;
        let usd = 0;

        tableOrder.forEach(item => {
            const price = item.product?.price || 0;
            const isUsd = item.product?.isUsd;
            const qty = item.quantity || 0;

            if (isUsd) {
                usd += price * qty;
                cop += (price * rate) * qty;
            } else {
                cop += price * qty;
                usd += (price / rate) * qty;
            }
        });

        return { cop, usd };
    };

    const deliveryTables = Object.entries(activeTables).filter(([id]) => id.startsWith('domicilio-'));

    const sourceTables = tablesLoaded
        ? tablesList
        : Array.from({ length: FALLBACK_TABLE_COUNT }, (_, i) => ({ id: `fallback-${i + 1}`, number: i + 1, name: `Mesa ${i + 1}` }));

    const tables = sourceTables.map(table => {
        const id = `mesa-${table.number}`;
        const items = activeTables[id]?.items || [];
        return {
            id,
            dbId: table.id,
            number: table.number,
            name: table.name || `Mesa ${table.number}`,
            items,
            occupied: items.length > 0,
            totals: calculateTableTotal(items),
        };
    });
    const freeTables = tables.filter(t => !t.occupied).length;

    const suggestTableNumber = () => {
        const used = new Set(tablesList.map(t => t.number));
        let candidate = 1;
        while (used.has(candidate)) candidate += 1;
        return String(candidate);
    };

    const openManage = () => {
        setNewTable({ number: suggestTableNumber(), name: '', capacity: '4' });
        setRenamingId(null);
        setShowManage(true);
    };

    const handleCreateTable = async (e) => {
        e.preventDefault();
        const number = parseInt(newTable.number, 10);
        if (!number || number < 1) {
            toast.error('Escribe un número de mesa válido');
            return;
        }
        if (tablesList.some(t => t.number === number)) {
            toast.error(`Ya existe una mesa con el número ${number}`);
            return;
        }

        setSavingTable(true);
        try {
            await apiPost('/tables', {
                number,
                name: newTable.name.trim() || `Mesa ${number}`,
                capacity: parseInt(newTable.capacity, 10) || 4,
            });
            toast.success(`Mesa ${number} agregada`);
            await loadTables();
            setNewTable({ number: '', name: '', capacity: '4' });
        } catch (error) {
            toast.error(error?.message || 'No se pudo agregar la mesa');
        } finally {
            setSavingTable(false);
        }
    };

    const startRename = (table) => {
        setRenamingId(table.dbId);
        setRenameValue(table.name);
    };

    const handleRename = async (table) => {
        const name = renameValue.trim();
        if (!name) {
            toast.error('El nombre no puede estar vacío');
            return;
        }

        setSavingTable(true);
        try {
            await apiPut(`/tables/${table.dbId}`, { name });
            toast.success('Mesa renombrada');
            setRenamingId(null);
            await loadTables();
        } catch (error) {
            toast.error(error?.message || 'No se pudo renombrar la mesa');
        } finally {
            setSavingTable(false);
        }
    };

    const handleDeactivateTable = async (table) => {
        if (table.occupied) {
            toast.error('Cierra la cuenta de la mesa antes de desactivarla');
            return;
        }

        const ok = await confirm({
            title: `¿Desactivar ${table.name}?`,
            message: 'Dejará de aparecer en el salón. Su historial de pedidos se conserva.',
            confirmLabel: 'Desactivar',
            danger: true,
        });
        if (!ok) return;

        setSavingTable(true);
        try {
            await apiDelete('/tables', table.dbId);
            toast.success('Mesa desactivada');
            await loadTables();
        } catch (error) {
            toast.error(error?.message || 'No se pudo desactivar la mesa');
        } finally {
            setSavingTable(false);
        }
    };

    const handleCrearDomicilio = () => {
        if (!domForm.direccion.trim() || !domForm.telefono.trim()) {
            toast.error('La dirección y el teléfono son obligatorios');
            return;
        }
        const costo = parseFloat(domForm.costoEnvio.replace(/[^0-9]/g, '')) || 0;
        const id = crearDomicilio(domForm.direccion.trim(), domForm.telefono.trim(), costo);
        setShowNuevoDomicilio(false);
        setDomForm({ direccion: '', telefono: '', costoEnvio: '' });
        onSelectTable(id);
    };

    const closeDomicilio = () => {
        setShowNuevoDomicilio(false);
        setDomForm({ direccion: '', telefono: '', costoEnvio: '' });
    };

    return (
        <div className="space-y-6 md:space-y-8">
            <PageHeader title="Pedidos" subtitle="Elige una mesa o inicia una venta directa." />

            {/* Acciones rápidas */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">
                <button
                    onClick={() => onSelectTable('para-llevar')}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-background-paper p-3.5 text-left transition-colors hover:border-primary/40"
                >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/5 text-ink-brand">
                        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">Para llevar</span>
                        <span className="block truncate text-2xs text-ink-muted">Venta directa sin mesa</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>

                <button
                    onClick={() => setShowNuevoDomicilio(true)}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-background-paper p-3.5 text-left transition-colors hover:border-primary/40"
                >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/5 text-ink-brand">
                        <Truck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">Domicilio</span>
                        <span className="block truncate text-2xs text-ink-muted">Entrega a domicilio</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/60 p-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background-paper text-ink-brand">
                        <LayoutGrid className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="num text-sm font-semibold text-ink">
                            {freeTables} de {tables.length} mesas libres
                        </p>
                        <p className="truncate text-2xs text-ink-muted">
                            {tables.length - freeTables === 0
                                ? 'Sin cuentas abiertas'
                                : `${tables.length - freeTables} con cuenta abierta`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Domicilios activos */}
            {deliveryTables.length > 0 && (
                <section>
                    <div className="mb-3 flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-ink">Domicilios en curso</h2>
                        <Badge tone="brand">{deliveryTables.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                        {deliveryTables.map(([id, entry]) => {
                            const items = entry.items || [];
                            const totals = calculateTableTotal(items);
                            return (
                                <button
                                    key={id}
                                    onClick={() => onSelectTable(id)}
                                    className="group flex flex-col gap-3 rounded-2xl border border-line border-l-[3px] border-l-secondary bg-background-paper p-3.5 text-left transition-colors hover:border-primary/40 hover:border-l-secondary"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                                            <Truck className="h-4 w-4 text-ink-brand" aria-hidden="true" />
                                            Domicilio
                                        </span>
                                        <Badge>{items.length} {items.length === 1 ? 'ítem' : 'ítems'}</Badge>
                                    </div>

                                    <div className="space-y-1 text-2xs text-ink-muted">
                                        <p className="flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
                                            <span className="truncate">{entry.deliveryAddress}</span>
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden="true" />
                                            {entry.deliveryPhone}
                                        </p>
                                        {entry.deliveryCost > 0 && (
                                            <p className="flex items-center gap-1">
                                                Envío <Money amount={entry.deliveryCost} className="font-medium text-ink-muted" />
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-2.5">
                                        <span className="text-2xs text-ink-muted">Total</span>
                                        <Money amount={totals.cop} className="text-sm text-ink" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Mesas */}
            <section>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-ink">Mesas</h2>
                        <span className="text-2xs text-ink-muted">{freeTables} de {tables.length} libres</span>
                    </div>
                    <div className="flex items-center gap-3 text-2xs text-ink-muted">
                        <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
                            Libre
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
                            Ocupada
                        </span>
                        {canManage && (
                            <button onClick={openManage} className="btn-secondary h-8 px-2.5 text-[12px]">
                                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Gestionar
                            </button>
                        )}
                    </div>
                </div>

                {tables.length === 0 ? (
                    <EmptyState
                        icon={LayoutGrid}
                        title="No hay mesas activas"
                        description={canManage
                            ? 'Agrega la primera mesa para empezar a tomar pedidos en el salón.'
                            : 'Pide a un administrador que configure las mesas del salón.'}
                        action={canManage ? (
                            <button onClick={openManage} className="btn-primary h-9 px-3.5 text-[13px]">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Agregar mesa
                            </button>
                        ) : null}
                    />
                ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {tables.map(table => (
                        <button
                            key={table.id}
                            onClick={() => onSelectTable(table.id)}
                            aria-label={`${table.name}: ${table.occupied ? 'ocupada' : 'libre'}`}
                            className={cn(
                                'group flex min-h-[96px] flex-col justify-between rounded-2xl border border-line bg-background-paper p-3.5 text-left transition-colors hover:border-primary/40',
                                table.occupied && 'border-l-[3px] border-l-secondary hover:border-l-secondary'
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-2xs uppercase tracking-wide text-ink-soft">
                                        Mesa {String(table.number).padStart(2, '0')}
                                    </p>
                                    <p
                                        className={cn(
                                            'mt-0.5 truncate leading-tight text-ink',
                                            table.name === `Mesa ${table.number}`
                                                ? 'num text-2xl font-semibold'
                                                : 'text-base font-semibold'
                                        )}
                                    >
                                        {table.name === `Mesa ${table.number}`
                                            ? String(table.number).padStart(2, '0')
                                            : table.name}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'flex items-center gap-1.5 text-2xs font-medium',
                                        table.occupied ? 'text-warn' : 'text-ink-muted'
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'h-1.5 w-1.5 rounded-full',
                                            table.occupied ? 'bg-secondary' : 'bg-ok'
                                        )}
                                        aria-hidden="true"
                                    />
                                    {table.occupied ? 'Ocupada' : 'Libre'}
                                </span>
                            </div>

                            <div className="mt-2.5 flex items-end justify-between gap-2">
                                {table.occupied ? (
                                    <>
                                        <span className="text-2xs text-ink-muted">
                                            {table.items.length} {table.items.length === 1 ? 'ítem' : 'ítems'}
                                        </span>
                                        <Money amount={table.totals.cop} className="text-sm text-ink" />
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xs text-ink-soft">Abrir</span>
                                        <ChevronRight
                                            className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5"
                                            aria-hidden="true"
                                        />
                                    </>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
                )}
            </section>

            {/* Modal Nuevo Domicilio */}
            <Modal isOpen={showNuevoDomicilio} onClose={closeDomicilio} label="Nuevo domicilio" maxWidth="max-w-md">
                <div className="p-5">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-base font-semibold text-ink">Nuevo domicilio</h3>
                            <p className="mt-0.5 text-2xs text-ink-muted">Datos para la entrega del pedido.</p>
                        </div>
                        <button
                            onClick={closeDomicilio}
                            className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                            aria-label="Cerrar"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-3.5">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-ink-muted" htmlFor="dom-direccion">
                                Dirección de entrega *
                            </label>
                            <input
                                id="dom-direccion"
                                type="text"
                                placeholder="Ej. Cra 5 #10-20, Barrio Centro"
                                value={domForm.direccion}
                                onChange={e => setDomForm({ ...domForm, direccion: e.target.value })}
                                className="input-field"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-ink-muted" htmlFor="dom-telefono">
                                Teléfono de contacto *
                            </label>
                            <input
                                id="dom-telefono"
                                type="tel"
                                inputMode="tel"
                                placeholder="Ej. 310 555 1234"
                                value={domForm.telefono}
                                onChange={e => setDomForm({ ...domForm, telefono: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-ink-muted" htmlFor="dom-costo">
                                Costo de envío (COP)
                            </label>
                            <input
                                id="dom-costo"
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={domForm.costoEnvio}
                                onChange={e => setDomForm({ ...domForm, costoEnvio: e.target.value.replace(/[^0-9]/g, '') })}
                                onBlur={e => {
                                    const v = e.target.value.replace(/[^0-9]/g, '');
                                    setDomForm({ ...domForm, costoEnvio: v ? parseInt(v).toLocaleString('es-CO') : '' });
                                }}
                                onFocus={e => setDomForm({ ...domForm, costoEnvio: e.target.value.replace(/[^0-9]/g, '') })}
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
                        <Button variant="secondary" onClick={closeDomicilio}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleCrearDomicilio}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Crear domicilio
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Gestionar mesas */}
            <Modal isOpen={showManage} onClose={() => setShowManage(false)} label="Gestionar mesas" maxWidth="max-w-lg">
                <div className="p-5">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-base font-semibold text-ink">Gestionar mesas</h3>
                            <p className="mt-0.5 text-2xs text-ink-muted">Agrega, renombra o desactiva mesas del salón.</p>
                        </div>
                        <button
                            onClick={() => setShowManage(false)}
                            className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                            aria-label="Cerrar"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <form onSubmit={handleCreateTable} className="space-y-3 rounded-xl border border-line bg-surface/50 p-3.5">
                        <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">Agregar mesa</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-2xs font-semibold text-ink-muted" htmlFor="mesa-numero">
                                    Número *
                                </label>
                                <input
                                    id="mesa-numero"
                                    required
                                    type="number"
                                    min="1"
                                    value={newTable.number}
                                    onChange={e => setNewTable({ ...newTable, number: e.target.value })}
                                    className="input-field h-9"
                                    placeholder="11"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-2xs font-semibold text-ink-muted" htmlFor="mesa-capacidad">
                                    Capacidad
                                </label>
                                <input
                                    id="mesa-capacidad"
                                    type="number"
                                    min="1"
                                    value={newTable.capacity}
                                    onChange={e => setNewTable({ ...newTable, capacity: e.target.value })}
                                    className="input-field h-9"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted" htmlFor="mesa-nombre">
                                Nombre visible
                            </label>
                            <input
                                id="mesa-nombre"
                                type="text"
                                value={newTable.name}
                                onChange={e => setNewTable({ ...newTable, name: e.target.value })}
                                className="input-field h-9"
                                placeholder={`Mesa ${newTable.number || ''}`.trim()}
                            />
                            <p className="mt-1 text-2xs text-ink-soft">Ej. “Terraza 1”, “Barra”, “Mesa familiar”.</p>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" variant="primary" disabled={savingTable} className="h-9 px-3.5 text-[13px]">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Agregar mesa
                            </Button>
                        </div>
                    </form>

                    <div className="mt-4">
                        <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                            Mesas activas ({tables.length})
                        </p>
                        {tables.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-2xs text-ink-muted">
                                Todavía no hay mesas activas.
                            </p>
                        ) : (
                            <ul className="max-h-72 divide-y divide-line-soft overflow-y-auto rounded-xl border border-line">
                                {tables.map(table => (
                                    <li key={table.id} className="flex items-center gap-2 px-3 py-2">
                                        <span className="num grid h-7 w-9 shrink-0 place-items-center rounded-md bg-surface text-[12px] font-semibold text-ink-muted">
                                            {String(table.number).padStart(2, '0')}
                                        </span>

                                        {renamingId === table.dbId ? (
                                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                                <input
                                                    autoFocus
                                                    value={renameValue}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') { e.preventDefault(); handleRename(table); }
                                                        if (e.key === 'Escape') setRenamingId(null);
                                                    }}
                                                    className="input-field h-8 text-[13px]"
                                                    aria-label={`Nuevo nombre para ${table.name}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRename(table)}
                                                    disabled={savingTable}
                                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-white disabled:opacity-60"
                                                    aria-label="Guardar nombre"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRenamingId(null)}
                                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
                                                    aria-label="Cancelar"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-semibold text-ink">{table.name}</p>
                                                    <p className="text-2xs text-ink-muted">{table.occupied ? 'Ocupada' : 'Libre'}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => startRename(table)}
                                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
                                                    aria-label={`Renombrar ${table.name}`}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeactivateTable(table)}
                                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-danger-soft hover:text-danger"
                                                    aria-label={`Desactivar ${table.name}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
