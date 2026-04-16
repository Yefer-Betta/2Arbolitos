/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, setData, getData, syncManager } from '../lib/api.js';
import { generateId } from '../lib/utils.js';

const OrdersContext = createContext();

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [activeTables, setActiveTables] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // ALWAYS load local data first - this is the priority
      const [ordersData, tablesData] = await Promise.all([
        getData('orders'),
        getData('activeTables'),
      ]);

      let localOrders = Array.isArray(ordersData) ? ordersData : [];
      // Local tables are the source of truth - NEVER overwrite
      let localTables = (tablesData && typeof tablesData === 'object') ? tablesData : {};

      console.log('LOAD: Local tables loaded:', JSON.stringify(localTables));

      if (syncManager.isOnline) {
        try {
          const [serverOrders, tableStates] = await Promise.all([
            apiGet('/orders'),
            apiGet('/tables/state'),
          ]);
          
          if (Array.isArray(serverOrders) && serverOrders.length > 0) {
            localOrders = serverOrders;
            await setData('orders', serverOrders);
          }

          // Merge with server active tables - only ADD new tables, don't overwrite existing
          if (tableStates && typeof tableStates === 'object') {
            const serverActiveTables = {};
            Object.entries(tableStates).forEach(([tableId, items]) => {
              if (items && items.length > 0) {
                serverActiveTables[tableId] = items;
              }
            });
            
            // For each server table, if our local is empty but server has data, add it
            Object.entries(serverActiveTables).forEach(([tableId, items]) => {
              if (!localTables[tableId] || localTables[tableId].length === 0) {
                console.log('LOAD: Merging from server to local - table:', tableId, 'items:', items.length);
                localTables[tableId] = items;
                setData('activeTables', localTables);
              }
            });
          }
        } catch (e) {
          console.warn('LOAD: Could not fetch from server:', e.message);
        }
      }

      setOrders(localOrders);
      setActiveTables(localTables);
      console.log('LOAD: Final activeTables:', JSON.stringify(localTables));
      setLoaded(true);
    } catch (error) {
      console.error('LOAD: Error loading orders data:', error);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Only load data ONCE on mount - NOT on every render
    if (!loaded) {
      loadData();
    }
    
    // Sync to server every 1 second - but NEVER reload from server
    const syncInterval = setInterval(() => {
      if (syncManager.isOnline && activeTables) {
        // Sync active tables TO server only
        Object.entries(activeTables).forEach(([tableId, items]) => {
          if (items && items.length > 0) {
            syncTableToServer(tableId, items);
          }
        });
      }
    }, 1000);
    
    // Don't listen to syncComplete - it would cause reload
    return () => {
      clearInterval(syncInterval);
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

  const addOrder = async (order) => {
    const newOrder = {
      ...order,
      id: generateId(),
      date: new Date().toISOString(),
      status: 'PENDING',
    };

    setOrders(prev => [newOrder, ...prev]);

    // NO limpiamos la mesa inmediatamente - esperamos a que el sync sea exitoso
    console.log('ORDER_CREATE: Order created locally, tableId:', order.tableId);

    await setData('orders', [newOrder, ...orders]);

    // Always transform items BEFORE trying to sync
    const originalItems = order.items || [];
    console.log('ORDER_CREATE: Original items count:', originalItems.length);
    console.log('ORDER_CREATE: First item structure:', originalItems[0]);

    const transformedItems = originalItems.map(item => ({
      productId: item.product?.id || item.productId,
      quantity: item.quantity,
      unitPrice: item.product?.price || item.unitPrice || 0,
      totalPrice: (item.product?.price || item.unitPrice || 0) * item.quantity,
      notes: item.notes || null,
    }));

    console.log('ORDER_CREATE: Transformed items:', JSON.stringify(transformedItems));

    const orderDataForServer = {
      tableId: order.tableId,
      orderType: order.orderType,
      items: transformedItems,
      exchangeRate: order.exchangeRateSnapshot || order.exchangeRate || 4000,
      discountValue: order.discountValue || 0,
      discountPercent: order.discountPercent || 0,
      payment: order.payment,
    };

    console.log('ORDER_CREATE: Full order data:', orderDataForServer);

    if (syncManager.isOnline) {
      try {
        console.log('ORDER_CREATE: Attempting to sync...');
        await apiPost('/orders', orderDataForServer);
        console.log('ORDER_CREATE: Sync successful! Limpiando mesa:', order.tableId);
        
        // Limpiar la mesa SOLO después de sync exitoso
        if (order.tableId) {
          setActiveTables(prevTables => {
            const newTables = { ...prevTables };
            delete newTables[order.tableId];
            return newTables;
          });
          await setData('activeTables', { ...activeTables, [order.tableId]: undefined });
        }
      } catch (e) {
        console.warn('ORDER_CREATE: Sync failed, saving locally:', e.message);
        await syncManager.addToQueue({
          type: 'CREATE',
          endpoint: '/orders',
          data: orderDataForServer,
        });
      }
    } else {
      console.log('ORDER_CREATE: Offline, saving to queue');
      await syncManager.addToQueue({
        type: 'CREATE',
        endpoint: '/orders',
        data: orderDataForServer,
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
      } catch {
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

  const syncTableToServer = async (idMesa, items) => {
    try {
      await apiPut('/tables/state', { tableId: idMesa, items });
    } catch (e) {
      console.warn('SYNC: Failed to sync table to server:', e.message);
    }
  };

  const agregarPlatilloAMesa = (idMesa, platillo) => {
    console.log('AGREGAR: Adding product to mesa:', idMesa, platillo.name);
    console.log('AGREGAR: Current tables before:', JSON.stringify(activeTables));
    
    setActiveTables(prevTables => {
      const currentTableOrder = prevTables[idMesa] || [];
      console.log('AGREGAR: Current order for mesa:', currentTableOrder.length, 'items');
      const existingProductIndex = currentTableOrder.findIndex(item => item.product.id === platillo.id);

      let newTableOrder;
      if (existingProductIndex > -1) {
        console.log('AGREGAR: Product already exists, increasing quantity');
        newTableOrder = currentTableOrder.map((item, index) =>
          index === existingProductIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        console.log('AGREGAR: New product, adding to cart');
        newTableOrder = [...currentTableOrder, { product: platillo, quantity: 1 }];
      }

      const newTables = { ...prevTables, [idMesa]: newTableOrder };
      console.log('AGREGAR: New tables:', JSON.stringify(newTables));
      setData('activeTables', newTables);
      
      // Sync to server
      syncTableToServer(idMesa, newTableOrder);
      
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
      
      // Sync to server
      if (newTableOrder.length > 0) {
        syncTableToServer(idMesa, newTableOrder);
      } else {
        // Delete from server if empty
        syncManager.fetchFromAPI(`/tables/state/${idMesa}`, { method: 'DELETE' }).catch(() => {});
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
      setData('activeTables', newTables);
      
      // Sync to server - delete state
      syncManager.fetchFromAPI(`/tables/state/${idMesa}`, { method: 'DELETE' }).catch(() => {});
      
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
