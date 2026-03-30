/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiGet, syncManager } from '../lib/api.js';

const UserContext = createContext();

export function UserProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = sessionStorage.getItem('currentUser');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            return JSON.parse(storedUser);
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (token && syncManager.isOnline) {
            try {
                const data = await apiGet('/auth/verify');
                if (data.user) {
                    setCurrentUser(data.user);
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                }
            } catch (e) {
                console.warn('Token invalid or expired');
                logout();
            }
        }
        setIsLoading(false);
    };

    const login = async (username, password) => {
        if (syncManager.isOnline) {
            try {
                const response = await syncManager.fetchFromAPI('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password }),
                });

                if (response.token && response.user) {
                    localStorage.setItem('token', response.token);
                    setCurrentUser(response.user);
                    sessionStorage.setItem('currentUser', JSON.stringify(response.user));
                    return { success: true, user: response.user };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            return { success: false, error: 'No hay conexión. El login requiere internet.' };
        }
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    };

    const value = {
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isLoading,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
