// /core/strengthGoalTracker.js
// v1.2.2 — Исправлен импорт DateUtils, полностью самодостаточный

import { StorageManager } from '/utils/storage.js';

/**
 * Вспомогательные функции даты (встроенные, без внешних зависимостей)
 */
function getToday() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function diffInDays(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

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
    if (!['kg', 'reps', 'time'].includes(goal.unit)) {
      console.warn(`Неизвестная единица измерения: ${goal.unit}. Ожидается: kg, reps, time.`);
    }

    const record = {
      id: this._generateId(),
      exerciseId: String(goal.exerciseId),
      exerciseName: String(goal.exerciseName),
      currentValue: typeof goal.currentValue === 'number' ? goal.currentValue : 0,
      targetValue: goal.targetValue,
      unit: goal.unit || 'kg',
      startDate: goal.startDate || getToday(),
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

  updateProgress(goalId, newValue, date = getToday()) {
    const goal = this.findById(goalId);
    if (!goal) {
      throw new Error("Цель не найдена");
    }
    if (typeof newValue !== 'number' || newValue < 0) {
      throw new Error("Новое значение должно быть неотрицательным числом");
    }

    if (goal.unit === 'time') {
      if (newValue > goal.currentValue) {
        throw new Error("Для целей типа 'time' новое значение должно быть меньше или равно текущему");
      }
    } else {
      if (newValue < goal.currentValue) {
        throw new Error("Новое значение должно быть больше или равно текущему");
      }
    }

    goal.currentValue = newValue;
    goal.history.push({ date: String(date), value: newValue });
    goal.updatedAt = new Date().toISOString();

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

  getAll() {
    return [...this.goals];
  }

  getActive() {
    return this.goals.filter(g => g.status === 'active');
  }

  getCompleted() {
    return this.goals.filter(g => g.status === 'completed');
  }

  getProgressPercent(goal) {
    if (goal.unit === 'time') {
      if (goal.targetValue <= 0) return 0;
      const ratio = goal.currentValue / goal.targetValue;
      return Math.max(0, Math.min(100, (1 - ratio) * 100));
    }
    if (goal.targetValue <= 0) return 0;
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  }

  getProgressRate(goal) {
    if (goal.history.length < 2) return 'slow';

    const first = goal.history[0];
    const last = goal.history[goal.history.length - 1];
    const days = diffInDays(first.date, last.date);
    if (days <= 0) return 'slow';

    let progressPerDay;
    if (goal.unit === 'time') {
      progressPerDay = (first.value - last.value) / days;
    } else {
      progressPerDay = (last.value - first.value) / days;
    }

    if (progressPerDay <= 0) return 'stalled';
    if (progressPerDay * 7 > 2) return 'fast';
    return 'steady';
  }

  getCompletionForecast(goal) {
    if (goal.history.length < 2) return null;

    const first = goal.history[0];
    const last = goal.history[goal.history.length - 1];
    const days = diffInDays(first.date, last.date);
    if (days <= 0) return null;

    let progressPerDay, remaining;
    if (goal.unit === 'time') {
      progressPerDay = (first.value - last.value) / days;
      if (progressPerDay <= 0) return null;
      remaining = goal.currentValue - goal.targetValue;
    } else {
      progressPerDay = (last.value - first.value) / days;
      if (progressPerDay <= 0) return null;
      remaining = goal.targetValue - goal.currentValue;
    }

    if (remaining <= 0) return null;

    const daysLeft = Math.ceil(remaining / progressPerDay);
    if (daysLeft <= 0) return null;

    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + daysLeft);

    return {
      days: daysLeft,
      date: forecastDate.toISOString().split('T')[0],
      met: false
    };
  }

  findById(id) {
    return this.goals.find(g => g.id === id);
  }

  remove(goalId) {
    const index = this.goals.findIndex(g => g.id === goalId);
    if (index === -1) return false;
    this.goals.splice(index, 1);
    this.save();
    return true;
  }

  pause(goalId) {
    const goal = this.findById(goalId);
    if (!goal || goal.status !== 'active') return false;
    goal.status = 'paused';
    goal.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  clear() {
    this.goals = [];
    StorageManager.removeItem(this.storageKey);
  }
}