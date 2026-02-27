import React, { createContext, useContext, useState, useEffect } from 'react';

const MenuContext = createContext();

export function MenuProvider({ children }) {
    const [products, setProducts] = useState(() => {
        const saved = localStorage.getItem('products');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('products', JSON.stringify(products));
    }, [products]);

    const addProduct = (product) => {
        const newProduct = { ...product, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        setProducts([...products, newProduct]);
    };

    const updateProduct = (id, updatedData) => {
        setProducts(products.map(p => p.id === id ? { ...p, ...updatedData } : p));
    };

    const deleteProduct = (id) => {
        setProducts(products.filter(p => p.id !== id));
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
