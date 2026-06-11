/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    const [exchangeRateBs, setExchangeRateBs] = useState(40);
    const [business, setBusiness] = useState(DEFAULT_BUSINESS);
    const [autoStart, setAutoStart] = useState(false);
    const [backupHour, setBackupHour] = useState(2);
    const [serverUrl, setServerUrl] = useState('');
    const [loaded, setLoaded] = useState(false);

    const loadSettings = useCallback(async () => {
        try {
            let localRate = await getData('exchangeRate');
            let localBusiness = await getData('business');

if (syncManager.isOnline) {
                try {
                    console.log('Fetching settings from server...');
                    const serverSettings = await apiGet('/settings');
                    console.log('Settings received:', serverSettings);
                    
                    const exchangeRate = serverSettings?.exchangeRate;
                    const business = serverSettings?.business;
                    
                    const exchangeRateBs = serverSettings?.exchangeRateBs;
                    
                    if (exchangeRateBs !== undefined) {
                        const newRateBs = typeof exchangeRateBs === 'number' ? exchangeRateBs : (exchangeRateBs?.value || exchangeRateBs);
                        setExchangeRateBs(newRateBs);
                        await setData('exchangeRateBs', {
                            value: newRateBs,
                            _syncTimestamp: new Date().toISOString()
                        });
                    }

                    if (exchangeRate !== undefined) {
                        const newRate = typeof exchangeRate === 'number' ? exchangeRate : (exchangeRate?.value || exchangeRate);
                        localRate = newRate;
                        await setData('exchangeRate', {
                            value: newRate,
                            _syncTimestamp: new Date().toISOString()
                        });
                    }
                    
                    if (business) {
                        localBusiness = { ...DEFAULT_BUSINESS, ...business };
                        await setData('business', {
                            ...localBusiness,
                            _syncTimestamp: new Date().toISOString()
                        });
                    }
                    if (serverSettings?.autoStart !== undefined) {
                        setAutoStart(serverSettings.autoStart);
                    }
                    if (serverSettings?.backupHour !== undefined) {
                        const val = typeof serverSettings.backupHour === 'number' ? serverSettings.backupHour : (serverSettings.backupHour?.value || 2);
                        setBackupHour(Number(val));
                    }
                } catch (err) {
                    console.error('Error fetching settings:', err);
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
            
            setServerUrl(window.location.origin.replace(':5173', ':3002'));
            setLoaded(true);
        } catch (error) {
            console.error('Error loading settings:', error);
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        
        const syncInterval = setInterval(() => {
            if (syncManager.isOnline) {
                loadSettings();
            }
        }, 3000);
        
        const unsubscribe = syncManager.addListener((event) => {
            if (event === 'syncComplete' || event === 'timestamp') {
                loadSettings();
            }
        });
        
        return () => {
            clearInterval(syncInterval);
            unsubscribe();
        };
    }, [loadSettings]);

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
            } catch {
                console.warn('Settings saved locally');
            }
        }
    };

    const updateExchangeRateBs = async (newRate) => {
        setExchangeRateBs(newRate);
        localStorage.setItem('exchangeRateBs', String(newRate));
        await setData('exchangeRateBs', newRate);

        if (syncManager.isOnline) {
            try {
                await apiPost('/settings', {
                    key: 'exchangeRateBs',
                    value: newRate,
                    type: 'number',
                });
            } catch {
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
            } catch {
                console.warn('Settings saved locally');
            }
        }
    };

    const toggleAutoStart = async () => {
        const newState = !autoStart;
        setAutoStart(newState);
        if (syncManager.isOnline) {
            try {
                const res = await apiPost('/settings/auto-start', { enabled: newState });
                if (res.warning) {
                    console.warn(res.warning);
                }
            } catch {
                setAutoStart(!newState);
                console.error('Error al cambiar auto-inicio');
            }
        }
    };

    const updateBackupHour = async (hour) => {
        setBackupHour(hour);
        if (syncManager.isOnline) {
            try {
                await apiPost('/settings', { key: 'backupHour', value: String(hour), type: 'number' });
            } catch {
                console.warn('Backup hour saved locally');
            }
        }
    };

    const value = {
        exchangeRate,
        setExchangeRate: updateExchangeRate,
        exchangeRateBs,
        setExchangeRateBs: updateExchangeRateBs,
        business,
        setBusiness: updateBusiness,
        autoStart,
        toggleAutoStart,
        backupHour,
        updateBackupHour,
        serverUrl,
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
