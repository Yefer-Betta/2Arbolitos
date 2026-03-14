/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const FinanceContext = createContext();

export function FinanceProvider({ children }) {
    const [expenses, setExpenses] = useState(() => {
        const saved = localStorage.getItem('expenses');
        return saved ? JSON.parse(saved) : [];
    });

    const [closures, setClosures] = useState(() => {
        const saved = localStorage.getItem('closures');
        return saved ? JSON.parse(saved) : [];
    });

    const [lastClosureDate, setLastClosureDate] = useState(() => {
        return localStorage.getItem('lastClosureDate') || new Date(0).toISOString(); // Default to epoch if new
    });

    useEffect(() => {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    }, [expenses]);

    useEffect(() => {
        localStorage.setItem('closures', JSON.stringify(closures));
        localStorage.setItem('lastClosureDate', lastClosureDate);
    }, [closures, lastClosureDate]);

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
