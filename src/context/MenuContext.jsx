/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getData, setData } from '../lib/api.js';

const MenuContext = createContext();

export function MenuProvider({ children }) {
    const [products, setProducts] = useState(() => {
        try {
            const saved = localStorage.getItem('products');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getData('products').then((data) => {
            setProducts(Array.isArray(data) ? data : []);
            setLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (!loaded) return;
        setData('products', products);
    }, [products, loaded]);

    const addProduct = (product) => {
        const newProduct = { ...product, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        const nextProducts = [...products, newProduct];
        setProducts(nextProducts);
        setData('products', nextProducts);
    };

    const updateProduct = (id, updatedData) => {
        const nextProducts = products.map(p => p.id === id ? { ...p, ...updatedData } : p);
        setProducts(nextProducts);
        setData('products', nextProducts);
    };

    const deleteProduct = (id) => {
        const nextProducts = products.filter(p => p.id !== id);
        setProducts(nextProducts);
        setData('products', nextProducts);
    };

    const value = {
        products,
        addProduct,
        updateProduct,
        deleteProduct,
    };

    return (
        <MenuContext.Provider value={value}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    const context = useContext(MenuContext);
    if (context === undefined) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
}
