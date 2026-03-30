import { getData, setData } from '../lib/api.js';

export const menuService = {
    async getMenu() {
        return await getData('menu') || [];
    },

    async saveMenu(products) {
        return await setData('menu', products);
    },

    getCategories(products) {
        return ['Todos', ...new Set(products.map(p => p.category))];
    },

    filterProducts(products, searchTerm, category) {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = category === 'Todos' || product.category === category;
            return matchesSearch && matchesCategory;
        });
    },

    createProduct(productData) {
        return {
            ...productData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
    },

    updateProduct(products, productId, updates) {
        return products.map(p => 
            p.id === productId ? { ...p, ...updates } : p
        );
    },

    deleteProduct(products, productId) {
        return products.filter(p => p.id !== productId);
    },
};
