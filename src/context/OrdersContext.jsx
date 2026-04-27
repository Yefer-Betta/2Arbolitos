/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut, setData, getData, syncManager } from '../lib/api.js';
import { generateId } from '../lib/utils.js';

const OrdersContext = createContext();

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [activeTables, setActiveTables] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const activeTablesRef = useRef(activeTables);
  activeTablesRef.current = activeTables;
  const clearedTablesRef = useRef(new Set());

  const loadData = useCallback(async () => {
    try {
      const [ordersData, tablesData] = await Promise.all([
        getData('orders'),
        getData('activeTables'),
      ]);

      let localOrders = Array.isArray(ordersData) ? ordersData : [];
      let localTables = (tablesData && typeof tablesData === 'object') ? tablesData : {};

      console.log('LOAD: Local tables loaded:', JSON.stringify(localTables));

      if (syncManager.isOnline) {
        try {
          const [serverOrders, tableStates] = await Promise.all([
            apiGet('/orders'),
            syncManager.fetchFromAPI('/tables/state').catch(e => {
              console.warn('LOAD: Error fetching table states:', e.message);
              return {};
            }),
          ]);
          
          if (Array.isArray(serverOrders) && serverOrders.length > 0) {
            localOrders = serverOrders;
            await setData('orders', serverOrders);
          }

          if (tableStates && typeof tableStates === 'object') {
            const now = Date.now();
            let hasChanges = false;
            
            Object.entries(tableStates).forEach(([tableId, items]) => {
              // Skip tables that were just cleared - preserve local cleared state
              if (clearedTablesRef.current.has(tableId)) {
                console.log('LOAD: Skipping cleared table from server:', tableId);
                // Ensure it's removed locally if still present
                if (localTables[tableId] && localTables[tableId].length > 0) {
                  delete localTables[tableId];
                  hasChanges = true;
                }
                return;
              }
              
              // Skip empty or invalid items
              if (!items || items.length === 0) return;
              if (!Array.isArray(items)) {
                console.warn('LOAD: Invalid items for table:', tableId, typeof items);
                return;
              }
              
              const localItem = localTables[tableId];
              const serverTimestamp = items._timestamp || now;
              const localTimestamp = localItem?._timestamp || 0;
              
              if (!localItem || localItem.length === 0 || serverTimestamp > localTimestamp) {
                console.log('LOAD: Merging from server - table:', tableId, 'items:', items.length, 'ts:', serverTimestamp);
                localTables[tableId] = items;
                hasChanges = true;
              } else if (localTimestamp > serverTimestamp && localItem.length > 0) {
                console.log('LOAD: Pushing local to server - table:', tableId, 'ts:', localTimestamp);
                syncTableToServer(tableId, localItem);
              }
            });
            
            if (hasChanges) {
              await setData('activeTables', localTables);
            }
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
    if (!loaded) {
      loadData();
    }
  }, [loaded, loadData]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!syncManager.isOnline) return;
      const tables = activeTablesRef.current || {};
      Object.entries(tables).forEach(([tableId, items]) => {
        if (items && items.length > 0) {
          syncTableToServer(tableId, items);
        }
      });
    }, 1000);

    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const pull = setInterval(() => {
      if (syncManager.isOnline) {
        loadData();
      }
    }, 4000);
    return () => clearInterval(pull);
  }, [loaded, loadData]);

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

    // Persistir siempre la lista nueva (evita closure obsoleto que borraba ventas en el celular)
    setOrders((prev) => {
      const next = [newOrder, ...prev];
      void setData('orders', next);
      return next;
    });

    console.log('ORDER_CREATE: Order created locally, tableId:', order.tableId);

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
        const created = await apiPost('/orders', orderDataForServer);
        console.log('ORDER_CREATE: Sync response:', created?.id, created?.offline);

        if (created && !created.offline && created.id) {
          setOrders((prev) => {
            const rest = prev.filter((o) => o.id !== newOrder.id);
            const next = [created, ...rest];
            void setData('orders', next);
            return next;
          });

          if (order.tableId) {
            setActiveTables((prevTables) => {
              const newTables = { ...prevTables };
              delete newTables[order.tableId];
              void setData('activeTables', newTables);
              return newTables;
            });
            syncManager
              .fetchFromAPI(`/tables/state/${encodeURIComponent(order.tableId)}`, { method: 'DELETE' })
              .catch(() => {});
          }
        } else {
          throw new Error('Server did not return valid order');
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
    setOrders((prevOrders) => {
      const next = prevOrders.map((o) => (o.id === orderId ? { ...o, status } : o));
      void setData('orders', next);
      return next;
    });

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
      const dataToSync = {
        tableId: idMesa,
        items,
        _timestamp: Date.now()
      };
      await apiPut('/tables/state', dataToSync);
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
          item.product.id === idPlatillo
            ? { ...item, quantity: cantidad }
            : item
        );
      }

      const newTables = { ...prevTables, [idMesa]: newTableOrder };
      setData('activeTables', newTables);
      
      if (newTableOrder.length > 0) {
        syncTableToServer(idMesa, newTableOrder);
      } else {
        syncManager.fetchFromAPI(`/tables/state/${idMesa}`, { method: 'DELETE' }).catch(() => {});
      }
      
      return newTables;
    });
  };

  const eliminarPlatilloDeMesa = (idMesa, idPlatillo) => {
    actualizarCantidad(idMesa, idPlatillo, 0);
  };

  const limpiarMesa = (idMesa) => {
    // Marcar mesa como limpiada para evitar que loadData la restaure
    clearedTablesRef.current.add(idMesa);
    
    // Forzar sync inmediata después de limpiar
    const forceSyncAfterClear = async () => {
      // Mantener el flag por 15 segundos para cubrir múltiples intervalos
      setTimeout(() => {
        clearedTablesRef.current.delete(idMesa);
      }, 15000);
      
      // Sincronizar inmediatamente para borrar del servidor
      try {
        await syncManager.fetchFromAPI(`/tables/state/${idMesa}`, { method: 'DELETE' });
      } catch (e) {
        // ignore - se guardará en cola
      }
    };
    
    setActiveTables(prevTables => {
      const newTables = { ...prevTables };
      delete newTables[idMesa];
      setData('activeTables', newTables);
      forceSyncAfterClear();
      
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
    loadData,
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
