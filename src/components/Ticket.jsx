import React from 'react';

export function Ticket({ order, business, orderType }) {
    if (!order) return null;
    
    const getTypeLabel = () => {
        if (!orderType || orderType.startsWith('mesa-')) return `Mesa ${orderType?.replace('mesa-', '') || ''}`;
        if (orderType === 'para-llevar') return 'PARA LLEVAR';
        if (orderType === 'domicilio') return 'DOMICILIO';
        return orderType;
    };
    
    return (
        <div className="bg-white p-4 rounded-lg w-80 font-mono text-sm border border-gray-200 shadow-sm mx-auto">
            <div className="text-center mb-3 pb-3 border-b border-dashed border-gray-300">
                <h2 className="font-bold text-lg uppercase">{business.name}</h2>
                <p className="text-xs font-bold text-green-600 mt-1">{getTypeLabel()}</p>
                {business.nit && <p className="text-xs">NIT: {business.nit}</p>}
                {business.address && <p className="text-xs">{business.address}</p>}
                {business.phone && <p className="text-xs">Tel: {business.phone}</p>}
                <p className="mt-1 text-xs text-gray-500">{new Date(order.date).toLocaleString()}</p>
                <p className="text-xs text-gray-400">#{order.id?.slice(0, 8).toUpperCase()}</p>
            </div>

            <div className="space-y-1 mb-3 pb-3 border-b border-dashed border-gray-300">
                {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                        <span className="truncate w-32">{item.quantity} x {item.product?.name || item.name}</span>
                        <span>
                            {item.product?.isUsd
                                ? `$${(item.product.price * item.quantity).toFixed(2)}`
                                : `$${((item.product?.price || item.price) * item.quantity).toLocaleString()}`}
                        </span>
                    </div>
                ))}
            </div>

            <div className="space-y-1 text-xs">
                {order.discountValue > 0 && (
                    <>
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal:</span>
                            <span>${order.originalPriceCop?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-red-500 font-bold">
                            <span>Desc ({order.discountPercent?.toFixed(1)}%):</span>
                            <span>-${order.discountValue?.toLocaleString()}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>TOTAL</span>
                    <span>${order.totalCop?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                    <span>USD:</span>
                    <span>${order.totalUsd?.toFixed(2)}</span>
                </div>
            </div>

            <div className="space-y-1 text-xs mt-3 pt-2 border-t border-dashed">
                <div className="flex justify-between">
                    <span>Método:</span>
                    <span className="uppercase font-bold">
                        {order.payment?.method?.replaceAll('_', ' ') || 'N/A'}
                    </span>
                </div>
                {order.payment?.received > 0 && (
                    <>
                        <div className="flex justify-between">
                            <span>Recibido:</span>
                            <span>${order.payment.received?.toLocaleString()} {order.payment.currency}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>Cambio:</span>
                            <span>${order.payment.change?.toLocaleString()} {order.payment.currency}</span>
                        </div>
                    </>
                )}
            </div>

            {order.observations && (
                <div className="mt-3 pt-2 border-t text-xs text-gray-500">
                    <p><strong>Obs:</strong> {order.observations}</p>
                </div>
            )}

            <div className="text-center mt-3 pt-2 border-t border-dashed">
                <p className="text-xs">{business.message}</p>
            </div>
        </div>
    );
}

export default Ticket;
