/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getData, setData, syncManager } from '../lib/api.js';

const FinanceContext = createContext();

const defaultLastClosure = new Date(0).toISOString();

export function FinanceProvider({ children }) {
    const [expenses, setExpenses] = useState([]);
    const [closures, setClosures] = useState([]);
    const [lastClosureDate, setLastClosureDate] = useState(defaultLastClosure);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [expensesData, closuresData, lastDate, localOrders] = await Promise.all([
                getData('expenses'),
                getData('closures'),
                getData('lastClosureDate'),
                getData('orders'),
            ]);

            setExpenses(Array.isArray(expensesData) ? expensesData : []);
            setClosures(Array.isArray(closuresData) ? closuresData : []);
            setLastClosureDate(lastDate || defaultLastClosure);

            if (syncManager.isOnline) {
                try {
                    const serverOrders = await syncManager.fetchFromAPI('/orders');
                    if (Array.isArray(serverOrders) && serverOrders.length > 0) {
                        await setData('orders', serverOrders);
                    }
                } catch (e) {
                    console.warn('Could not fetch orders from server:', e);
                }
            }

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

        await syncManager.addToQueue({
            type: 'CREATE',
            endpoint: '/expenses',
            data: newExpense,
        });
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
