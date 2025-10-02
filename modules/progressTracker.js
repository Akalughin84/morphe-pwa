// /modules/progressTracker.js
// v0.4.0 — Защита от дублей: только один замер в день

import { StorageManager } from '/utils/storage.js';

/**
 * ProgressTracker — управляет данными о теле:
 * - Вес (кг)
 * - Обхваты: грудь, талия, бёдра (см)
 * - Дата измерения
 * 
 * ⚠️ Важно: за один день хранится ТОЛЬКО ОДНА запись.
 * При добавлении нового замера за существующий день — старый заменяется.
 */
export class ProgressTracker {
  constructor(options = {}) {
    this.storageKey = 'morphe-progress-data';
    this.maxHistoryDays = options.maxHistoryDays || 730; // ~2 года
    this.data = this.load();
    this._cleanupOldEntries();
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  _getCurrentDate() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  _normalizeDate(date) {
    return String(date).split('T')[0];
  }

  _cleanupOldEntries() {
    const cutoffTime = Date.now() - this.maxHistoryDays * 24 * 60 * 60 * 1000;
    const initialLength = this.data.length;
    this.data = this.data.filter(item => {
      const itemTime = new Date(item.date).getTime();
      return itemTime >= cutoffTime;
    });
    if (this.data.length !== initialLength) {
      this.save();
    }
  }

  load() {
    const raw = StorageManager.getItem(this.storageKey);
    if (!Array.isArray(raw)) return [];

    return raw.map(item => ({
      ...item,
      id: item.id || this._generateId(),
      date: this._normalizeDate(item.date || this._getCurrentDate()),
      weight: parseFloat(item.weight) || 0,
      chest: item.chest != null ? parseFloat(item.chest) : null,
      waist: item.waist != null ? parseFloat(item.waist) : null,
      hips: item.hips != null ? parseFloat(item.hips) : null,
      notes: String(item.notes || '')
    })).sort((a, b) => new Date(b.date) - new Date(a.date)); // новые — первые
  }

  save() {
    StorageManager.setItem(this.storageKey, this.data);
  }

  /**
   * Добавляет или обновляет запись прогресса за указанный день.
   * Если запись за этот день уже существует — она заменяется.
   * 
   * @param {Object} entry { weight, chest, waist, hips, date }
   * @returns {Object} Новая запись
   */
  add(entry) {
    const dateStr = this._normalizeDate(entry.date || this._getCurrentDate());
    
    // Удаляем существующую запись за этот день
    this.data = this.data.filter(item => item.date !== dateStr);
    
    // Создаём новую запись
    const record = {
      id: this._generateId(),
      date: dateStr,
      weight: parseFloat(entry.weight),
      chest: entry.chest != null ? parseFloat(entry.chest) : null,
      waist: entry.waist != null ? parseFloat(entry.waist) : null,
      hips: entry.hips != null ? parseFloat(entry.hips) : null,
      notes: String(entry.notes || '')
    };

    if (isNaN(record.weight) || record.weight <= 0) {
      throw new Error("Вес обязателен и должен быть больше 0");
    }

    // Добавляем в начало (новые — первые)
    this.data.unshift(record);
    this.save();
    return record;
  }

  /**
   * Получить все записи
   */
  getAll() {
    return [...this.data];
  }

  /**
   * Последняя запись
   */
  getLast() {
    return this.data[0] || null;
  }

  /**
   * Получить данные за период (в днях назад)
   */
  getSince(daysAgo) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysAgo);
    const cutoffTime = cutoff.getTime();

    return this.data.filter(item => {
      const itemTime = new Date(item.date).getTime();
      return itemTime >= cutoffTime;
    });
  }

  /**
   * Получить записи за конкретную дату
   * @param {string} dateStr — в формате YYYY-MM-DD
   * @returns {Array} Массив записей (обычно 0 или 1 элемент)
   */
  getEntriesByDate(dateStr) {
    const normalizedDate = this._normalizeDate(dateStr);
    return this.data.filter(item => item.date === normalizedDate);
  }

  /**
   * Удалить запись по ID
   */
  remove(id) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) throw new Error("Запись не найдена");
    this.data.splice(index, 1);
    this.save();
  }

  /**
   * Очистка (для тестов)
   */
  clear() {
    this.data = [];
    StorageManager.removeItem(this.storageKey);
  }
}