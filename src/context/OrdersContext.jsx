/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const OrdersContext = createContext();

export function OrdersProvider({ children }) {
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('orders');
        return saved ? JSON.parse(saved) : [];
    });
    const [activeTables, setActiveTables] = useState(() => {
        const saved = localStorage.getItem('activeTables');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        localStorage.setItem('orders', JSON.stringify(orders));
    }, [orders]);

    useEffect(() => {
        try {
            localStorage.setItem('activeTables', JSON.stringify(activeTables));
        } catch (error) {
            console.error("Error al guardar las mesas activas en localStorage", error);
        }
    }, [activeTables]);

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

    // --- Funciones para Gestión de Mesas ---

    const agregarPlatilloAMesa = (idMesa, platillo) => {
        setActiveTables(prevTables => {
            const currentTableOrder = prevTables[idMesa] || [];
            const existingProductIndex = currentTableOrder.findIndex(item => item.product.id === platillo.id);

            let newTableOrder;
            if (existingProductIndex > -1) {
                // Si el producto ya existe, incrementa la cantidad
                newTableOrder = currentTableOrder.map((item, index) =>
                    index === existingProductIndex
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                // Si es un producto nuevo, lo añade al pedido
                newTableOrder = [...currentTableOrder, { product: platillo, quantity: 1 }];
            }

            return { ...prevTables, [idMesa]: newTableOrder };
        });
    };

    const actualizarCantidad = (idMesa, idPlatillo, cantidad) => {
        setActiveTables(prevTables => {
            const currentTableOrder = prevTables[idMesa] || [];
            let newTableOrder;

            if (cantidad <= 0) {
                newTableOrder = currentTableOrder.filter(item => item.product.id !== idPlatillo);
            } else {
                newTableOrder = currentTableOrder.map(item =>
                    item.product.id === idPlatillo ? { ...item, quantity: cantidad } : item
                );
            }

            const newTables = { ...prevTables };
            if (newTableOrder.length === 0) {
                delete newTables[idMesa];
            } else {
                newTables[idMesa] = newTableOrder;
            }
            return newTables;
        });
    };

    const eliminarPlatilloDeMesa = (idMesa, idPlatillo) => {
        actualizarCantidad(idMesa, idPlatillo, 0);
    };

    const limpiarMesa = (idMesa) => {
        setActiveTables(prevTables => {
            const newTables = { ...prevTables };
            delete newTables[idMesa];
            return newTables;
        });
    };

    const value = {
        orders,
        addOrder,
        getRecentOrders,
        updateOrderStatus,
        activeTables,
        agregarPlatilloAMesa,
        actualizarCantidad,
        eliminarPlatilloDeMesa,
        limpiarMesa,
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
