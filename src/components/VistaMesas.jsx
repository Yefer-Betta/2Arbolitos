import React, { useState } from 'react';
import { ChevronRight, LayoutGrid, MapPin, Phone, Plus, ShoppingBag, Truck, X } from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import { useSettings } from '../context/SettingsContext';
import { Modal } from './Modal';
import { useToast } from './ui/feedback-context';
import { PageHeader } from './ui/PageHeader';
import { Badge } from './ui/Badge';
import { Money } from './ui/Money';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export const PARA_LLEVAR_ID = 'para-llevar';

export function VistaMesas({ onSelectTable }) {
    const { activeTables, crearDomicilio } = useOrders();
    const { exchangeRate } = useSettings();
    const toast = useToast();
    const TOTAL_TABLES = 10;

    const [showNuevoDomicilio, setShowNuevoDomicilio] = useState(false);
    const [domForm, setDomForm] = useState({ direccion: '', telefono: '', costoEnvio: '' });

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

    const tables = Array.from({ length: TOTAL_TABLES }, (_, i) => {
        const id = `mesa-${i + 1}`;
        const items = activeTables[id]?.items || [];
        return { id, number: i + 1, items, occupied: items.length > 0, totals: calculateTableTotal(items) };
    });
    const freeTables = tables.filter(t => !t.occupied).length;

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
                            {freeTables} de {TOTAL_TABLES} mesas libres
                        </p>
                        <p className="truncate text-2xs text-ink-muted">
                            {TOTAL_TABLES - freeTables === 0
                                ? 'Sin cuentas abiertas'
                                : `${TOTAL_TABLES - freeTables} con cuenta abierta`}
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
                        <span className="text-2xs text-ink-muted">{freeTables} de {TOTAL_TABLES} libres</span>
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
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {tables.map(table => (
                        <button
                            key={table.id}
                            onClick={() => onSelectTable(table.id)}
                            aria-label={`Mesa ${table.number}: ${table.occupied ? 'ocupada' : 'libre'}`}
                            className={cn(
                                'group flex min-h-[96px] flex-col justify-between rounded-2xl border border-line bg-background-paper p-3.5 text-left transition-colors hover:border-primary/40',
                                table.occupied && 'border-l-[3px] border-l-secondary hover:border-l-secondary'
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-2xs uppercase tracking-wide text-ink-soft">Mesa</p>
                                    <p className="num mt-0.5 text-2xl font-semibold leading-none text-ink">
                                        {String(table.number).padStart(2, '0')}
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
        </div>
    );
}
