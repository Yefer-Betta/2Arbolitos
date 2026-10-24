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
  const syncTimersRef = useRef(new Map());
  const clearTimersRef = useRef(new Map());

  const cancelTableSync = useCallback((idMesa) => {
    const timer = syncTimersRef.current.get(idMesa);
    if (timer) {
      clearTimeout(timer);
      syncTimersRef.current.delete(idMesa);
    }
  }, []);

  const markTableCleared = useCallback((idMesa) => {
    cancelTableSync(idMesa);
    clearedTablesRef.current.add(idMesa);

    const previous = clearTimersRef.current.get(idMesa);
    if (previous) clearTimeout(previous);

    const timer = setTimeout(() => {
      clearedTablesRef.current.delete(idMesa);
      clearTimersRef.current.delete(idMesa);
    }, 15000);
    clearTimersRef.current.set(idMesa, timer);
  }, [cancelTableSync]);

  const releaseClearedGuard = useCallback((idMesa) => {
    clearedTablesRef.current.delete(idMesa);
    const timer = clearTimersRef.current.get(idMesa);
    if (timer) {
      clearTimeout(timer);
      clearTimersRef.current.delete(idMesa);
    }
  }, []);

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
    cancelTableSync(idMesa);
    const timer = setTimeout(() => {
      syncTimersRef.current.delete(idMesa);
      if (clearedTablesRef.current.has(idMesa)) return;
      syncTableToServer(idMesa);
    }, 300);
    syncTimersRef.current.set(idMesa, timer);
  }, [cancelTableSync]);

  const hasPendingTableSync = (tableId) => (syncManager.pendingChanges || []).some(
    (change) => change.endpoint === '/tables/state' && change.data?.tableId === tableId
  );

  const loadData = useCallback(async () => {
    try {
      const [ordersData, tablesData] = await Promise.all([
        getData('orders'),
        getData('activeTables'),
      ]);

      let localOrders = Array.isArray(ordersData) ? ordersData : [];
      const localTables = (tablesData && typeof tablesData === 'object') ? tablesData : {};

      if (syncManager.isOnline) {
        try {
          const [serverOrders, tableStates] = await Promise.all([
            apiGet('/orders'),
            syncManager.fetchFromAPI('/tables/state').catch(() => null),
          ]);

          if (Array.isArray(serverOrders)) {
            localOrders = serverOrders;
            await setData('orders', serverOrders);
          }

          if (tableStates && typeof tableStates === 'object') {
            // El servidor es la autoridad: reconstruimos el mapa desde cero.
            // Asi una mesa cobrada en otra caja (o en esta) no reaparece ocupada.
            const nextTables = {};

            Object.entries(tableStates).forEach(([tableId, entry]) => {
              if (!entry || !Array.isArray(entry.items) || entry.items.length === 0) return;
              if (clearedTablesRef.current.has(tableId)) return;

              const serverVersion = entry.version || 0;
              const localEntry = localTables[tableId];
              const localVersion = localEntry?.version || 0;

              // Mesa vaciada en este equipo: si el borrado no llego al servidor
              // (sin conexion), se reintenta en vez de mostrar la cuenta otra vez.
              const localCleared = localEntry &&
                Array.isArray(localEntry.items) &&
                localEntry.items.length === 0 &&
                localVersion > serverVersion;

              if (localCleared) {
                markTableCleared(tableId);
                syncManager.fetchFromAPI(`/tables/state/${tableId}`, { method: 'DELETE' }).catch(() => {});
                return;
              }

              const hasLocalChanges = localEntry &&
                Array.isArray(localEntry.items) &&
                localEntry.items.length > 0 &&
                localVersion > serverVersion;

              if (hasLocalChanges) {
                nextTables[tableId] = localEntry;
                debouncedSyncTable(tableId);
              } else {
                nextTables[tableId] = entry;
              }
            });

            // Los domicilios viven solo en el cliente.
            Object.entries(localTables).forEach(([tableId, entry]) => {
              if (nextTables[tableId]) return;
              if (!tableId.startsWith('domicilio-')) return;
              if (entry?.items?.length > 0) nextTables[tableId] = entry;
            });

            // Estados creados sin conexion y aun no subidos: se conservan.
            Object.entries(localTables).forEach(([tableId, entry]) => {
              if (nextTables[tableId]) return;
              if (tableId.startsWith('domicilio-')) return;
              if (clearedTablesRef.current.has(tableId)) return;
              if (entry?.items?.length > 0 && hasPendingTableSync(tableId)) {
                nextTables[tableId] = entry;
                debouncedSyncTable(tableId);
              }
            });

            await setData('activeTables', nextTables);
            setOrders(localOrders);
            setActiveTables(nextTables);
            setLoaded(true);
            return;
          }
        } catch {}
      }

      setOrders(localOrders);
      setActiveTables(localTables);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, [debouncedSyncTable, markTableCleared]);

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

    const eventSource = new EventSource(`${getApiBase()}/events`, { withCredentials: true });

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
    const clientOrderId = generateId();
    const newOrder = {
      ...order,
      id: generateId(),
      clientOrderId,
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
      modifiers: item._modifiers || null,
    }));

    const orderDataForServer = {
      clientOrderId,
      tableId: order.tableId,
      orderType: order.orderType,
      items: transformedItems,
      exchangeRate: order.exchangeRateSnapshot || order.exchangeRate || 4000,
      exchangeRateBsSnapshot: order.exchangeRateBsSnapshot || order.exchangeRateBs || 40,
      discountValue: order.discountValue || 0,
      discountPercent: order.discountPercent || 0,
      payments: order.payments,
      customerId: order.customerId || null,
      deliveryAddress: order.deliveryAddress || null,
      deliveryPhone: order.deliveryPhone || null,
      deliveryCost: order.deliveryCost || 0,
    };

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
          markTableCleared(order.tableId);
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

        return created;
      }
    } catch (error) {
      console.warn('Error al crear pedido:', error);
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

    try {
      await syncManager.fetchFromAPI(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.warn('No se pudo sincronizar el estado del pedido:', error);
    }
  };

  const agregarPlatilloAMesa = (idMesa, platillo) => {
    releaseClearedGuard(idMesa);
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

      const newEntry = { items: newItems, version: currentVersion + 1 };
      const newTables = { ...prevTables, [idMesa]: newEntry };
      setData('activeTables', newTables);

      return newTables;
    });
    debouncedSyncTable(idMesa);
  };

  const actualizarCantidad = (idMesa, idPlatillo, cantidad) => {
    if (cantidad > 0) releaseClearedGuard(idMesa);
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
      // Al vaciar la mesa se sube la version para que el borrado sobreviva a
      // una recarga aunque el DELETE no llegue al servidor.
      const newEntry = { items: newItems, version: currentVersion + 1 };
      const newTables = { ...prevTables, [idMesa]: newEntry };
      setData('activeTables', newTables);

      return newTables;
    });

    if (willBeEmpty) {
      markTableCleared(idMesa);
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

  const crearDomicilio = (direccion, telefono, costoEnvio = 0) => {
    const id = 'domicilio-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    setActiveTables(prevTables => {
      const newEntry = { items: [], version: 0, deliveryAddress: direccion, deliveryPhone: telefono, deliveryCost: costoEnvio };
      const newTables = { ...prevTables, [id]: newEntry };
      setData('activeTables', newTables);
      return newTables;
    });
    return id;
  };

  const limpiarMesa = (idMesa) => {
    markTableCleared(idMesa);

    setActiveTables(prevTables => {
      const newTables = { ...prevTables };
      if (idMesa.startsWith('domicilio-')) {
        delete newTables[idMesa];
      } else {
        // Se guarda una marca vacia con version mayor: si el DELETE no llega
        // (sin conexion), al reconectar se reintenta en vez de resucitar la mesa.
        newTables[idMesa] = { items: [], version: (prevTables[idMesa]?.version || 0) + 1 };
      }
      setData('activeTables', newTables);
      return newTables;
    });

    syncManager.fetchFromAPI(`/tables/state/${idMesa}`, { method: 'DELETE' }).catch(() => {});
  };

  const transferTable = (fromId, toId) => {
    releaseClearedGuard(toId);
    setActiveTables(prevTables => {
      const newTables = { ...prevTables };
      const items = newTables[fromId]?.items || [];
      if (items.length === 0) return newTables;
      const existing = newTables[toId]?.items || [];
      newTables[toId] = { ...newTables[toId], items: [...existing, ...items] };
      delete newTables[fromId];
      setData('activeTables', newTables);
      return newTables;
    });
    markTableCleared(fromId);
    syncManager.fetchFromAPI(`/tables/state/${fromId}`, { method: 'DELETE' }).catch(() => {});
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
    crearDomicilio,
    transferTable,
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
