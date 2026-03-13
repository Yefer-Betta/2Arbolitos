import React, { createContext, useState, useContext, useEffect } from 'react';

// Simulación de una base de datos de usuarios. En una app real, esto podría ser más seguro.
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
        } catch (error) {
            return INITIAL_USERS;
        }
    });

    const [currentUser, setCurrentUser] = useState(() => {
        // WARNING: Storing user data in sessionStorage is not secure for production.
        // This is for demonstration purposes in a local-only application.
        const storedUser = sessionStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });

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
        localStorage.setItem('users', JSON.stringify(users));
    }, [users]);

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