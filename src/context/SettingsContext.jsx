/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getData, setData } from '../lib/api.js';

const DEFAULT_BUSINESS = {
    name: '2Arbolitos',
    nit: '',
    address: '',
    phone: '',
    message: '¡Gracias por su compra!',
    logo: '',
    invoiceLogo: ''
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    const [exchangeRate, setExchangeRate] = useState(() => {
        const saved = localStorage.getItem('exchangeRate');
        return saved ? parseFloat(saved) : 4000;
    });
    const [business, setBusiness] = useState(() => {
        try {
            const saved = localStorage.getItem('business');
            return saved ? JSON.parse(saved) : DEFAULT_BUSINESS;
        } catch {
            return DEFAULT_BUSINESS;
        }
    });
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        Promise.all([getData('exchangeRate'), getData('business')]).then(([rate, biz]) => {
            if (typeof rate === 'number' && !Number.isNaN(rate)) setExchangeRate(rate);
            if (biz && typeof biz === 'object') setBusiness({ ...DEFAULT_BUSINESS, ...biz });
            setLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (!loaded) return;
        setData('exchangeRate', exchangeRate);
    }, [exchangeRate, loaded]);

    useEffect(() => {
        if (!loaded) return;
        setData('business', business);
    }, [business, loaded]);

    const value = {
        exchangeRate,
        setExchangeRate,
        business,
        setBusiness
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
