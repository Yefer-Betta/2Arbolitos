import { getData, setData } from '../lib/api.js';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
            id: generateId(),
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
