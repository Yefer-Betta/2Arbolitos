import React, { useMemo } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useFinance } from '../context/FinanceContext';
import { Utensils, Check } from 'lucide-react';

export function KitchenView() {
    const { orders, updateOrderStatus } = useOrders();
    const { lastClosureDate } = useFinance();

    const activeOrders = useMemo(() => {
        // Muestra los pedidos pendientes desde el último cierre de caja
        return orders
            .filter(
                o => new Date(o.date) > new Date(lastClosureDate) && o.status === 'PENDING'
            )
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Muestra los más recientes primero
    }, [orders, lastClosureDate]);

    if (activeOrders.length === 0) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-4">Pedidos para Cocina</h1>
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm text-gray-400">
                    <Check className="w-16 h-16 opacity-20 mb-4" />
                    <p className="font-medium">No hay pedidos activos en este momento.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">Pedidos para Cocina</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeOrders.map(order => (
                    <div key={order.id} className="bg-yellow-50 p-4 rounded-xl shadow-md border-l-4 border-yellow-400 flex flex-col">
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-bold text-lg">Orden #{order.id.slice(0, 5)}</h2>
                                <span className="text-xs font-bold text-gray-600">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <ul className="space-y-2">
                                {order.items.map(item => (
                                    <li key={item.product.id} className="flex justify-between items-center text-gray-800 border-t border-yellow-200/50 pt-2 mt-2">
                                        <span className="font-semibold">{item.quantity}x {item.product.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="mt-4 w-full bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" /> Listo
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}