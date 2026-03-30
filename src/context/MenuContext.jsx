/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGet, apiPost, setData, getData, syncManager } from '../lib/api.js';

const MenuContext = createContext();

export function MenuProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            let localProducts = await getData('products');
            let localCategories = await getData('categories');

            localProducts = Array.isArray(localProducts) ? localProducts : [];
            localCategories = Array.isArray(localCategories) ? localCategories : [];

            if (syncManager.isOnline) {
                try {
                    const [serverProducts, serverCategories] = await Promise.all([
                        apiGet('/products?active=true'),
                        apiGet('/categories?active=true'),
                    ]);

                    if (Array.isArray(serverProducts) && serverProducts.length > 0) {
                        localProducts = serverProducts.map(p => ({
                            ...p,
                            category: p.category?.name || p.categoryId || ''
                        }));
                        await setData('products', localProducts);
                    }
                    if (Array.isArray(serverCategories) && serverCategories.length > 0) {
                        localCategories = serverCategories;
                        await setData('categories', serverCategories);
                    }
                } catch (e) {
                    console.warn('Could not fetch menu from server:', e);
                }
            }

            setProducts(localProducts);
            setCategories(localCategories);
            setLoaded(true);
        } catch (error) {
            console.error('Error loading menu data:', error);
            setLoaded(true);
        }
    };

    const addProduct = async (product) => {
        const newProduct = { 
            ...product, 
            id: crypto.randomUUID(), 
            createdAt: new Date().toISOString() 
        };
        
        setProducts(prev => [...prev, newProduct]);
        await setData('products', [...products, newProduct]);

        if (syncManager.isOnline) {
            try {
                await apiPost('/products', product);
            } catch (e) {
                await syncManager.addToQueue({
                    type: 'CREATE',
                    endpoint: '/products',
                    data: newProduct,
                });
            }
        } else {
            await syncManager.addToQueue({
                type: 'CREATE',
                endpoint: '/products',
                data: newProduct,
            });
        }
    };

    const updateProduct = async (id, updatedData) => {
        const nextProducts = products.map(p => p.id === id ? { ...p, ...updatedData } : p);
        setProducts(nextProducts);
        await setData('products', nextProducts);

        if (syncManager.isOnline) {
            try {
                await apiPost(`/products/${id}`, updatedData);
            } catch (e) {
                await syncManager.addToQueue({
                    type: 'UPDATE',
                    endpoint: '/products',
                    data: { id, ...updatedData },
                });
            }
        } else {
            await syncManager.addToQueue({
                type: 'UPDATE',
                endpoint: '/products',
                data: { id, ...updatedData },
            });
        }
    };

    const deleteProduct = async (id) => {
        const nextProducts = products.filter(p => p.id !== id);
        setProducts(nextProducts);
        await setData('products', nextProducts);

        if (syncManager.isOnline) {
            try {
                await apiPost(`/products/${id}`, { active: false });
            } catch (e) {
                await syncManager.addToQueue({
                    type: 'DELETE',
                    endpoint: '/products',
                    data: { id },
                });
            }
        } else {
            await syncManager.addToQueue({
                type: 'DELETE',
                endpoint: '/products',
                data: { id },
            });
        }
    };

    const addCategory = async (category) => {
        const newCategory = { 
            ...category, 
            id: crypto.randomUUID(), 
            createdAt: new Date().toISOString() 
        };
        
        setCategories(prev => [...prev, newCategory]);
        await setData('categories', [...categories, newCategory]);

        if (syncManager.isOnline) {
            try {
                await apiPost('/categories', category);
            } catch (e) {
                await syncManager.addToQueue({
                    type: 'CREATE',
                    endpoint: '/categories',
                    data: newCategory,
                });
            }
        } else {
            await syncManager.addToQueue({
                type: 'CREATE',
                endpoint: '/categories',
                data: newCategory,
            });
        }
    };

    const refreshMenu = async () => {
        await loadData();
    };

    const value = {
        products,
        categories,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        refreshMenu,
        loaded,
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
