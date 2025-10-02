// /utils/storage.js
// v1.0.0 — Универсальный менеджер хранилища с поддержкой localStorage и IndexedDB
export class StorageManager {
  static setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`❌ Не удалось сохранить ${key}:`, err);
      // Если localStorage переполнен — попробуем очистить
      if (err.name === 'QuotaExceededError') {
        this.clearStorage();
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  }

  static getItem(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error(`❌ Не удалось прочитать ${key}:`, err);
      return null;
    }
  }

  static removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`❌ Не удалось удалить ${key}:`, err);
    }
  }

  static clearStorage() {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('❌ Не удалось очистить хранилище:', err);
    }
  }

  // Для работы с IndexedDB (если нужно)
  static async openDB(name, version) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'id' });
        }
      };
    });
  }

  static async setItemIndexedDB(dbName, key, value) {
    const db = await this.openDB(dbName, 1);
    const transaction = db.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    const request = store.put({ id: key, value });
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getItemIndexedDB(dbName, key) {
    const db = await this.openDB(dbName, 1);
    const transaction = db.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');
    const request = store.get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }
}