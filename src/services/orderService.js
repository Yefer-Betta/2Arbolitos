import { getData, setData } from '../lib/api.js';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const orderService = {
    async getOrders() {
        return await getData('orders') || [];
    },

    async saveOrders(orders) {
        return await setData('orders', orders);
    },

    async getActiveTables() {
        return await getData('activeTables') || {};
    },

    async saveActiveTables(tables) {
        return await setData('activeTables', tables);
    },

    createOrder(orderData) {
        return {
            ...orderData,
            id: generateId(),
            date: new Date().toISOString(),
            status: 'pending',
        };
    },

    calculateOrderTotal(items, exchangeRate) {
        const totals = { cop: 0, usd: 0 };
        
        items.forEach(item => {
            const price = item.product.price;
            const isUsd = item.product.isUsd;
            const qty = item.quantity;

            if (isUsd) {
                totals.usd += price * qty;
                totals.cop += (price * exchangeRate) * qty;
            } else {
                totals.cop += price * qty;
                totals.usd += (price / exchangeRate) * qty;
            }
        });

        return totals;
    },

    calculateChange(received, total, currency) {
        return received - total;
    },
};
