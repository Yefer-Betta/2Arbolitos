/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, setData, getData, syncManager } from '../lib/api.js';

const UserContext = createContext();

export function UserProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch {
                return null;
            }
        }
        return null;
    });
    const [users, setUsers] = useState([]);
    const [inactiveUsers, setInactiveUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const logout = async () => {
        try {
            await apiPost('/attendance/check-out', {});
        } catch {
            // ignore
        }
        try {
            await syncManager.fetchFromAPI('/auth/logout', { method: 'POST' });
        } catch {
            // ignore
        }
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    };

    const checkAuth = useCallback(async () => {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser && syncManager.isOnline) {
            try {
                const data = await apiGet('/auth/verify');
                if (data.user) {
                    setCurrentUser(data.user);
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                }
            } catch {
                console.warn('Sesión inválida o expirada');
                logout();
            }
        }
        setIsLoading(false);
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            const data = await apiGet('/auth/users');
            const activeUsers = Array.isArray(data) ? data.filter(u => u.active !== false) : [];
            if (Array.isArray(data)) {
                setUsers(activeUsers);
                await setData('users', activeUsers);
            } else {
                const local = await getData('users');
                setUsers(Array.isArray(local) ? local.filter(u => u.active !== false) : []);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }, []);

    const loadInactiveUsers = useCallback(async () => {
        try {
            const data = await apiGet('/auth/users?includeInactive=true');
            if (Array.isArray(data)) {
                setInactiveUsers(data.filter(u => u.active === false));
            }
        } catch (error) {
            console.error('Error loading inactive users:', error);
        }
    }, []);

    useEffect(() => {
        checkAuth();
        loadUsers();

        const syncInterval = setInterval(() => {
            if (syncManager.isOnline) {
                loadUsers();
            }
        }, 10000);

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

                if (response.user) {
                    setCurrentUser(response.user);
                    sessionStorage.setItem('currentUser', JSON.stringify(response.user));
                    try {
                        await apiPost('/attendance/check-in', {});
                    } catch {
                        // ignore
                    }
                    return { success: true, user: response.user };
                }

                return { success: false, error: 'Respuesta inválida del servidor' };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            return { success: false, error: 'No hay conexión. El login requiere internet.' };
        }
    };

    const addUser = async (userData) => {
        try {
            if (syncManager.isOnline) {
                const newUser = await apiPost('/auth/register', userData);
                setUsers(prev => [...prev, newUser]);
                return { success: true };
            }
            return { success: false, error: 'No hay conexión' };
        } catch {
            return { success: false, error: 'Error de conexión' };
        }
    };

    const updateUser = async (id, userData) => {
        try {
            if (syncManager.isOnline) {
                const updatedUser = await apiPut(`/auth/users/${id}`, userData);
                if (updatedUser?.active === false) {
                    setUsers(prev => prev.filter(u => u.id !== id));
                } else {
                    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedUser } : u));
                }
                return { success: true };
            }
            return { success: false, error: 'No hay conexión' };
        } catch {
            return { success: false, error: 'Error de conexión' };
        }
    };

    const reactivateUser = async (id) => {
        const result = await updateUser(id, { active: true });
        if (result.success) {
            setInactiveUsers(prev => prev.filter(u => u.id !== id));
            await loadUsers();
        }
        return result;
    };

    const deleteUser = async (id) => {
        try {
            if (syncManager.isOnline) {
                await apiDelete('/auth/users', id);
                setUsers(prev => prev.filter(u => u.id !== id));
                setInactiveUsers(prev => prev.filter(u => u.id !== id));
                return { success: true };
            }
            return { success: false, error: 'No hay conexión' };
        } catch {
            return { success: false, error: 'Error de conexión' };
        }
    };

    const value = {
        currentUser,
        users,
        inactiveUsers,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        loadInactiveUsers,
        reactivateUser,
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
