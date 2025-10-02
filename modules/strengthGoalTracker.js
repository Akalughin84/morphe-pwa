// /modules/strengthGoalTracker.js
// v2.0.1 — Улучшенная надёжность, валидация и расширяемость

import { StorageManager } from '/utils/storage.js';
import { DateUtils } from '/utils/dateUtils.js';

export class StrengthGoalTracker {
  constructor() {
    this.storageKey = 'morphe-strength-goals';
    this.goals = this.load();
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  load() {
    const raw = StorageManager.getItem(this.storageKey) || [];
    // Убедимся, что все цели имеют корректный ID
    return raw.map(goal => ({
      ...goal,
      id: goal.id || this._generateId()
    }));
  }

  save() {
    StorageManager.setItem(this.storageKey, this.goals);
  }

  add(goal) {
    if (!goal.exerciseId || !goal.exerciseName) {
      throw new Error("exerciseId и exerciseName обязательны");
    }
    if (typeof goal.targetValue !== 'number' || goal.targetValue <= 0) {
      throw new Error("targetValue должен быть положительным числом");
    }
    if (goal.unit !== 'kg' && goal.unit !== 'reps' && goal.unit !== 'time') {
      console.warn(`Неизвестная единица измерения: ${goal.unit}. Ожидается: kg, reps, time.`);
    }

    const record = {
      id: this._generateId(),
      exerciseId: String(goal.exerciseId),
      exerciseName: String(goal.exerciseName),
      currentValue: typeof goal.currentValue === 'number' ? goal.currentValue : 0,
      targetValue: goal.targetValue,
      unit: goal.unit || 'kg',
      startDate: goal.startDate || DateUtils.today(),
      targetDate: goal.targetDate || null,
      status: 'active',
      history: [],
      notes: String(goal.notes || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.goals.push(record);
    this.save();
    return record;
  }

  findById(id) {
    return this.goals.find(g => g.id === id);
  }

  updateProgress(goalId, newValue, date = DateUtils.today()) {
    const goal = this.findById(goalId);
    if (!goal) {
      throw new Error("Цель не найдена");
    }
    if (typeof newValue !== 'number' || newValue < 0) {
      throw new Error("Новое значение должно быть неотрицательным числом");
    }
    if (newValue < goal.currentValue && goal.unit !== 'time') {
      throw new Error("Новое значение должно быть больше или равно текущему");
    }
    // Для 'time' (например, время на дистанцию) — чем меньше, тем лучше
    if (goal.unit === 'time' && newValue > goal.currentValue) {
      throw new Error("Для целей типа 'time' новое значение должно быть меньше или равно текущему");
    }

    goal.currentValue = newValue;
    goal.history.push({ date: String(date), value: newValue });
    goal.updatedAt = new Date().toISOString();

    // Завершение цели
    const isCompleted = goal.unit === 'time'
      ? newValue <= goal.targetValue
      : newValue >= goal.targetValue;

    if (isCompleted && goal.status === 'active') {
      goal.status = 'completed';
      goal.completedAt = new Date().toISOString();
    }

    this.save();
    return goal;
  }

  getActive() {
    return this.goals.filter(g => g.status === 'active');
  }

  getCompleted() {
    return this.goals.filter(g => g.status === 'completed');
  }

  getProgressPercent(goal) {
    if (goal.unit === 'time') {
      // Для времени: 100% = достигли targetValue или ниже
      if (goal.targetValue <= 0) return 0;
      const ratio = goal.currentValue / goal.targetValue;
      return Math.max(0, Math.min(100, (1 - ratio) * 100));
    }
    // Для kg и reps
    if (goal.targetValue <= 0) return 0;
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  }

  getCompletionForecast(goal) {
    if (goal.history.length < 2) return null;

    const first = goal.history[0];
    const last = goal.history[goal.history.length - 1];
    const days = DateUtils.diffInDays(first.date, last.date);
    if (days <= 0) return null;

    const progress = last.value - first.value;
    const progressPerDay = progress / days;

    let daysLeft = null;

    if (goal.unit === 'time') {
      // Цель: уменьшить значение (например, время)
      if (progressPerDay >= 0) return null; // прогресса нет или регресс
      const remaining = goal.currentValue - goal.targetValue; // >0
      daysLeft = Math.ceil(remaining / Math.abs(progressPerDay));
    } else {
      // Цель: увеличить значение (вес, повторения)
      if (progressPerDay <= 0) return null;
      const remaining = goal.targetValue - goal.currentValue;
      if (remaining <= 0) return null;
      daysLeft = Math.ceil(remaining / progressPerDay);
    }

    if (daysLeft === null || daysLeft <= 0) return null;

    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + daysLeft);

    return {
      days: daysLeft,
      date: forecastDate.toISOString().split('T')[0],
      met: false
    };
  }

  // === Новые методы ===

  remove(goalId) {
    const index = this.goals.findIndex(g => g.id === goalId);
    if (index === -1) return false;
    this.goals.splice(index, 1);
    this.save();
    return true;
  }

  archive(goalId) {
    const goal = this.findById(goalId);
    if (!goal || goal.status === 'completed') return false;
    goal.status = 'archived';
    goal.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  clear() {
    this.goals = [];
    StorageManager.removeItem(this.storageKey);
  }
}