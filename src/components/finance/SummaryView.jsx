import React from 'react';
import {
    Trash2,
    TrendingUp,
    TrendingDown,
    Wallet,
    Receipt,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { useConfirm } from '../ui/feedback-context';
import { StatCard } from '../ui/StatCard';
import { Panel, PanelHeader } from '../ui/Panel';
import { EmptyState } from '../ui/EmptyState';

const METHODS = [
    { key: 'cash_cop', label: 'Efectivo COP', dot: 'bg-ok', cop: true },
    { key: 'cash_usd', label: 'Efectivo USD', dot: 'bg-info', usd: true },
    { key: 'cash_bs', label: 'Efectivo Bs.', dot: 'bg-warn', bs: true },
    { key: 'nequi', label: 'Nequi', dot: 'bg-primary', cop: true },
    { key: 'debit', label: 'Débito', dot: 'bg-ink-soft', cop: true },
];

function methodValue(method, salesByMethod) {
    const value = salesByMethod[method.key] || 0;
    if (method.usd) return `$${value.toFixed(2)} USD`;
    if (method.bs) return `Bs. ${value.toFixed(2)}`;
    return formatCurrency(value);
}

export function SummaryView({
    isAdding,
    setIsAdding,
    formData,
    setFormData,
    handleSubmit,
    currentOrders,
    totalSalesCOP,
    totalSalesUSD = 0,
    totalExpenses,
    netBalance,
    lastClosureDate,
    salesByMethod,
    currentExpenses,
    deleteExpense,
}) {
    const confirm = useConfirm();
    const closureDate = new Date(lastClosureDate);
    const hasClosure = !Number.isNaN(closureDate.getTime()) && closureDate.getFullYear() > 2000;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                <StatCard
                    label="Ventas del turno"
                    value={formatCurrency(totalSalesCOP)}
                    hint={`${currentOrders.length} pedidos · $${Number(totalSalesUSD).toFixed(2)} USD`}
                    icon={TrendingUp}
                    tone="ok"
                />
                <StatCard
                    label="Gastos del turno"
                    value={formatCurrency(totalExpenses)}
                    hint={`${currentExpenses.length} registros`}
                    icon={TrendingDown}
                    tone="danger"
                />
                <StatCard
                    label="Balance neto"
                    value={formatCurrency(netBalance)}
                    hint={hasClosure ? `Desde el cierre del ${formatDate(lastClosureDate)}` : 'Sin cierre previo · turno inicial'}
                    icon={Wallet}
                    tone="brand"
                    className="col-span-2 sm:col-span-1"
                />
            </div>

            <Panel>
                <PanelHeader title="Ventas por método de pago" subtitle="Turno actual" />
                <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-5">
                    {METHODS.map((method, index) => (
                        <div
                            key={method.key}
                            className={
                                index === METHODS.length - 1
                                    ? 'col-span-2 bg-background-paper px-4 py-3 sm:col-span-1'
                                    : 'bg-background-paper px-4 py-3'
                            }
                        >
                            <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-ink-muted">
                                <span className={cn('h-1.5 w-1.5 rounded-full', method.dot)} />
                                {method.label}
                            </p>
                            <p className="num mt-1.5 text-[15px] font-semibold text-ink">
                                {methodValue(method, salesByMethod)}
                            </p>
                        </div>
                    ))}
                </div>
            </Panel>

            {isAdding && (
                <Panel>
                    <PanelHeader
                        title="Nuevo gasto"
                        subtitle="Se descuenta del balance del turno."
                        actions={
                            <button
                                onClick={() => setIsAdding(false)}
                                className="text-xs font-medium text-ink-muted hover:text-ink"
                            >
                                Cancelar
                            </button>
                        }
                    />
                    <form onSubmit={handleSubmit} className="grid gap-3 p-4 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Descripción</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Compra de salsas"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="input-field h-9"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Categoría</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Insumos"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="input-field h-9"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-2xs font-semibold text-ink-muted">Monto (COP)</label>
                            <div className="flex gap-2">
                                <input
                                    required
                                    type="number"
                                    placeholder="0"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="input-field h-9"
                                />
                                <button type="submit" className="btn-primary h-9 shrink-0 px-3 text-[13px]">
                                    Registrar
                                </button>
                            </div>
                        </div>
                    </form>
                </Panel>
            )}

            <Panel>
                <PanelHeader
                    title="Gastos del turno"
                    subtitle="Solo se muestran los gastos posteriores al último cierre."
                />

                {currentExpenses.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title="Sin gastos en este turno"
                        description="Registra una compra o salida de caja para verla aquí."
                        action={
                            !isAdding ? (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="text-xs font-semibold text-ink-brand hover:underline"
                                >
                                    Registrar el primer gasto
                                </button>
                            ) : null
                        }
                    />
                ) : (
                    <>
                        <div className="divide-y divide-line-soft md:hidden">
                            {currentExpenses.map(expense => (
                                <div key={expense.id} className="flex items-start justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-[13px] font-medium text-ink">{expense.description}</p>
                                        <p className="mt-0.5 text-2xs text-ink-muted">
                                            {new Date(expense.date).toLocaleDateString('es-CO')} · {expense.category}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <span className="num text-[13px] font-semibold text-danger">
                                            - {formatCurrency(expense.amount)}
                                        </span>
                                        <button
                                            onClick={() => {
                                                confirm({
                                                    title: '¿Eliminar este gasto?',
                                                    confirmLabel: 'Eliminar',
                                                    danger: true,
                                                }).then(ok => {
                                                    if (ok) deleteExpense(expense.id);
                                                });
                                            }}
                                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                                            aria-label={`Eliminar gasto ${expense.description}`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Descripción</th>
                                        <th>Categoría</th>
                                        <th className="text-right">Monto</th>
                                        <th className="w-12 text-center">
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentExpenses.map(expense => (
                                        <tr key={expense.id}>
                                            <td className="num whitespace-nowrap text-ink-muted">
                                                {new Date(expense.date).toLocaleDateString('es-CO')}
                                            </td>
                                            <td className="font-medium text-ink">{expense.description}</td>
                                            <td>
                                                <span className="rounded-md bg-surface px-1.5 py-0.5 text-2xs font-medium text-ink-muted">
                                                    {expense.category}
                                                </span>
                                            </td>
                                            <td className="cell-num whitespace-nowrap font-semibold text-danger">
                                                - {formatCurrency(expense.amount)}
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    onClick={() => {
                                                        confirm({
                                                            title: '¿Eliminar este gasto?',
                                                            confirmLabel: 'Eliminar',
                                                            danger: true,
                                                        }).then(ok => {
                                                            if (ok) deleteExpense(expense.id);
                                                        });
                                                    }}
                                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                                                    aria-label={`Eliminar gasto ${expense.description}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
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
