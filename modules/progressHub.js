// /modules/progressHub.js
// v1.0.0 — Единое хранилище прогресса: тело, питание, тренировки

import { StorageManager } from '/utils/storage.js';

export class ProgressHub {
  constructor() {
    this.storageKey = 'morphe-progress-hub';
    this.data = this.load();
  }

  load() {
    const raw = StorageManager.getItem(this.storageKey);
    if (!raw) {
      return {
        body: {},      // { "2025-09-21": { weight: 75.5, ... } }
        nutrition: {}, // { "2025-09-21": [ {meal: "...", grams: 100}, ... ] }
        workouts: {}   // { "2025-09-21": [ {exercise: "...", weight: 80}, ... ] }
      };
    }
    return raw;
  }

  save() {
    StorageManager.setItem(this.storageKey, this.data);
  }

  // === Тело ===
  addBodyEntry(dateStr, entry) {
    this.data.body[dateStr] = { ...entry, date: dateStr };
    this.save();
  }

  getBodyEntry(dateStr) {
    return this.data.body[dateStr] || null;
  }

  getAllBodyEntries() {
    return Object.entries(this.data.body).map(([date, entry]) => ({ ...entry, date }));
  }

  // === Питание ===
  addNutritionEntry(dateStr, entry) {
    if (!this.data.nutrition[dateStr]) {
      this.data.nutrition[dateStr] = [];
    }
    this.data.nutrition[dateStr].push({
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    });
    this.save();
  }

  getNutritionEntries(dateStr) {
    return this.data.nutrition[dateStr] || [];
  }

  getTotalMacrosByDate(dateStr) {
    const entries = this.getNutritionEntries(dateStr);
    return entries.reduce((acc, item) => {
      const ratio = item.grams / 100;
      acc.calories += (item.calories || 0) * ratio;
      acc.protein += (item.protein || 0) * ratio;
      acc.fats += (item.fats || 0) * ratio;
      acc.carbs += (item.carbs || 0) * ratio;
      return acc;
    }, { calories: 0, protein: 0, fats: 0, carbs: 0 });
  }

  removeNutritionEntry(dateStr, entryId) {
    if (!this.data.nutrition[dateStr]) return;
    this.data.nutrition[dateStr] = this.data.nutrition[dateStr].filter(e => e.id !== entryId);
    this.save();
  }

  // === Тренировки ===
  addWorkoutEntry(dateStr, entry) {
    if (!this.data.workouts[dateStr]) {
      this.data.workouts[dateStr] = [];
    }
    this.data.workouts[dateStr].push({
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    });
    this.save();
  }

  getWorkoutEntries(dateStr) {
    return this.data.workouts[dateStr] || [];
  }

  // === Утилиты ===
  getDateStr(date = new Date()) {
    return date.toISOString().split('T')[0];
  }

  // Получить последние 30 дней
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

  // Получить данные за последние 30 дней
  getLast30DaysData() {
    const dates = this.getLast30Days();
    return dates.map(date => ({
      date,
      hasBody: !!this.data.body[date],
      hasNutrition: (this.data.nutrition[date] || []).length > 0,
      hasWorkout: (this.data.workouts[date] || []).length > 0
    }));
  }
}