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
  const syncTimeoutRef = useRef(null);

  const getApiBase = () => {
    if (typeof window === 'undefined') return '/api';
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && String(envUrl).trim()) return String(envUrl).replace(/\/$/, '');
    return `${window.location.origin}/api`;
  };

  const syncTableToServer = async (idMesa) => {
    try {
      const entry = activeTablesRef.current[idMesa];
      if (!entry) return;
      const { items, version } = entry;

      const result = await apiPut('/tables/state', {
        tableId: idMesa,
        items,
        _clientVersion: version,
      });

      if (result?.conflict) {
        setActiveTables(prevTables => {
          const serverItems = Array.isArray(result.serverData) ? result.serverData : [];
          const localItems = prevTables[idMesa]?.items || [];

          const merged = [...serverItems];
          localItems.forEach(local => {
            if (!merged.find(m => m.product?.id === local.product?.id)) {
              merged.push(local);
            }
          });

          const newEntry = { items: merged, version: result.serverVersion };
          const newTables = { ...prevTables, [idMesa]: newEntry };
          setData('activeTables', newTables);
          return newTables;
        });
      } else if (result?.version) {
        setActiveTables(prevTables => {
          const prev = prevTables[idMesa];
          if (!prev) return prevTables;
          const newEntry = { ...prev, version: result.version };
          const newTables = { ...prevTables, [idMesa]: newEntry };
          setData('activeTables', newTables);
          return newTables;
        });
      }
    } catch {}
  };

  const debouncedSyncTable = useCallback((idMesa) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncTableToServer(idMesa);
    }, 300);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [ordersData, tablesData] = await Promise.all([
        getData('orders'),
        getData('activeTables'),
      ]);

      let localOrders = Array.isArray(ordersData) ? ordersData : [];
      let localTables = (tablesData && typeof tablesData === 'object') ? tablesData : {};

      if (syncManager.isOnline) {
        try {
          const [serverOrders, tableStates] = await Promise.all([
            apiGet('/orders'),
            syncManager.fetchFromAPI('/tables/state').catch(() => ({})),
          ]);

          if (Array.isArray(serverOrders) && serverOrders.length > 0) {
            localOrders = serverOrders;
            await setData('orders', serverOrders);
          }

          if (tableStates && typeof tableStates === 'object') {
            let hasChanges = false;

            Object.entries(tableStates).forEach(([tableId, entry]) => {
              if (clearedTablesRef.current.has(tableId)) {
                if (localTables[tableId]) {
                  delete localTables[tableId];
                  hasChanges = true;
                }
                return;
              }

              if (!entry || !Array.isArray(entry.items)) return;

              const serverVersion = entry.version || 0;
              const localEntry = localTables[tableId];
              const localVersion = localEntry?.version || 0;
              const localItems = localEntry?.items || [];

              if (!localEntry || localItems.length === 0 || serverVersion > localVersion) {
                localTables[tableId] = entry;
                hasChanges = true;
              } else if (localVersion > serverVersion && localItems.length > 0) {
                debouncedSyncTable(tableId);
              }
            });

            if (hasChanges) {
              await setData('activeTables', localTables);
            }
          }
        } catch {}
      }

      setOrders(localOrders);
      setActiveTables(localTables);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, [debouncedSyncTable]);

  useEffect(() => {
    if (!loaded) {
      loadData();
    }
  }, [loaded, loadData]);

  useEffect(() => {
    if (!loaded) return;
    const pull = setInterval(() => {
      if (syncManager.isOnline) {
        loadData();
      }
    }, 15000);
    return () => clearInterval(pull);
  }, [loaded, loadData]);

  useEffect(() => {
    if (!loaded) return;

    const eventSource = new EventSource(`${getApiBase()}/events`);

    eventSource.addEventListener('order:created', (e) => {
      try {
        const newOrder = JSON.parse(e.data);
        setOrders(prev => {
          if (prev.find(o => o.id === newOrder.id)) return prev;
          const next = [newOrder, ...prev];
          setData('orders', next);
          return next;
        });
      } catch {}
    });

    eventSource.addEventListener('order:updated', (e) => {
      try {
        const updated = JSON.parse(e.data);
        setOrders(prev => {
          const next = prev.map(o => o.id === updated.id ? updated : o);
          setData('orders', next);
          return next;
        });
      } catch {}
    });

    eventSource.addEventListener('table:updated', () => {
      syncManager.fetchFromAPI('/tables/state').then(data => {
        if (!data) return;
        setActiveTables(prev => {
          const merged = { ...prev };
          Object.entries(data).forEach(([tid, entry]) => {
            if (clearedTablesRef.current.has(tid)) return;
            if (!entry || !Array.isArray(entry.items)) return;
            const localVer = prev[tid]?.version || 0;
            const serverVer = entry.version || 0;
            if (serverVer > localVer) {
              merged[tid] = entry;
            }
          });
          setData('activeTables', merged);
          return merged;
        });
      }).catch(() => {});
    });

    eventSource.addEventListener('table:cleared', () => {
      syncManager.fetchFromAPI('/tables/state').then(data => {
        if (!data) return;
        setActiveTables(prev => {
          const merged = { ...prev };
          Object.entries(data).forEach(([tid, entry]) => {
            if (!entry || !entry.items || entry.items.length === 0) {
              delete merged[tid];
            } else if (Array.isArray(entry.items)) {
              merged[tid] = entry;
            }
          });
          Object.keys(prev).forEach(k => {
            if (!data[k]) delete merged[k];
          });
          setData('activeTables', merged);
          return merged;
        });
      }).catch(() => {});
    });

    eventSource.addEventListener('table:conflict', (e) => {
      try {
        const { tableId, serverData, serverVersion } = JSON.parse(e.data);
        setActiveTables(prev => {
          const localItems = prev[tableId]?.items || [];
          const merged = [...serverData];
          localItems.forEach(local => {
            if (!merged.find(m => m.product?.id === local.product?.id)) {
              merged.push(local);
            }
          });
          const newEntry = { items: merged, version: serverVersion };
          const newTables = { ...prev, [tableId]: newEntry };
          setData('activeTables', newTables);
          return newTables;
        });
      } catch {}
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [loaded]);

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

    setOrders((prev) => {
      const next = [newOrder, ...prev];
      setData('orders', next);
      return next;
    });

    const originalItems = order.items || [];
    const transformedItems = originalItems.map(item => ({
      productId: item.product?.id || item.productId,
      quantity: item.quantity,
      unitPrice: item.product?.price || item.unitPrice || 0,
      totalPrice: (item.product?.price || item.unitPrice || 0) * item.quantity,
      notes: item.notes || null,
    }));

    const orderDataForServer = {
      tableId: order.tableId,
      orderType: order.orderType,
      items: transformedItems,
      exchangeRate: order.exchangeRateSnapshot || order.exchangeRate || 4000,
      discountValue: order.discountValue || 0,
      discountPercent: order.discountPercent || 0,
      payment: order.payment,
    };

    if (syncManager.isOnline) {
      try {
        const created = await apiPost('/orders', orderDataForServer);

        if (created && !created.offline && created.id) {
          setOrders((prev) => {
            const rest = prev.filter((o) => o.id !== newOrder.id);
            const next = [created, ...rest];
            setData('orders', next);
            return next;
          });

          if (order.tableId) {
            setActiveTables(prevTables => {
              const newTables = { ...prevTables };
              delete newTables[order.tableId];
              setData('activeTables', newTables);
              return newTables;
            });
            syncManager
              .fetchFromAPI(`/tables/state/${encodeURIComponent(order.tableId)}`, { method: 'DELETE' })
              .catch(() => {});
          }
        } else {
          throw new Error('Server did not return valid order');
        }
      } catch {
        await syncManager.addToQueue({
          type: 'CREATE',
          endpoint: '/orders',
          data: orderDataForServer,
        });
      }
    } else {
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
      setData('orders', next);
      return next;
    });

    if (syncManager.isOnline) {
      try {
        await syncManager.fetchFromAPI(`/orders/${orderId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
      } catch {
        await syncManager.addToQueue({
          type: 'UPDATE',
          endpoint: `/orders/${orderId}/status`,
          data: { status },
        });
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
      const currentItems = prevTables[idMesa]?.items || [];
      const currentVersion = prevTables[idMesa]?.version || 0;
      const existingProductIndex = currentItems.findIndex(item => item.product?.id === platillo.id);

      let newItems;
      if (existingProductIndex > -1) {
        newItems = currentItems.map((item, index) =>
          index === existingProductIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...currentItems, { product: platillo, quantity: 1 }];
      }

      const newEntry = { items: newItems, version: currentVersion };
      const newTables = { ...prevTables, [idMesa]: newEntry };
      setData('activeTables', newTables);

      return newTables;
    });
    debouncedSyncTable(idMesa);
  };

  const actualizarCantidad = (idMesa, idPlatillo, cantidad) => {
    let willBeEmpty = false;
    setActiveTables(prevTables => {
      const currentItems = prevTables[idMesa]?.items || [];
      const currentVersion = prevTables[idMesa]?.version || 0;
      let newItems;

      if (cantidad <= 0) {
        newItems = currentItems.filter(item => item.product?.id !== idPlatillo);
      } else {
        newItems = currentItems.map(item =>
          item.product?.id === idPlatillo
            ? { ...item, quantity: cantidad }
            : item
        );
      }

      willBeEmpty = newItems.length === 0;
      const newEntry = { items: newItems, version: currentVersion };
      const newTables = { ...prevTables, [idMesa]: newEntry };
      setData('activeTables', newTables);

      return newTables;
    });

    if (willBeEmpty) {
      setTimeout(() => {
        syncManager.fetchFromAPI(`/tables/state/${idMesa}`, { method: 'DELETE' }).catch(() => {});
      }, 0);
    } else {
      debouncedSyncTable(idMesa);
    }
  };

  const eliminarPlatilloDeMesa = (idMesa, idPlatillo) => {
    actualizarCantidad(idMesa, idPlatillo, 0);
  };

  const limpiarMesa = (idMesa) => {
    clearedTablesRef.current.add(idMesa);

    setActiveTables(prevTables => {
      const newTables = { ...prevTables };
      delete newTables[idMesa];
      setData('activeTables', newTables);
      return newTables;
    });

    setTimeout(() => {
      clearedTablesRef.current.delete(idMesa);
    }, 15000);

    syncManager.fetchFromAPI(`/tables/state/${idMesa}`, { method: 'DELETE' }).catch(() => {});
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
