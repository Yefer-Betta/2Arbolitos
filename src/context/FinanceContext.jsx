/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, getData, setData, syncManager } from '../lib/api.js';
import { generateId } from '../lib/utils.js';

const FinanceContext = createContext();

const defaultLastClosure = new Date(0).toISOString();

export function FinanceProvider({ children }) {
    const [expenses, setExpenses] = useState([]);
    const [closures, setClosures] = useState([]);
    const [lastClosureDate, setLastClosureDate] = useState(defaultLastClosure);
    const [loaded, setLoaded] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [expensesData, closuresData, lastDate] = await Promise.all([
                apiGet('/expenses'),
                apiGet('/closures'),
                getData('lastClosureDate'),
            ]);

            const serverClosures = Array.isArray(closuresData) ? closuresData : [];
            const localClosures = await getData('closures') || [];

            const mergedClosures = mergeClosures(localClosures, serverClosures);

            setExpenses(Array.isArray(expensesData) ? expensesData : []);
            setClosures(mergedClosures);
            setLastClosureDate(lastDate || defaultLastClosure);

            setLoaded(true);
        } catch (error) {
            console.error('Error loading finance data:', error);
            const localClosures = await getData('closures') || [];
            setClosures(localClosures);
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        loadData();

        const syncInterval = setInterval(() => {
            if (syncManager.isOnline) {
                loadData();
            }
        }, 3000);

        const unsubscribe = syncManager.addListener((event) => {
            if (event === 'syncComplete' || event === 'timestamp') {
                loadData();
            }
        });

        return () => {
            clearInterval(syncInterval);
            unsubscribe();
        };
    }, [loadData]);

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
            id: generateId(),
            date: new Date().toISOString()
        };
        setExpenses(prev => [newExpense, ...prev]);

        await apiPost('/expenses', newExpense);
    };

    const deleteExpense = (id) => {
        setExpenses(prev => prev.filter(e => e.id !== id));
    };

    const closeDay = async (summary) => {
        const newClosure = {
            id: generateId(),
            date: new Date().toISOString(),
            orderCount: summary.orderCount || 0,
            totalSalesCOP: summary.totalSalesCOP || 0,
            totalSalesUSD: summary.totalSalesUSD || 0,
            totalExpenses: summary.totalExpenses || 0,
            exchangeRate: summary.exchangeRate || 4000,
            salesByMethod: summary.salesByMethod || { cash_cop: 0, cash_usd: 0, nequi: 0, debit: 0 },
            countedCash: summary.countedCash || 0,
            countedUsd: summary.countedUsd || 0,
            countedNequi: summary.countedNequi || 0,
            countedDebit: summary.countedDebit || 0,
            differences: summary.differences || { cash_cop: 0, cash_usd: 0, nequi: 0, debit: 0 },
            totalDifference: summary.totalDifference || 0,
            observations: summary.observations || null,
        };

        setClosures(prev => [newClosure, ...prev]);
        setLastClosureDate(new Date().toISOString());

        if (syncManager.isOnline) {
            try {
                await apiPost('/closures', newClosure);
            } catch (error) {
                console.warn('Closure sync failed, queueing for later:', error);
                await syncManager.addToQueue({
                    type: 'CREATE',
                    endpoint: '/closures',
                    data: newClosure,
                });
            }
        } else {
            await syncManager.addToQueue({
                type: 'CREATE',
                endpoint: '/closures',
                data: newClosure,
            });
        }
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

function mergeClosures(localClosures, serverClosures) {
    const closureMap = new Map();

    localClosures.forEach(closure => {
        closureMap.set(closure.id, closure);
    });

    serverClosures.forEach(closure => {
        if (!closureMap.has(closure.id)) {
            closureMap.set(closure.id, closure);
        }
    });

    return Array.from(closureMap.values()).sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
}