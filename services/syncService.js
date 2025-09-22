// /services/syncService.js
// v1.9.0 — Заготовка для синхронизации (готова к интеграции)

import { StorageManager } from '/utils/storage.js';
import { Logger } from '/utils/logger.js';

/**
 * SyncService — интерфейс для будущей синхронизации
 * Пока: только заготовка, работает в оффлайне
 * Будущее: Google Drive, Dropbox, WebDAV, зашифрованное хранилище
 */
export class SyncService {
  constructor() {
    this.storageKey = 'morphe-sync-state';
    this.state = this.loadState();
    this.providers = new Map();
    this.encryptionEnabled = true; // можно отключить в настройках
  }

  /**
   * Загружает состояние синхронизации
   */
  loadState() {
    return StorageManager.getItem(this.storageKey) || {
      lastBackup: null,
      lastRestore: null,
      autoSyncEnabled: false,
      provider: null,
      encrypted: true,
      deviceId: this._generateDeviceId()
    };
  }

  /**
   * Сохраняет состояние
   */
  saveState() {
    StorageManager.setItem(this.storageKey, this.state);
  }

  /**
   * Генерация ID устройства (для конфликтов)
   */
  _generateDeviceId() {
    let id = localStorage.getItem('morphe-device-id');
    if (!id) {
      id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('morphe-device-id', id);
    }
    return id;
  }

  /**
   * Все данные для бэкапа
   */
  getAllData() {
    const KEYS = [
      'morphe-user-profile',
      'morphe-workout-history',
      'morphe-progress-data',
      'morphe-strength-goals',
      'morphe-daily-food-log',
      'morphe-notifications',
      'morphe-scheduled-notifications',
      'morphe-current-workout-plan',
      'morphe-achievements',
      'morphe-user-config',
      'morphe-supplement-views'
    ];

    const data = {};
    KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        data[key] = JSON.parse(value);
      }
    });

    data.meta = {
      version: "v1.9.0",
      appName: "Morphe",
      deviceId: this.state.deviceId,
      exportDate: new Date().toISOString(),
      platform: navigator.userAgent
    };

    return data;
  }

  /**
   * Шифрование (заглушка — в будущем можно добавить crypto.subtle)
   */
  async encrypt(data) {
    if (!this.encryptionEnabled) return data;

    // В будущем: AES-GCM, ключ из пароля пользователя
    const jsonString = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    return { encrypted: true, data: encoded, algorithm: 'mock-base64' };
  }

  /**
   * Дешифрование
   */
  async decrypt(encryptedData) {
    if (!encryptedData.encrypted) return encryptedData;

    try {
      const decoded = decodeURIComponent(escape(atob(encryptedData.data)));
      return JSON.parse(decoded);
    } catch (err) {
      Logger.error('SyncService', 'Ошибка декодирования', err);
      throw new Error("Не удалось расшифровать данные");
    }
  }

  /**
   * Регистрация провайдера (Google Drive, Dropbox и т.д.)
   */
  registerProvider(name, provider) {
    if (typeof provider.backup !== 'function' || typeof provider.restore !== 'function') {
      throw new Error(`Провайдер ${name} должен иметь методы backup() и restore()`);
    }
    this.providers.set(name, provider);
    Logger.info('SyncService', `Провайдер зарегистрирован: ${name}`);
  }

  /**
   * Активация провайдера
   */
  setProvider(name) {
    if (!this.providers.has(name)) {
      Logger.warn('SyncService', `Провайдер не найден: ${name}`);
      return false;
    }
    this.state.provider = name;
    this.saveState();
    return true;
  }

  /**
   * Резервное копирование
   */
  async backup() {
    try {
      if (!this.state.provider) {
        throw new Error("Не выбран провайдер синхронизации");
      }

      const provider = this.providers.get(this.state.provider);
      const data = this.getAllData();
      const payload = this.encryptionEnabled ? await this.encrypt(data) : data;

      const result = await provider.backup(payload);

      this.state.lastBackup = new Date().toISOString();
      this.saveState();

      Logger.info('SyncService', 'Резервная копия создана', { provider: this.state.provider });
      return { success: true, timestamp: this.state.lastBackup, result };

    } catch (err) {
      Logger.error('SyncService', 'Ошибка резервного копирования', err);
      throw err;
    }
  }

  /**
   * Восстановление
   */
  async restore() {
    try {
      if (!this.state.provider) {
        throw new Error("Не выбран провайдер синхронизации");
      }

      const provider = this.providers.get(this.state.provider);
      const encryptedData = await provider.restore();

      let data;
      if (encryptedData.encrypted) {
        data = await this.decrypt(encryptedData);
      } else {
        data = encryptedData;
      }

      // Восстановление в localStorage
      Object.keys(data).forEach(key => {
        if (key === 'meta') return;
        localStorage.setItem(key, JSON.stringify(data[key]));
      });

      this.state.lastRestore = new Date().toISOString();
      this.saveState();

      Logger.info('SyncService', 'Данные восстановлены', { provider: this.state.provider });
      return { success: true, timestamp: this.state.lastRestore };

    } catch (err) {
      Logger.error('SyncService', 'Ошибка восстановления', err);
      throw err;
    }
  }

  /**
   * Вручную: экспорт в JSON (как в backup.html)
   */
  downloadBackup() {
    const data = this.getAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morphe-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Импорт из файла
   */
  async restoreFromFile(file) {
    const content = await file.text();
    const data = JSON.parse(content);

    Object.keys(data).forEach(key => {
      if (key === 'meta') return;
      localStorage.setItem(key, JSON.stringify(data[key]));
    });

    location.reload();
  }

  /**
   * Доступен ли функционал
   */
  isAvailable() {
    return this.providers.size > 0;
  }

  /**
   * Получить список провайдеров
   */
  getProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Очистка (для тестов)
   */
  clear() {
    this.state = {
      lastBackup: null,
      lastRestore: null,
      autoSyncEnabled: false,
      provider: null,
      encrypted: true,
      deviceId: this._generateDeviceId()
    };
    this.saveState();
  }
}