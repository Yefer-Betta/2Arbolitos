/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiGet, apiPost, setData, getData, syncManager } from '../lib/api.js';

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

    useEffect(() => {
        checkAuth();
        loadUsers();
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

    const loadUsers = async () => {
        try {
            let localUsers = await getData('users');
            localUsers = Array.isArray(localUsers) ? localUsers : [];

            if (syncManager.isOnline) {
                try {
                    const token = localStorage.getItem('token');
                    if (token) {
                        const serverUsers = await syncManager.fetchFromAPI('/auth/users');
                        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
                            localUsers = serverUsers;
                            await setData('users', serverUsers);
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch users from server:', e);
                }
            }

            setUsers(localUsers);
        } catch (error) {
            console.error('Error loading users:', error);
        }
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

    const addUser = async (userData) => {
        try {
            if (syncManager.isOnline) {
                const token = localStorage.getItem('token');
                if (token) {
                    const newUser = await syncManager.fetchFromAPI('/auth/register', {
                        method: 'POST',
                        body: JSON.stringify(userData),
                    });
                    setUsers(prev => [...prev, newUser]);
                    await setData('users', [...users, newUser]);
                    return { success: true };
                }
            }
            return { success: false, error: 'No hay conexión o token' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const updateUser = async (id, userData) => {
        try {
            if (syncManager.isOnline) {
                const token = localStorage.getItem('token');
                if (token) {
                    const updatedUser = await syncManager.fetchFromAPI(`/auth/users/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(userData),
                    });
                    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedUser } : u));
                    await setData('users', users.map(u => u.id === id ? { ...u, ...updatedUser } : u));
                    return { success: true };
                }
            }
            return { success: false, error: 'No hay conexión o token' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const deleteUser = async (id) => {
        try {
            if (syncManager.isOnline) {
                const token = localStorage.getItem('token');
                if (token) {
                    await syncManager.fetchFromAPI(`/auth/users/${id}`, {
                        method: 'DELETE',
                    });
                    setUsers(prev => prev.filter(u => u.id !== id));
                    await setData('users', users.filter(u => u.id !== id));
                    return { success: true };
                }
            }
            return { success: false, error: 'No hay conexión o token' };
        } catch (error) {
            return { success: false, error: error.message };
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
