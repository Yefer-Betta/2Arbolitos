/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGet, apiPost, setData, getData, syncManager } from '../lib/api.js';

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
    const [exchangeRate, setExchangeRate] = useState(4000);
    const [business, setBusiness] = useState(DEFAULT_BUSINESS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        loadSettings();
        
        const syncInterval = setInterval(() => {
            if (syncManager.isOnline) {
                loadSettings();
            }
        }, 3000);
        
        const unsubscribe = syncManager.addListener((event, data) => {
            if (event === 'syncComplete' || event === 'timestamp') {
                loadSettings();
            }
        });
        
        return () => {
            clearInterval(syncInterval);
            unsubscribe();
        };
    }, []);

    const loadSettings = async () => {
        try {
            let localRate = await getData('exchangeRate');
            let localBusiness = await getData('business');

            if (syncManager.isOnline) {
                try {
                    const serverSettings = await apiGet('/settings');
                    
                    if (serverSettings?.exchangeRate) {
                        const localTimestamp = typeof localRate === 'object' ? localRate._syncTimestamp : null;
                        const serverTimestamp = serverSettings._syncTimestamp;
                        
                        if (!localTimestamp || (serverTimestamp && serverTimestamp > localTimestamp)) {
                            localRate = serverSettings.exchangeRate;
                            await setData('exchangeRate', {
                                value: serverSettings.exchangeRate,
                                _syncTimestamp: serverTimestamp
                            });
                        } else {
                            localRate = typeof localRate === 'object' ? localRate.value : localRate;
                        }
                    }
                    
                    if (serverSettings?.business) {
                        const localTimestamp = localBusiness?._syncTimestamp;
                        const serverTimestamp = serverSettings._syncTimestamp;
                        
                        if (!localTimestamp || (serverTimestamp && serverTimestamp > localTimestamp)) {
                            localBusiness = { ...DEFAULT_BUSINESS, ...serverSettings.business };
                            await setData('business', {
                                ...localBusiness,
                                _syncTimestamp: serverTimestamp
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch settings from server:', e);
                }
            }

            if (typeof localRate === 'number' && !Number.isNaN(localRate)) {
                setExchangeRate(localRate);
            } else if (typeof localRate === 'object' && localRate?.value) {
                setExchangeRate(localRate.value);
            }
            
            if (localBusiness && typeof localBusiness === 'object') {
                const { _syncTimestamp, ...businessData } = localBusiness;
                setBusiness({ ...DEFAULT_BUSINESS, ...businessData });
            }
            
            setLoaded(true);
        } catch (error) {
            console.error('Error loading settings:', error);
            setLoaded(true);
        }
    };

    const updateExchangeRate = async (newRate) => {
        setExchangeRate(newRate);
        localStorage.setItem('exchangeRate', String(newRate));
        await setData('exchangeRate', newRate);

        if (syncManager.isOnline) {
            try {
                await apiPost('/settings', {
                    key: 'exchangeRate',
                    value: newRate,
                    type: 'number',
                });
            } catch (e) {
                console.warn('Settings saved locally');
            }
        }
    };

    const updateBusiness = async (newBusiness) => {
        const updatedBusiness = { ...business, ...newBusiness };
        setBusiness(updatedBusiness);
        localStorage.setItem('business', JSON.stringify(updatedBusiness));
        await setData('business', updatedBusiness);

        if (syncManager.isOnline) {
            try {
                await apiPost('/settings', {
                    key: 'business',
                    value: updatedBusiness,
                    type: 'object',
                });
            } catch (e) {
                console.warn('Settings saved locally');
            }
        }
    };

    const value = {
        exchangeRate,
        setExchangeRate: updateExchangeRate,
        business,
        setBusiness: updateBusiness,
        loaded,
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
