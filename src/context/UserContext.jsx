/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, setData, getData, syncManager } from '../lib/api.js';

const UserContext = createContext();

export function UserProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = sessionStorage.getItem('currentUser');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            try {
                return JSON.parse(storedUser);
            } catch {
                return null;
            }
        }
        return null;
    });
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token && syncManager.isOnline) {
            try {
                const data = await apiGet('/auth/verify');
                if (data.user) {
                    setCurrentUser(data.user);
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                }
            } catch {
                console.warn('Token invalid or expired');
                logout();
            }
        }
        setIsLoading(false);
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            const data = await apiGet('/auth/users');
            if (data && Array.isArray(data)) {
                setUsers(data);
                await setData('users', data);
            } else {
                const local = await getData('users');
                setUsers(Array.isArray(local) ? local : []);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }, []);

    useEffect(() => {
        checkAuth();
        loadUsers();

        const syncInterval = setInterval(() => {
            if (syncManager.isOnline) {
                loadUsers();
            }
        }, 3000);

        const unsubscribe = syncManager.addListener((event) => {
            if (event === 'syncComplete' || event === 'timestamp') {
                loadUsers();
            }
        });

        return () => {
            clearInterval(syncInterval);
            unsubscribe();
        };
    }, [checkAuth, loadUsers]);

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

    const addUser = async (userData) => {
        try {
            if (syncManager.isOnline) {
                const token = localStorage.getItem('token');
                if (token) {
                    const newUser = await apiPost('/auth/register', userData);
                    setUsers(prev => [...prev, newUser]);
                    return { success: true };
                }
            }
            return { success: false, error: 'No hay conexión o token' };
        } catch {
            return { success: false, error: 'Error de conexión' };
        }
    };

    const updateUser = async (id, userData) => {
        try {
            if (syncManager.isOnline) {
                const token = localStorage.getItem('token');
                if (token) {
                    const updatedUser = await apiPut(`/auth/users/${id}`, userData);
                    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedUser } : u));
                    return { success: true };
                }
            }
            return { success: false, error: 'No hay conexión o token' };
        } catch {
            return { success: false, error: 'Error de conexión' };
        }
    };

    const deleteUser = async (id) => {
        try {
            if (syncManager.isOnline) {
                const token = localStorage.getItem('token');
                if (token) {
                    await apiDelete('/auth/users', id);
                    setUsers(prev => prev.filter(u => u.id !== id));
                    return { success: true };
                }
            }
            return { success: false, error: 'No hay conexión o token' };
        } catch {
            return { success: false, error: 'Error de conexión' };
        }
    };

    const value = {
        currentUser,
        users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
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
