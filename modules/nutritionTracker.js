// /modules/nutritionTracker.js
// v2.1.2 — Поддержка приёмов пищи + совместимость с ProgressCalendar + обратная совместимость

import { StorageManager } from '/utils/storage.js';

export class NutritionTracker {
  constructor(options = {}) {
    this.storageKey = 'morphe-daily-food-log';
    this.maxHistoryDays = options.maxHistoryDays || 90;
    this._dateCache = new Map();
    this.entries = this.load();
  }

  _getCurrentDate() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  _normalizeDate(date) {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return String(date).split('T')[0];
  }

  _cleanupOldEntries() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const initialLength = this.entries.length;
    this.entries = this.entries.filter(entry => entry.date >= cutoffStr);

    if (this.entries.length !== initialLength) {
      this.save();
      this._dateCache.clear();
    }
  }

  load() {
    const data = StorageManager.getItem(this.storageKey) || [];
    this.entries = data;
    this._cleanupOldEntries();
    return this.entries;
  }

  save() {
    StorageManager.setItem(this.storageKey, this.entries);
    this._dateCache.clear();
  }

  add(foodItem, grams, meal = 'other') {
    if (!foodItem || typeof foodItem !== 'object') {
      console.warn('[NutritionTracker] Invalid foodItem provided');
      return null;
    }

    const cleanGrams = Math.max(0, parseFloat(grams) || 0);
    if (cleanGrams === 0) {
      console.warn('[NutritionTracker] Skipped entry with 0 grams');
      return null;
    }

    const entry = {
      ...foodItem,
      grams: cleanGrams,
      meal: String(meal || 'other').toLowerCase(),
      date: this._getCurrentDate(),
      timestamp: Date.now()
    };

    this.entries.push(entry);
    this.save();
    return entry;
  }

  getEntriesByDate(date = null) {
    const targetDate = this._normalizeDate(date || new Date());
    
    if (this._dateCache.has(targetDate)) {
      return this._dateCache.get(targetDate);
    }

    const filtered = this.entries.filter(e => e.date === targetDate);
    this._dateCache.set(targetDate, filtered);
    return filtered;
  }

  getEntriesByMeal(meal, date = null) {
    const entries = this.getEntriesByDate(date);
    return entries.filter(e => e.meal === String(meal).toLowerCase());
  }

  getTotalMacros(date = null) {
    const entries = this.getEntriesByDate(date);
    return entries.reduce((acc, item) => {
      const ratio = (item.grams || 0) / 100;
      acc.calories += Math.max(0, (item.calories || 0) * ratio);
      acc.protein += Math.max(0, (item.protein || 0) * ratio);
      acc.fats += Math.max(0, (item.fats || 0) * ratio);
      acc.carbs += Math.max(0, (item.carbs || 0) * ratio);
      return acc;
    }, { calories: 0, protein: 0, fats: 0, carbs: 0 });
  }

  getDailySummary(date = null) {
    const targetDate = this._normalizeDate(date || new Date());
    const meals = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
    const summary = {
      date: targetDate,
      meals: {},
      total: this.getTotalMacros(targetDate)
    };

    for (const meal of meals) {
      summary.meals[meal] = this.getEntriesByMeal(meal, targetDate);
    }

    return summary;
  }

  clearDate(date = null) {
    const targetDate = this._normalizeDate(date || new Date());
    this.entries = this.entries.filter(e => e.date !== targetDate);
    this.save();
  }

  remove(timestamp) {
    const initialLength = this.entries.length;
    this.entries = this.entries.filter(e => e.timestamp !== timestamp);
    if (this.entries.length !== initialLength) {
      this.save();
    }
  }

  getDatesWithEntries() {
    const dates = new Set(this.entries.map(e => e.date));
    return Array.from(dates).sort();
  }

  // === Совместимость со старым API (v2.1.0) ===

  getTotalMacrosToday() {
    return this.getTotalMacros();
  }

  getAllToday() {
    return this.getEntriesByDate();
  }

  getTodayByMeal(meal) {
    return this.getEntriesByMeal(meal);
  }

  clearToday() {
    return this.clearDate();
  }
}