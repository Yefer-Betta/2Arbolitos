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

                    if (Array.isArray(serverProducts)) {
                        localProducts = serverProducts.map(p => ({
                            ...p,
                            category: p.category?.name || p.categoryId || '',
                            categoryId: p.categoryId || ''
                        }));
                        await setData('products', localProducts);
                    }
                    if (Array.isArray(serverCategories)) {
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
        }, 10000);
        
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
            inventoryItemId: newProduct.inventoryItemId || null,
        };

        if (syncManager.isOnline) {
            try {
                const serverProduct = await apiPost('/products', productForServer);
                if (serverProduct && !serverProduct.offline && serverProduct.id) {
                    setProducts((prev) => {
                        const next = prev.map(p => p.id === newProduct.id ? { ...serverProduct, category: serverProduct.category?.name || '' } : p);
                        void setData('products', next);
                        return next;
                    });
                }
            } catch (error) {
                console.warn('Error al crear producto:', error);
            }
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
            inventoryItemId: updatedData.inventoryItemId !== undefined ? updatedData.inventoryItemId : null,
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
                const serverProduct = await apiPut(`/products/${id}`, cleanData);
                if (serverProduct && !serverProduct.offline && serverProduct.id) {
                    setProducts((prev) => {
                        const next = prev.map(p => p.id === id ? { ...serverProduct, category: serverProduct.category?.name || '' } : p);
                        void setData('products', next);
                        return next;
                    });
                }
            } catch (error) {
                console.warn('Error al actualizar producto:', error);
            }
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
            } catch (error) {
                console.warn('Error al eliminar producto:', error);
            }
        }
    };

    const addCategory = async (category) => {
        const tempId = generateId();
        const newCategory = {
            name: category.name,
            order: category.order ?? categories.length,
            active: true,
            ...category,
            id: tempId,
            createdAt: new Date().toISOString(),
        };
        
        setCategories((prev) => {
            const next = [...prev, newCategory];
            void setData('categories', next);
            return next;
        });

        if (syncManager.isOnline) {
            try {
                const created = await apiPost('/categories', {
                    name: newCategory.name,
                    order: newCategory.order,
                });
                if (created && !created.offline && created.id) {
                    setCategories((prev) => {
                        const next = prev.map(c => c.id === tempId ? { ...newCategory, ...created } : c);
                        void setData('categories', next);
                        return next;
                    });
                    // Los productos creados mientras la categoria tenia ID temporal deben apuntar al ID real.
                    setProducts((prev) => {
                        let changed = false;
                        const next = prev.map(p => {
                            if (p.categoryId === tempId) {
                                changed = true;
                                return { ...p, categoryId: created.id };
                            }
                            return p;
                        });
                        if (changed) void setData('products', next);
                        return next;
                    });
                    return created;
                }
            } catch (error) {
                console.warn('Error al crear categoría:', error);
            }
        }

        return newCategory;
    };

    const updateCategory = async (id, categoryData) => {
        const cleanData = { name: categoryData.name };
        if (categoryData.order !== undefined) cleanData.order = categoryData.order;
        if (categoryData.active !== undefined) cleanData.active = categoryData.active;

        setCategories((prev) => {
            const next = prev.map(c => c.id === id ? { ...c, ...cleanData } : c);
            void setData('categories', next);
            return next;
        });

        if (cleanData.name) {
            setProducts((prev) => {
                const next = prev.map(p => p.categoryId === id ? { ...p, category: cleanData.name } : p);
                void setData('products', next);
                return next;
            });
        }

        if (syncManager.isOnline) {
            try {
                const updated = await apiPut(`/categories/${id}`, cleanData);
                if (updated && !updated.offline && updated.id) {
                    setCategories((prev) => {
                        const next = prev.map(c => c.id === id ? { ...c, ...updated } : c);
                        void setData('categories', next);
                        return next;
                    });
                }
                return updated;
            } catch (error) {
                console.warn('Error al actualizar categoría:', error);
            }
        }
    };

    const deleteCategory = async (id) => {
        setCategories((prev) => {
            const next = prev.filter(c => c.id !== id);
            void setData('categories', next);
            return next;
        });

        if (syncManager.isOnline) {
            try {
                await apiDelete('/categories', id);
            } catch (error) {
                console.warn('Error al eliminar categoría:', error);
            }
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
        updateCategory,
        deleteCategory,
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
