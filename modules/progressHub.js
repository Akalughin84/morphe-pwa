// /modules/progressHub.js
// v1.0.1 — Единое хранилище прогресса с миграцией и защитой

import { StorageManager } from '/utils/storage.js';

export class ProgressHub {
  constructor(options = {}) {
    this.storageKey = 'morphe-progress-hub';
    this.maxHistoryDays = options.maxHistoryDays || 365; // хранить до 1 года
    this.data = this.load();
    this._migrateLegacyData();
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  _normalizeDate(date) {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    // Проверка формата YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    throw new Error(`Некорректный формат даты: ${date}`);
  }

  _cleanupOldEntries() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Очистка тела
    for (const date in this.data.body) {
      if (date < cutoffStr) delete this.data.body[date];
    }

    // Очистка питания
    for (const date in this.data.nutrition) {
      if (date < cutoffStr) delete this.data.nutrition[date];
    }

    // Очистка тренировок
    for (const date in this.data.workouts) {
      if (date < cutoffStr) delete this.data.workouts[date];
    }
  }

  load() {
    const raw = StorageManager.getItem(this.storageKey);
    if (!raw) {
      return {
        body: {},
        nutrition: {},
        workouts: {}
      };
    }
    return raw;
  }

  save() {
    this._cleanupOldEntries();
    StorageManager.setItem(this.storageKey, this.data);
  }

  // === Миграция старых данных (однократно) ===

  async _migrateLegacyData() {
    const migratedKey = 'morphe-progress-hub-migrated';
    if (StorageManager.getItem(migratedKey)) return;

    try {
      // Миграция ProgressTracker (тело)
      const { ProgressTracker } = await import('/modules/progressTracker.js');
      const bodyTracker = new ProgressTracker();
      const bodyEntries = bodyTracker.getAll();
      bodyEntries.forEach(entry => {
        if (entry.date) {
          this.data.body[entry.date] = { ...entry };
        }
      });

      // Миграция NutritionTracker
      const { NutritionTracker } = await import('/modules/nutritionTracker.js');
      const nutritionTracker = new NutritionTracker();
      const nutritionEntries = nutritionTracker.entries;
      const nutritionByDate = {};
      nutritionEntries.forEach(entry => {
        if (entry.date) {
          if (!nutritionByDate[entry.date]) nutritionByDate[entry.date] = [];
          nutritionByDate[entry.date].push({
            ...entry,
            id: this._generateId(),
            timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString()
          });
        }
      });
      Object.assign(this.data.nutrition, nutritionByDate);

      // Миграция WorkoutTracker
      const { WorkoutTracker } = await import('/modules/workoutTracker.js');
      const workoutTracker = new WorkoutTracker();
      const workoutEntries = Array.isArray(workoutTracker.data) ? workoutTracker.data : [];
      const workoutsByDate = {};
      workoutEntries.forEach(entry => {
        if (entry.date) {
          if (!workoutsByDate[entry.date]) workoutsByDate[entry.date] = [];
          workoutsByDate[entry.date].push({
            ...entry,
            id: this._generateId(),
            timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString()
          });
        }
      });
      Object.assign(this.data.workouts, workoutsByDate);

      this.save();
      StorageManager.setItem(migratedKey, true);
      console.log('[ProgressHub] Миграция старых данных завершена');
    } catch (err) {
      console.warn('[ProgressHub] Не удалось выполнить миграцию:', err);
    }
  }

  // === Тело ===

  addBodyEntry(date, entry) {
    const dateStr = this._normalizeDate(date);
    this.data.body[dateStr] = { ...entry, date: dateStr };
    this.save();
  }

  getBodyEntry(date) {
    const dateStr = this._normalizeDate(date);
    return this.data.body[dateStr] || null;
  }

  getAllBodyEntries() {
    return Object.values(this.data.body).map(entry => ({ ...entry }));
  }

  // === Питание ===

  addNutritionEntry(date, entry) {
    const dateStr = this._normalizeDate(date);
    if (!this.data.nutrition[dateStr]) {
      this.data.nutrition[dateStr] = [];
    }
    this.data.nutrition[dateStr].push({
      ...entry,
      id: this._generateId(),
      timestamp: new Date().toISOString()
    });
    this.save();
  }

  getNutritionEntries(date) {
    const dateStr = this._normalizeDate(date);
    return this.data.nutrition[dateStr] || [];
  }

  getTotalMacrosByDate(date) {
    const entries = this.getNutritionEntries(date);
    return entries.reduce((acc, item) => {
      const ratio = (item.grams || 0) / 100;
      acc.calories += Math.max(0, (item.calories || 0) * ratio);
      acc.protein += Math.max(0, (item.protein || 0) * ratio);
      acc.fats += Math.max(0, (item.fats || 0) * ratio);
      acc.carbs += Math.max(0, (item.carbs || 0) * ratio);
      return acc;
    }, { calories: 0, protein: 0, fats: 0, carbs: 0 });
  }

  removeNutritionEntry(date, entryId) {
    const dateStr = this._normalizeDate(date);
    if (!this.data.nutrition[dateStr]) return;
    this.data.nutrition[dateStr] = this.data.nutrition[dateStr].filter(e => e.id !== entryId);
    this.save();
  }

  // === Тренировки ===

  addWorkoutEntry(date, entry) {
    const dateStr = this._normalizeDate(date);
    if (!this.data.workouts[dateStr]) {
      this.data.workouts[dateStr] = [];
    }
    this.data.workouts[dateStr].push({
      ...entry,
      id: this._generateId(),
      timestamp: new Date().toISOString()
    });
    this.save();
  }

  getWorkoutEntries(date) {
    const dateStr = this._normalizeDate(date);
    return this.data.workouts[dateStr] || [];
  }

  // === Утилиты ===

  getDateStr(date = new Date()) {
    return this._normalizeDate(date);
  }

  getLast30Days() {
    const today = new Date();
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(this.getDateStr(d));
    }
    return dates;
  }

  getLast30DaysData() {
    const dates = this.getLast30Days();
    return dates.map(date => ({
      date,
      hasBody: !!this.data.body[date],
      hasNutrition: (this.data.nutrition[date] || []).length > 0,
      hasWorkout: (this.data.workouts[date] || []).length > 0
    }));
  }

  // === Экспорт/резервная копия ===

  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.body && parsed.nutrition && parsed.workouts) {
        this.data = parsed;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('[ProgressHub] Ошибка импорта:', e);
    }
    return false;
  }
}