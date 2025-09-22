// /utils/storage.js

/**
 * Умная обёртка над localStorage
 * Автоматически сериализует/парсит JSON
 * Логирует ошибки
 */
export class StorageManager {
  static setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`❌ Не удалось сохранить в localStorage: ${key}`, err);
      throw new Error("Невозможно сохранить данные. Проверьте, включён ли localStorage.");
    }
  }

  static getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error(`❌ Не удалось прочитать из localStorage: ${key}`, err);
      return null;
    }
  }

  static removeItem(key) {
    localStorage.removeItem(key);
  }

  static clear() {
    localStorage.clear();
  }
}