/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getData, setData } from '../lib/api.js';

const FinanceContext = createContext();

const defaultLastClosure = new Date(0).toISOString();

export function FinanceProvider({ children }) {
    const [expenses, setExpenses] = useState(() => {
        try {
            const saved = localStorage.getItem('expenses');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [closures, setClosures] = useState(() => {
        try {
            const saved = localStorage.getItem('closures');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [lastClosureDate, setLastClosureDate] = useState(() => {
        return localStorage.getItem('lastClosureDate') || defaultLastClosure;
    });
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        Promise.all([
            getData('expenses'),
            getData('closures'),
            getData('lastClosureDate'),
        ]).then(([expensesData, closuresData, lastDate]) => {
            setExpenses(Array.isArray(expensesData) ? expensesData : []);
            setClosures(Array.isArray(closuresData) ? closuresData : []);
            setLastClosureDate(lastDate ?? defaultLastClosure);
            setLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (!loaded) return;
        setData('expenses', expenses);
    }, [expenses, loaded]);

    useEffect(() => {
        if (!loaded) return;
        setData('closures', closures);
        setData('lastClosureDate', lastClosureDate);
    }, [closures, lastClosureDate, loaded]);

    const addExpense = (expense) => {
        const newExpense = {
            ...expense,
            id: crypto.randomUUID(),
            date: new Date().toISOString()
        };
        setExpenses([newExpense, ...expenses]);
    };

    const deleteExpense = (id) => {
        setExpenses(expenses.filter(e => e.id !== id));
    };

    const closeDay = (summary) => {
        const newClosure = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            ...summary
        };
        setClosures([newClosure, ...closures]);
        setLastClosureDate(new Date().toISOString());
    };

    const value = {
        expenses,
        addExpense,
        deleteExpense,
        closures,
        lastClosureDate,
        closeDay
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
