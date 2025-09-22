// /modules/strengthGoalTracker.js
// v2.0.0 — Трекер целей по силе

import { StorageManager } from '/utils/storage.js';
import { DateUtils } from '/utils/dateUtils.js';

export class StrengthGoalTracker {
  constructor() {
    this.storageKey = 'morphe-strength-goals';
    this.goals = this.load();
  }

  load() {
    return StorageManager.getItem(this.storageKey) || [];
  }

  save() {
    StorageManager.setItem(this.storageKey, this.goals);
  }

  add(goal) {
    const record = {
      id: Date.now(),
      exerciseId: goal.exerciseId,
      exerciseName: goal.exerciseName,
      currentValue: goal.currentValue || 0,
      targetValue: goal.targetValue,
      unit: goal.unit,
      startDate: goal.startDate || DateUtils.today(),
      targetDate: goal.targetDate || null,
      status: 'active',
      history: [],
      notes: goal.notes || '',
      createdAt: new Date().toISOString()
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
    if (!goal || newValue < goal.currentValue) {
      throw new Error("Новое значение должно быть больше предыдущего");
    }

    goal.currentValue = newValue;
    goal.history.push({ date, value: newValue });

    if (newValue >= goal.targetValue && goal.status === 'active') {
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
    if (goal.unit === 'time' && goal.targetValue > 0) {
      return Math.min(100, (1 - goal.currentValue / goal.targetValue) * 100);
    }
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  }

  getCompletionForecast(goal) {
    if (goal.history.length < 2) return null;

    const first = goal.history[0];
    const last = goal.history[goal.history.length - 1];
    const days = DateUtils.diffInDays(first.date, last.date);
    const progressPerDay = (last.value - first.value) / days;

    if (progressPerDay <= 0) return null;

    const remaining = goal.targetValue - goal.currentValue;
    const daysLeft = Math.ceil(remaining / progressPerDay);

    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + daysLeft);

    return {
      days: daysLeft,
      date: forecastDate.toISOString().split('T')[0],
      met: false
    };
  }

  clear() {
    this.goals = [];
    StorageManager.removeItem(this.storageKey);
  }
}