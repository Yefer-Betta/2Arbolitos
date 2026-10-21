import React, { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCircle, ChefHat, Clock, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useOrders } from '../context/OrdersContext';
import { useConfirm, useToast } from './ui/feedback-context';
import { PageHeader } from './ui/PageHeader';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';

const STATUS_LABELS = { PENDING: 'Pendiente', PREPARING: 'Preparando', READY: 'Listo' };
const KITCHEN_STATUSES = ['PENDING', 'PREPARING', 'READY'];
const NEXT_STATUS = { PENDING: 'PREPARING', PREPARING: 'READY', READY: null };

const STATUS_STYLE = {
  PENDING: { dot: 'bg-warn', text: 'text-warn', icon: Clock },
  PREPARING: { dot: 'bg-info', text: 'text-info', icon: ChefHat },
  READY: { dot: 'bg-ok', text: 'text-ok', icon: CheckCircle },
};

export function KitchenView() {
  const { orders, updateOrderStatus, isOnline, loaded } = useOrders();
  const toast = useToast();
  const confirm = useConfirm();
  const [seenIds, setSeenIds] = useState(() => new Set());

  const kitchenOrders = useMemo(() => {
    const filtered = orders.filter(o => KITCHEN_STATUSES.includes(o.status));
    return [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [orders]);

  const pendingIds = useMemo(
    () => kitchenOrders.filter(o => o.status === 'PENDING').map(o => o.id),
    [kitchenOrders]
  );
  const newOrdersCount = pendingIds.filter(id => !seenIds.has(id)).length;

  useEffect(() => {
    if (newOrdersCount > 0 && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(200);
    }
  }, [newOrdersCount]);

  const dismissNewOrders = () => {
    setSeenIds(new Set(pendingIds));
  };

  const advanceStatus = async (id, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    await updateOrderStatus(id, next);
    toast.success(next === 'READY' ? 'Pedido marcado como listo' : 'Pedido en preparación');
  };

  const cancelOrder = async (id) => {
    const ok = await confirm({
      title: '¿Cancelar este pedido?',
      message: 'El pedido se marcará como cancelado y saldrá de la cocina.',
      confirmLabel: 'Cancelar pedido',
      cancelLabel: 'Volver',
      danger: true,
    });
    if (!ok) return;
    await updateOrderStatus(id, 'CANCELLED');
    toast.info('Pedido cancelado');
  };

  const grouped = kitchenOrders.reduce((acc, order) => {
    const key = order.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col gap-4 md:gap-5">
      <PageHeader
        title="Cocina"
        subtitle="Pedidos por preparar, en curso y listos para servir."
        actions={
          <>
            {!isOnline && <Badge tone="danger">Sin conexión</Badge>}
            {newOrdersCount > 0 && (
              <button
                onClick={dismissNewOrders}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-warn/20 bg-warn-soft px-3 text-xs font-semibold text-warn"
              >
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                {newOrdersCount} nuevo{newOrdersCount > 1 ? 's' : ''}
              </button>
            )}
          </>
        }
      />

      <div aria-live="polite" className="sr-only">
        {newOrdersCount > 0
          ? `${newOrdersCount} pedido${newOrdersCount > 1 ? 's' : ''} nuevo${newOrdersCount > 1 ? 's' : ''} para preparar`
          : ''}
      </div>

      {!loaded && kitchenOrders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : kitchenOrders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line bg-background-paper">
          <EmptyState
            icon={ChefHat}
            title="No hay pedidos en cocina"
            description="Los pedidos nuevos aparecerán aquí automáticamente."
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
          {KITCHEN_STATUSES.map(status => {
            const items = grouped[status] || [];
            const style = STATUS_STYLE[status];
            const Icon = style.icon;

            return (
              <section
                key={status}
                className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface/40"
                aria-label={STATUS_LABELS[status]}
              >
                <header className="flex items-center gap-2 border-b border-line bg-background-paper px-3 py-2.5">
                  <span className={cn('h-2 w-2 rounded-full', style.dot)} aria-hidden="true" />
                  <Icon className={cn('h-4 w-4', style.text)} aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-ink">{STATUS_LABELS[status]}</h2>
                  <span className="num ml-auto text-xs font-semibold text-ink-muted">{items.length}</span>
                </header>

                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
                  {items.length === 0 && (
                    <p className="px-2 py-10 text-center text-xs text-ink-soft">Sin pedidos</p>
                  )}

                  {items.map(order => {
                    const tableLabel = order.table
                      ? `Mesa ${order.table.number || order.table.name}`
                      : order.orderType === 'DOMICILIO'
                        ? 'Domicilio'
                        : 'Para llevar';

                    return (
                      <article key={order.id} className="overflow-hidden rounded-xl border border-line bg-background-paper">
                        <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-2">
                          <span className="truncate rounded-md bg-primary/5 px-1.5 py-0.5 text-2xs font-semibold text-ink-brand">
                            {tableLabel}
                          </span>
                          <span className="num shrink-0 text-2xs text-ink-muted">
                            {new Date(order.createdAt).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </span>
                        </div>

                        <ul className="space-y-1.5 px-3 py-2.5">
                          {(order.items || []).map(item => (
                            <li key={item.id} className="flex items-start justify-between gap-2">
                              <span className="text-xs text-ink">
                                <span className="num font-semibold">{item.quantity}x</span>{' '}
                                {item.product?.name || 'Producto'}
                              </span>
                              {item.notes && (
                                <span className="max-w-[45%] truncate text-2xs italic text-warn" title={item.notes}>
                                  {item.notes}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>

                        <div className="flex gap-1.5 border-t border-line-soft px-2.5 py-2">
                          {NEXT_STATUS[status] && (
                            <button
                              onClick={() => advanceStatus(order.id, status)}
                              className="btn-primary h-9 flex-1 text-xs"
                            >
                              {status === 'PENDING' ? (
                                <ChefHat className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {status === 'PENDING' ? 'Iniciar' : 'Marcar listo'}
                            </button>
                          )}
                          {status === 'PENDING' && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="grid h-9 w-9 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
                              title="Cancelar pedido"
                              aria-label="Cancelar pedido"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
