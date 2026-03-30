const DB_NAME = '2arbolitos_db';
const DB_VERSION = 1;
let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains('data')) {
                database.createObjectStore('data', { keyPath: 'key' });
            }
        };
    });
}

export async function getData(key) {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['data'], 'readonly');
            const store = transaction.objectStore('data');
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
        });
    } catch (error) {
        console.error(`Error getting data for key "${key}":`, error);
        return null;
    }
}

export async function setData(key, value) {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            const request = store.put({ key, value });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (error) {
        console.error(`Error setting data for key "${key}":`, error);
    }
}

export async function deleteData(key) {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error(`Error deleting data for key "${key}":`, error);
    }
}
