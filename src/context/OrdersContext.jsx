/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGet, apiPost, setData, getData, syncManager } from '../lib/api.js';

const OrdersContext = createContext();

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [activeTables, setActiveTables] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadData();
    
    const syncInterval = setInterval(() => {
      if (syncManager.isOnline) {
        loadData();
      }
    }, 3000);
    
    const unsubscribe = syncManager.addListener((event, data) => {
      if (event === 'syncComplete' || event === 'timestamp') {
        loadData();
      }
    });
    
    return () => {
      clearInterval(syncInterval);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = syncManager.addListener((event, data) => {
      if (event === 'syncing') {
        setIsSyncing(data);
      }
    });
    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, tablesData] = await Promise.all([
        getData('orders'),
        getData('activeTables'),
      ]);

      let localOrders = Array.isArray(ordersData) ? ordersData : [];
      let localTables = (tablesData && typeof tablesData === 'object') ? tablesData : {};

      if (syncManager.isOnline) {
        try {
          const [serverOrders, serverTables] = await Promise.all([
            apiGet('/orders'),
            apiGet('/tables'),
          ]);
          
          if (Array.isArray(serverOrders) && serverOrders.length > 0) {
            localOrders = serverOrders;
            await setData('orders', serverOrders);
          }

          if (serverTables && Array.isArray(serverTables)) {
            const tableOrders = {};
            serverTables
              .filter(t => t.isOccupied && t.currentOrder)
              .forEach(t => {
                tableOrders[`mesa-${t.number}`] = t.currentOrder.items || [];
              });
            localTables = tableOrders;
            await setData('activeTables', tableOrders);
          }
        } catch (e) {
          console.warn('Could not fetch from server, using local data:', e);
        }
      }

      setOrders(localOrders);
      setActiveTables(localTables);
      setLoaded(true);
    } catch (error) {
      console.error('Error loading orders data:', error);
      setLoaded(true);
    }
  };

  const addOrder = async (order) => {
    const newOrder = {
      ...order,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      status: 'PENDING',
    };

    setOrders(prev => [newOrder, ...prev]);

    if (activeTables[order.tableId]) {
      setActiveTables(prev => {
        const newTables = { ...prev };
        delete newTables[order.tableId];
        return newTables;
      });
    }

    await setData('orders', [newOrder, ...orders]);

    if (syncManager.isOnline) {
      try {
        const transformedItems = order.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          totalPrice: item.product.price * item.quantity,
          notes: item.notes || null,
        }));

        await apiPost('/orders', {
          tableId: order.tableId,
          orderType: order.orderType,
          items: transformedItems,
          exchangeRate: order.exchangeRate,
          discountValue: order.discountValue,
          discountPercent: order.discountPercent,
          payment: order.payment,
        });
      } catch (e) {
        console.warn('Order saved locally, will sync later:', e);
      }
    } else {
      await syncManager.addToQueue({
        type: 'CREATE',
        endpoint: '/orders',
        data: { ...newOrder, items: order.items },
      });
    }

    return newOrder;
  };

  const getRecentOrders = (limit = 10) => {
    return orders.slice(0, limit);
  };

  const updateOrderStatus = async (orderId, status) => {
    setOrders(prevOrders =>
      prevOrders.map(o => (o.id === orderId ? { ...o, status } : o))
    );

    await setData('orders', orders);

    if (syncManager.isOnline) {
      try {
        await syncManager.fetchFromAPI(`/orders/${orderId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
      } catch (e) {
        console.warn('Status update queued for sync');
      }
    } else {
      await syncManager.addToQueue({
        type: 'UPDATE',
        endpoint: `/orders/${orderId}/status`,
        data: { status },
      });
    }
  };

  const agregarPlatilloAMesa = (idMesa, platillo) => {
    setActiveTables(prevTables => {
      const currentTableOrder = prevTables[idMesa] || [];
      const existingProductIndex = currentTableOrder.findIndex(item => item.product.id === platillo.id);

      let newTableOrder;
      if (existingProductIndex > -1) {
        newTableOrder = currentTableOrder.map((item, index) =>
          index === existingProductIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newTableOrder = [...currentTableOrder, { product: platillo, quantity: 1 }];
      }

      const newTables = { ...prevTables, [idMesa]: newTableOrder };
      setData('activeTables', newTables);
      return newTables;
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
      
      setData('activeTables', newTables);
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
      setData('activeTables', newTables);
      return newTables;
    });
  };

  const syncNow = async () => {
    setIsSyncing(true);
    await syncManager.syncNow();
    await loadData();
    setIsSyncing(false);
  };

  const value = {
    orders,
    setOrders,
    addOrder,
    getRecentOrders,
    updateOrderStatus,
    activeTables,
    agregarPlatilloAMesa,
    actualizarCantidad,
    eliminarPlatilloDeMesa,
    limpiarMesa,
    loaded,
    isSyncing,
    syncNow,
    isOnline: syncManager.isOnline,
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
