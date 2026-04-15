/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGet, apiPost, getData, setData, syncManager } from '../lib/api.js';

const FinanceContext = createContext();

const defaultLastClosure = new Date(0).toISOString();

export function FinanceProvider({ children }) {
    const [expenses, setExpenses] = useState([]);
    const [closures, setClosures] = useState([]);
    const [lastClosureDate, setLastClosureDate] = useState(defaultLastClosure);
    const [loaded, setLoaded] = useState(false);

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

    const loadData = async () => {
        try {
            const [expensesData, closuresData, serverOrders, lastDate] = await Promise.all([
                apiGet('/expenses'),
                apiGet('/closures'),
                apiGet('/orders'),
                getData('lastClosureDate'),
            ]);

            setExpenses(Array.isArray(expensesData) ? expensesData : []);
            setClosures(Array.isArray(closuresData) ? closuresData : []);
            setLastClosureDate(lastDate || defaultLastClosure);

            setLoaded(true);
        } catch (error) {
            console.error('Error loading finance data:', error);
            setLoaded(true);
        }
    };

    useEffect(() => {
        if (!loaded) return;
        setData('expenses', expenses);
    }, [expenses, loaded]);

    useEffect(() => {
        if (!loaded) return;
        setData('closures', closures);
        setData('lastClosureDate', lastClosureDate);
    }, [closures, lastClosureDate, loaded]);

    const addExpense = async (expense) => {
        const newExpense = {
            ...expense,
            id: crypto.randomUUID(),
            date: new Date().toISOString()
        };
        setExpenses(prev => [newExpense, ...prev]);
        
        await apiPost('/expenses', newExpense);
    };

    const deleteExpense = (id) => {
        setExpenses(prev => prev.filter(e => e.id !== id));
    };

    const closeDay = (summary) => {
        const newClosure = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            ...summary
        };
        setClosures(prev => [newClosure, ...prev]);
        setLastClosureDate(new Date().toISOString());
    };

    const value = {
        expenses,
        addExpense,
        deleteExpense,
        closures,
        lastClosureDate,
        closeDay,
        loaded,
    };

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
}

export function useFinance() {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
}
