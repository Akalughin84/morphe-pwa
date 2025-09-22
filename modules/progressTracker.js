// /modules/progressTracker.js
// v0.3.0 — Трекер физического прогресса

import { StorageManager } from '/utils/storage.js';

/**
 * ProgressTracker — управляет данными о теле:
 * - Вес (кг)
 * - Обхваты: грудь, талия, бёдра (см)
 * - Дата измерения
 */
export class ProgressTracker {
  constructor() {
    this.storageKey = 'morphe-progress-data';
    this.data = this.load();
  }

  /**
   * Загружает данные из localStorage
   */
  load() {
    const raw = StorageManager.getItem(this.storageKey);
    return Array.isArray(raw) ? raw : [];
  }

  /**
   * Сохраняет данные
   */
  save() {
    StorageManager.setItem(this.storageKey, this.data);
  }

  /**
   * Добавляет новую запись прогресса
   * @param {Object} entry { weight, chest, waist, hips, date }
   */
  add(entry) {
    const record = {
      id: Date.now(), // уникальный ID по времени
      date: entry.date || new Date().toISOString().split('T')[0], // YYYY-MM-DD
      weight: parseFloat(entry.weight),
      chest: entry.chest ? parseFloat(entry.chest) : null,
      waist: entry.waist ? parseFloat(entry.waist) : null,
      hips: entry.hips ? parseFloat(entry.hips) : null,
      notes: entry.notes || ''
    };

    // Валидация
    if (isNaN(record.weight) || record.weight <= 0) {
      throw new Error("Вес обязателен и должен быть больше 0");
    }

    // Сортируем: свежие — в начало
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
   * Получить данные за период
   */
  getSince(daysAgo) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysAgo);
    const cutoffTime = cutoff.getTime();

    return this.data.filter(item => {
      const itemDate = new Date(item.date).getTime();
      return itemDate >= cutoffTime;
    });
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