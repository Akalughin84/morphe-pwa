// /modules/nutritionTracker.js
// v2.1.0 — Поддержка приёмов пищи + совместимость с ProgressCalendar

import { StorageManager } from '/utils/storage.js';

export class NutritionTracker {
  constructor() {
    this.storageKey = 'morphe-daily-food-log';
    this.entries = this.load();
  }

  load() {
    return StorageManager.getItem(this.storageKey) || [];
  }

  save() {
    StorageManager.setItem(this.storageKey, this.entries);
  }

  /**
   * Добавить продукт в приём пищи
   * @param {Object} foodItem - продукт из базы
   * @param {number} grams - количество грамм
   * @param {string} meal - 'breakfast', 'lunch', 'dinner', 'snack'
   */
  add(foodItem, grams, meal = 'other') {
    const entry = {
      ...foodItem,
      grams: parseFloat(grams) || 0,
      meal: meal,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      timestamp: Date.now()
    };

    this.entries.push(entry);
    this.save();
    return entry;
  }

  /**
   * Получить все записи за сегодня
   */
  getAllToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.entries.filter(e => e.date === today);
  }

  /**
   * Получить записи по приёму пищи за сегодня
   */
  getTodayByMeal(meal) {
    const today = new Date().toISOString().split('T')[0];
    return this.entries.filter(e => e.date === today && e.meal === meal);
  }

  /**
   * Получить суммарные макросы за сегодня
   */
  getTotalMacrosToday() {
    const today = this.getAllToday();
    return today.reduce((acc, item) => {
      const ratio = item.grams / 100;
      acc.calories += (item.calories || 0) * ratio;
      acc.protein += (item.protein || 0) * ratio;
      acc.fats += (item.fats || 0) * ratio;
      acc.carbs += (item.carbs || 0) * ratio;
      return acc;
    }, { calories: 0, protein: 0, fats: 0, carbs: 0 });
  }

  /**
   * Очистить сегодня
   */
  clearToday() {
    const today = new Date().toISOString().split('T')[0];
    this.entries = this.entries.filter(e => e.date !== today);
    this.save();
  }

  /**
   * Удалить запись по timestamp
   */
  remove(timestamp) {
    this.entries = this.entries.filter(e => e.timestamp !== timestamp);
    this.save();
  }
}