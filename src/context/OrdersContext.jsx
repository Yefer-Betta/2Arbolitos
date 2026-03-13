import React, { createContext, useContext, useState, useEffect } from 'react';

const OrdersContext = createContext();

export function OrdersProvider({ children }) {
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('orders');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('orders', JSON.stringify(orders));
    }, [orders]);

    const addOrder = (order) => {
        const newOrder = {
            ...order,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            status: 'pending' // 'pending', 'ready', 'served'
        };
        setOrders([newOrder, ...orders]);
        return newOrder;
    };

    const getRecentOrders = (limit = 10) => {
        return orders.slice(0, limit);
    };

    const updateOrderStatus = (orderId, status) => {
        setOrders(prevOrders =>
            prevOrders.map(o => (o.id === orderId ? { ...o, status } : o))
        );
    };

    const value = {
        orders,
        addOrder,
        getRecentOrders,
        updateOrderStatus,
    };

    return (
        <OrdersContext.Provider value={value}>
            {children}
        </OrdersContext.Provider>
    );
}

export function useOrders() {
    const context = useContext(OrdersContext);
    if (context === undefined) {
        throw new Error('useOrders must be used within a OrdersProvider');
    }
    return context;
}
