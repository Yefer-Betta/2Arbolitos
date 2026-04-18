/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, setData, getData, syncManager } from '../lib/api.js';
import { generateId } from '../lib/utils.js';

const MenuContext = createContext();

export function MenuProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const loadData = useCallback(async () => {
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
                            category: p.category?.name || p.categoryId || '',
                            categoryId: p.categoryId || ''
                        }));
                        await setData('products', localProducts);
                    }
                    if (Array.isArray(serverCategories) && serverCategories.length > 0) {
                        localCategories = serverCategories;
                        await setData('categories', localCategories);
                    }
                } catch {
                    console.warn('Could not fetch menu from server');
                }
            }

            setProducts(localProducts);
            setCategories(localCategories);
            setLoaded(true);
        } catch (error) {
            console.error('Error loading menu data:', error);
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        loadData();
        
        const syncInterval = setInterval(() => {
            if (syncManager.isOnline) {
                loadData();
            }
        }, 3000);
        
        const unsubscribe = syncManager.addListener((event) => {
            if (event === 'syncComplete' || event === 'timestamp') {
                loadData();
            }
        });
        
        return () => {
            clearInterval(syncInterval);
            unsubscribe();
        };
    }, [loadData]);

    const addProduct = async (product) => {
        const categoryId = product.categoryId || product.category;
        
        const newProduct = { 
            ...product,
            categoryId,
            id: generateId(), 
            createdAt: new Date().toISOString() 
        };
        
        setProducts((prev) => {
            const next = [...prev, newProduct];
            void setData('products', next);
            return next;
        });

        const productForServer = {
            name: newProduct.name,
            categoryId: newProduct.categoryId,
            price: newProduct.price,
            isUsd: newProduct.isUsd || false,
            imageUrl: newProduct.imageUrl || null,
            description: newProduct.description || null,
        };

        if (syncManager.isOnline) {
            try {
                await apiPost('/products', productForServer);
            } catch {
                await syncManager.addToQueue({
                    type: 'CREATE',
                    endpoint: '/products',
                    data: productForServer,
                });
            }
        } else {
            await syncManager.addToQueue({
                type: 'CREATE',
                endpoint: '/products',
                data: productForServer,
            });
        }
    };

    const updateProduct = async (id, updatedData) => {
        const categoryId = updatedData.categoryId || updatedData.category;
        
        const cleanData = {
            name: updatedData.name,
            categoryId: categoryId,
            price: updatedData.price,
            isUsd: updatedData.isUsd || false,
            imageUrl: updatedData.imageUrl || null,
            description: updatedData.description || null,
        };
        
        setProducts((prev) => {
            const nextProducts = prev.map((p) =>
                p.id === id ? { ...p, ...updatedData, categoryId } : p
            );
            void setData('products', nextProducts);
            return nextProducts;
        });

        if (syncManager.isOnline) {
            try {
                await apiPut(`/products/${id}`, cleanData);
            } catch {
                await syncManager.addToQueue({
                    type: 'UPDATE',
                    endpoint: '/products',
                    data: { id, ...cleanData },
                });
            }
        } else {
            await syncManager.addToQueue({
                type: 'UPDATE',
                endpoint: '/products',
                data: { id, ...cleanData },
            });
        }
    };

    const deleteProduct = async (id) => {
        setProducts((prev) => {
            const nextProducts = prev.filter((p) => p.id !== id);
            void setData('products', nextProducts);
            return nextProducts;
        });

        if (syncManager.isOnline) {
            try {
                await apiDelete('/products', id);
            } catch {
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
            id: generateId(), 
            createdAt: new Date().toISOString() 
        };
        
        setCategories((prev) => {
            const next = [...prev, newCategory];
            void setData('categories', next);
            return next;
        });

        if (syncManager.isOnline) {
            try {
                await apiPost('/categories', category);
            } catch {
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
