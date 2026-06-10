import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '../lib/api.js';
import { Clock, ChefHat, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

const STATUS_LABELS = { PENDING: 'Pendiente', PREPARING: 'Preparando', READY: 'Listo' };
const STATUS_COLORS = { PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300', PREPARING: 'bg-blue-100 text-blue-800 border-blue-300', READY: 'bg-green-100 text-green-800 border-green-300' };
const STATUS_ICONS = { PENDING: Clock, PREPARING: ChefHat, READY: CheckCircle };
const NEXT_STATUS = { PENDING: 'PREPARING', PREPARING: 'READY', READY: null };

export function KitchenView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/orders/kitchen');
      setOrders(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => {
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const advanceStatus = async (id, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      await apiPut(`/orders/${id}/status`, { status: next });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next } : o));
    } catch {}
  };

  const cancelOrder = async (id) => {
    if (!confirm('¿Cancelar este pedido?')) return;
    try {
      await apiPut(`/orders/${id}/status`, { status: 'CANCELLED' });
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch {}
  };

  const grouped = orders.reduce((acc, order) => {
    const key = order.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cocina</h2>
          <p className="text-gray-500 text-sm">Pedidos pendientes por preparar</p>
        </div>
        <button onClick={loadOrders} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
          <ChefHat className="w-12 h-12 opacity-20 mb-4" />
          <p className="font-medium">No hay pedidos pendientes</p>
          <p className="text-sm">Los pedidos nuevos aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="space-y-8">
          {['PENDING', 'PREPARING', 'READY'].map(status => {
            const items = grouped[status];
            if (!items || items.length === 0) return null;
            const Icon = STATUS_ICONS[status];
            return (
              <div key={status}>
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-gray-700">{STATUS_LABELS[status]}</h3>
                  <span className="text-sm text-gray-400">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map(order => (
                    <div key={order.id} className={cn('card bg-white border-2 overflow-hidden', STATUS_COLORS[status].split(' ').pop())}>
                      <div className={cn('px-4 py-3 border-b flex items-center justify-between', STATUS_COLORS[status].split(' ').slice(0, 2).join(' '))}>
                        <div>
                          <span className="font-bold text-sm">
                            {order.table ? `Mesa ${order.table.number || order.table.name}` : order.orderType === 'DOMICILIO' ? 'Domicilio' : 'Para llevar'}
                          </span>
                          <span className="text-xs ml-2 opacity-70">
                            {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-xs font-bold uppercase">{STATUS_LABELS[status]}</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between items-center">
                            <div>
                              <span className="font-medium text-gray-800">{item.quantity}x </span>
                              <span className="text-gray-600">{item.product?.name || 'Producto'}</span>
                            </div>
                            {item.notes && <span className="text-xs text-gray-400 italic">{item.notes}</span>}
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3 border-t bg-gray-50 flex gap-2">
                        {NEXT_STATUS[status] && (
                          <button onClick={() => advanceStatus(order.id, status)} className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            {status === 'PENDING' ? 'Iniciar' : 'Marcar listo'}
                          </button>
                        )}
                        {status === 'PENDING' && (
                          <button onClick={() => cancelOrder(order.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar pedido">
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
