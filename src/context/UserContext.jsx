/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { getData, setData } from '../lib/api.js';

const INITIAL_USERS = [
    { id: 1, username: 'admin', password: '123', role: 'admin', name: 'Administrador' },
    { id: 2, username: 'mesero', password: '123', role: 'waiter', name: 'Mesero Principal' },
    { id: 3, username: 'cocina', password: '123', role: 'cook', name: 'Jefe de Cocina' },
];

const UserContext = createContext();

export function UserProvider({ children }) {
    const [users, setUsers] = useState(() => {
        try {
            const storedUsers = localStorage.getItem('users');
            return storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS;
        } catch {
            return INITIAL_USERS;
        }
    });
    const [loaded, setLoaded] = useState(false);

    const [currentUser, setCurrentUser] = useState(() => {
        const storedUser = sessionStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    useEffect(() => {
        getData('users').then((data) => {
            if (Array.isArray(data) && data.length > 0) {
                const mergedUsers = data.map(serverUser => {
                    const localUser = INITIAL_USERS.find(u => u.username === serverUser.username);
                    return {
                        ...serverUser,
                        password: serverUser.password || localUser?.password || '123'
                    };
                });
                setUsers(mergedUsers);
            } else {
                setUsers(INITIAL_USERS);
            }
            setLoaded(true);
        });
    }, []);

    const login = (username, password) => {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            const userToStore = { username: user.username, role: user.role, name: user.name };
            setCurrentUser(userToStore);
            sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    };

    const addUser = (user) => {
        setUsers(prevUsers => [...prevUsers, { ...user, id: Date.now() }]);
    };

    const updateUser = (id, updatedUser) => {
        setUsers(prevUsers => prevUsers.map(u => (u.id === id ? { ...u, ...updatedUser } : u)));
    };

    const deleteUser = (id) => {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== id));
    };

    useEffect(() => {
        if (!loaded) return;
        setData('users', users);
    }, [users, loaded]);

    const value = {
        currentUser,
        users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        isAuthenticated: !!currentUser,
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