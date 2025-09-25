class StorageManager {
    constructor() {
        this.dbName = 'TaskZenDB';
        this.dbVersion = 1;
        this.initIndexedDB();
    }

    // Initialize IndexedDB
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Error opening IndexedDB');
                // Fallback to LocalStorage
                this.useLocalStorage = true;
                resolve();
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
                    taskStore.createIndex('status', 'status', { unique: false });
                    taskStore.createIndex('priority', 'priority', { unique: false });
                    taskStore.createIndex('dueDate', 'dueDate', { unique: false });
                }

                if (!db.objectStoreNames.contains('categories')) {
                    db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // Generic IndexedDB Operations
    async addItem(storeName, item) {
        if (this.useLocalStorage) {
            return this.addToLocalStorage(storeName, item);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getItem(storeName, id) {
        if (this.useLocalStorage) {
            return this.getFromLocalStorage(storeName, id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateItem(storeName, item) {
        if (this.useLocalStorage) {
            return this.updateInLocalStorage(storeName, item);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteItem(storeName, id) {
        if (this.useLocalStorage) {
            return this.deleteFromLocalStorage(storeName, id);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAllItems(storeName) {
        if (this.useLocalStorage) {
            return this.getAllFromLocalStorage(storeName);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // LocalStorage Fallback Methods
    addToLocalStorage(storeName, item) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        item.id = Date.now(); // Simple ID generation
        items.push(item);
        localStorage.setItem(storeName, JSON.stringify(items));
        return Promise.resolve(item.id);
    }

    getFromLocalStorage(storeName, id) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        return Promise.resolve(items.find(item => item.id === id));
    }

    updateInLocalStorage(storeName, updatedItem) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        const index = items.findIndex(item => item.id === updatedItem.id);
        if (index !== -1) {
            items[index] = updatedItem;
            localStorage.setItem(storeName, JSON.stringify(items));
        }
        return Promise.resolve();
    }

    deleteFromLocalStorage(storeName, id) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        const filteredItems = items.filter(item => item.id !== id);
        localStorage.setItem(storeName, JSON.stringify(filteredItems));
        return Promise.resolve();
    }

    getAllFromLocalStorage(storeName) {
        return Promise.resolve(JSON.parse(localStorage.getItem(storeName) || '[]'));
    }

    // Query Methods
    async queryItems(storeName, indexName, query) {
        if (this.useLocalStorage) {
            return this.queryLocalStorage(storeName, indexName, query);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(query);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    queryLocalStorage(storeName, indexName, query) {
        const items = JSON.parse(localStorage.getItem(storeName) || '[]');
        return Promise.resolve(items.filter(item => item[indexName] === query));
    }
}

// Create and export a single instance
const storage = new StorageManager();
export default storage;