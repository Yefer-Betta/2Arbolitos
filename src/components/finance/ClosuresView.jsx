import React from 'react';
import { CalendarClock, Eye } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Panel, PanelHeader } from '../ui/Panel';
import { EmptyState } from '../ui/EmptyState';

function dateParts(value) {
    const date = new Date(value);
    return {
        day: date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
}

export function ClosuresView({ closures, setSelectedClosure }) {
    return (
        <Panel>
            <PanelHeader
                title="Cierres anteriores"
                subtitle={`${closures.length} ${closures.length === 1 ? 'cierre registrado' : 'cierres registrados'}`}
            />

            {closures.length === 0 ? (
                <EmptyState
                    icon={CalendarClock}
                    title="Todavía no hay cierres"
                    description="Al cerrar la caja del día el resumen queda guardado aquí."
                />
            ) : (
                <>
                    <div className="divide-y divide-line-soft md:hidden">
                        {closures.map(closure => {
                            const { day, time } = dateParts(closure.date);
                            return (
                                <div key={closure.id} className="space-y-2.5 px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[13px] font-semibold text-ink">{day}</p>
                                            <p className="num text-2xs text-ink-muted">{time}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedClosure(closure)}
                                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                            aria-label="Ver detalle del cierre"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 text-center">
                                        <div className="rounded-lg bg-surface py-1.5">
                                            <p className="text-[9px] uppercase tracking-wide text-ink-muted">Pedidos</p>
                                            <p className="num text-xs font-semibold text-ink">{closure.orderCount || 0}</p>
                                        </div>
                                        <div className="rounded-lg bg-ok-soft py-1.5">
                                            <p className="text-[9px] uppercase tracking-wide text-ok">Ventas</p>
                                            <p className="num text-xs font-semibold text-ok">
                                                {formatCurrency(closure.totalSalesCOP || 0)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-danger-soft py-1.5">
                                            <p className="text-[9px] uppercase tracking-wide text-danger">Gastos</p>
                                            <p className="num text-xs font-semibold text-danger">
                                                - {formatCurrency(closure.totalExpenses || 0)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-line-soft pt-2">
                                        <span className="text-2xs font-medium uppercase tracking-wide text-ink-muted">
                                            Balance
                                        </span>
                                        <span className="num text-[13px] font-semibold text-ink-brand">
                                            {formatCurrency((closure.totalSalesCOP || 0) - (closure.totalExpenses || 0))}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Fecha / hora</th>
                                    <th className="text-right">Pedidos</th>
                                    <th className="text-right">Ventas</th>
                                    <th className="text-right">Gastos</th>
                                    <th className="text-right">Balance</th>
                                    <th className="w-12 text-center">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {closures.map(closure => {
                                    const { day, time } = dateParts(closure.date);
                                    return (
                                        <tr key={closure.id}>
                                            <td>
                                                <p className="font-medium text-ink">{day}</p>
                                                <p className="num text-2xs text-ink-muted">{time}</p>
                                            </td>
                                            <td className="cell-num text-ink-muted">{closure.orderCount || 0}</td>
                                            <td className="cell-num font-semibold text-ok">
                                                {formatCurrency(closure.totalSalesCOP || 0)}
                                            </td>
                                            <td className="cell-num text-danger">
                                                - {formatCurrency(closure.totalExpenses || 0)}
                                            </td>
                                            <td className="cell-num font-semibold text-ink">
                                                {formatCurrency(
                                                    (closure.totalSalesCOP || 0) - (closure.totalExpenses || 0)
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    onClick={() => setSelectedClosure(closure)}
                                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                                                    title="Ver detalle"
                                                    aria-label="Ver detalle del cierre"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Panel>
    );
}
