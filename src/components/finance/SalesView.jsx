import React from 'react';
import { Printer, Receipt, Search } from 'lucide-react';
import { getOrderTypeLabel as getTypeLabel } from '../../lib/sales';
import { formatCurrency } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Panel, PanelHeader } from '../ui/Panel';
import { EmptyState } from '../ui/EmptyState';

const TYPE_TONE = {
    mesa: 'warn',
    'para-llevar': 'info',
    domicilio: 'brand',
};

function typeTone(orderType) {
    const type = String(orderType || '').toLowerCase();
    if (type === 'mesa' || type.startsWith('mesa-')) return TYPE_TONE.mesa;
    if (type.includes('llevar')) return TYPE_TONE['para-llevar'];
    if (type.includes('domicilio')) return TYPE_TONE.domicilio;
    return 'neutral';
}

function timeOf(order) {
    return new Date(order.date || order.createdAt).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function SalesView({
    salesDateFilter,
    setSalesDateFilter,
    salesTypeFilter,
    setSalesTypeFilter,
    salesSearchId,
    setSalesSearchId,
    filteredSales,
    filteredSalesTotal,
    handlePrint,
}) {
    return (
        <div className="space-y-4">
            <Panel>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label className="mb-1 block text-2xs font-semibold text-ink-muted">Fecha</label>
                        <input
                            type="date"
                            value={salesDateFilter}
                            onChange={e => setSalesDateFilter(e.target.value)}
                            className="input-field h-9"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-2xs font-semibold text-ink-muted">Tipo de pedido</label>
                        <select
                            value={salesTypeFilter}
                            onChange={e => setSalesTypeFilter(e.target.value)}
                            className="input-field h-9"
                        >
                            <option value="all">Todos</option>
                            <option value="mesa">Mesa</option>
                            <option value="para-llevar">Para llevar</option>
                            <option value="domicilio">Domicilio</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-2xs font-semibold text-ink-muted">Buscar ID</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
                            <input
                                type="text"
                                placeholder="ID de orden..."
                                value={salesSearchId}
                                onChange={e => setSalesSearchId(e.target.value)}
                                className="input-field h-9 pl-8"
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <div className="w-full rounded-xl border border-line bg-surface px-3 py-1.5">
                            <p className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Total del día</p>
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="num text-lg font-semibold leading-tight text-ink">
                                    {formatCurrency(filteredSalesTotal)}
                                </p>
                                <span className="text-2xs text-ink-muted">{filteredSales.length} pedidos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>

            <Panel>
                <PanelHeader title="Ventas del día" subtitle="Reimprime el ticket de cualquier pedido." />

                {filteredSales.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title="Sin ventas para estos filtros"
                        description="Cambia la fecha o el tipo de pedido para ver otros resultados."
                    />
                ) : (
                    <>
                        <div className="divide-y divide-line-soft md:hidden">
                            {filteredSales.map(order => (
                                <div key={order.id} className="space-y-2 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-mono text-2xs text-ink-muted">
                                                {order.id?.slice(0, 8).toUpperCase()}
                                            </p>
                                            <p className="num text-2xs text-ink-soft">{timeOf(order)}</p>
                                        </div>
                                        <Badge tone={typeTone(order.orderType)} className="rounded-md">
                                            {getTypeLabel(order.orderType)}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {order.items?.slice(0, 3).map((item, i) => (
                                            <span
                                                key={i}
                                                className="rounded bg-surface px-1.5 py-0.5 text-2xs text-ink-muted"
                                            >
                                                {item.quantity}x {item.product?.name?.slice(0, 14)}
                                            </span>
                                        ))}
                                        {order.items?.length > 3 && (
                                            <span className="text-2xs text-ink-soft">+{order.items.length - 3}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between border-t border-line-soft pt-2">
                                        <span className="num text-[13px] font-semibold text-ink">
                                            {formatCurrency(order.totalCop)}
                                        </span>
                                        <button
                                            onClick={() => handlePrint(order)}
                                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                            aria-label="Reimprimir factura"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Hora</th>
                                        <th>Tipo</th>
                                        <th>Ítems</th>
                                        <th className="text-right">Total</th>
                                        <th className="w-12 text-center">
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.map(order => (
                                        <tr key={order.id}>
                                            <td className="font-mono text-2xs text-ink-muted">
                                                {order.id?.slice(0, 8).toUpperCase()}
                                            </td>
                                            <td className="num whitespace-nowrap text-ink-muted">{timeOf(order)}</td>
                                            <td>
                                                <Badge tone={typeTone(order.orderType)} className="rounded-md">
                                                    {getTypeLabel(order.orderType)}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div className="flex flex-wrap gap-1">
                                                    {order.items?.slice(0, 3).map((item, i) => (
                                                        <span
                                                            key={i}
                                                            className="rounded bg-surface px-1.5 py-0.5 text-2xs text-ink-muted"
                                                        >
                                                            {item.quantity}x {item.product?.name?.slice(0, 14)}
                                                        </span>
                                                    ))}
                                                    {order.items?.length > 3 && (
                                                        <span className="text-2xs text-ink-soft">
                                                            +{order.items.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="cell-num font-semibold text-ink">
                                                {formatCurrency(order.totalCop)}
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    onClick={() => handlePrint(order)}
                                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                                    title="Reimprimir"
                                                    aria-label="Reimprimir factura"
                                                >
                                                    <Printer className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Panel>
        </div>
    );
}
