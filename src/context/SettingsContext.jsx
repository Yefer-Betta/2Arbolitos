import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    // Exchange Rate State
    const [exchangeRate, setExchangeRate] = useState(() => {
        const saved = localStorage.getItem('exchangeRate');
        return saved ? parseFloat(saved) : 4000; // Default fallback
    });

    // Business Info State
    const [business, setBusiness] = useState(() => {
        const saved = localStorage.getItem('business');
        return saved ? JSON.parse(saved) : {
            name: '2Arbolitos',
            nit: '',
            address: '',
            phone: '',
            message: '¡Gracias por su compra!',
            logo: '',
            invoiceLogo: ''
        };
    });

    // Persistence
    useEffect(() => {
        localStorage.setItem('exchangeRate', exchangeRate.toString());
    }, [exchangeRate]);

    useEffect(() => {
        localStorage.setItem('business', JSON.stringify(business));
    }, [business]);

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
