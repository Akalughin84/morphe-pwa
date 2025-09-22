// /core/strengthGoalTracker.js
// v1.2.0 — Трекер целей по силе

import { StorageManager } from '/utils/storage.js';
import { DateUtils } from '/utils/dateUtils.js';

/**
 * StrengthGoalTracker — управляет целями пользователя:
 * - Максимальный вес (1ПМ)
 * - Количество повторений
 * - Прогресс по времени
 */
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

  /**
   * Добавить новую цель
   * @param {Object} goal { exerciseId, targetValue, unit, startDate, notes }
   */
  add(goal) {
    const record = {
      id: Date.now(),
      exerciseId: goal.exerciseId,
      exerciseName: goal.exerciseName,
      currentValue: goal.currentValue || 0,
      targetValue: goal.targetValue,
      unit: goal.unit, // "kg", "reps", "time"
      startDate: goal.startDate || DateUtils.today(),
      targetDate: goal.targetDate || null,
      status: 'active', // active, completed, failed, paused
      history: [],
      notes: goal.notes || '',
      createdAt: new Date().toISOString()
    };

    this.goals.push(record);
    this.save();
    return record;
  }

  /**
   * Обновить текущее значение
   */
  updateProgress(goalId, newValue, date = DateUtils.today()) {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal || newValue < goal.currentValue) {
      throw new Error("Новое значение должно быть больше предыдущего");
    }

    goal.currentValue = newValue;
    goal.history.push({ date, value: newValue });

    // Проверка на достижение
    if (newValue >= goal.targetValue && goal.status === 'active') {
      goal.status = 'completed';
      goal.completedAt = new Date().toISOString();
    }

    this.save();
    return goal;
  }

  /**
   * Получить все цели
   */
  getAll() {
    return [...this.goals];
  }

  /**
   * Активные цели
   */
  getActive() {
    return this.goals.filter(g => g.status === 'active');
  }

  /**
   * Завершённые
   */
  getCompleted() {
    return this.goals.filter(g => g.status === 'completed');
  }

  /**
   * Прогресс в процентах
   */
  getProgressPercent(goal) {
    if (goal.unit === 'time' && goal.targetValue > 0) {
      // Для времени: чем меньше, тем лучше
      return Math.min(100, (1 - goal.currentValue / goal.targetValue) * 100);
    }
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  }

  /**
   * Оценка темпа прогресса
   */
  getProgressRate(goal) {
    if (goal.history.length < 2) return 'slow';

    const first = goal.history[0];
    const last = goal.history[goal.history.length - 1];
    const days = DateUtils.diffInDays(first.date, last.date);
    const progressPerDay = (last.value - first.value) / days;

    if (progressPerDay <= 0) return 'stalled';
    if (progressPerDay * 7 > 2) return 'fast';
    return 'steady';
  }

  /**
   * Прогноз завершения
   */
  getCompletionForecast(goal) {
    const progressPerDay = this._getDailyProgress(goal);
    if (progressPerDay <= 0) return null;

    const remaining = goal.targetValue - goal.currentValue;
    const days = Math.ceil(remaining / progressPerDay);

    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + days);

    return {
      days,
      date: forecastDate.toISOString().split('T')[0],
      met: false
    };
  }

  _getDailyProgress(goal) {
    if (goal.history.length < 2) return 0;
    const first = goal.history[0];
    const last = goal.history[goal.history.length - 1];
    const days = DateUtils.diffInDays(first.date, last.date);
    return days > 0 ? (last.value - first.value) / days : 0;
  }

  /**
   * Получить цель по ID
   */
  findById(id) {
    return this.goals.find(g => g.id === id);
  }

  /**
   * Очистка (для тестов)
   */
  clear() {
    this.goals = [];
    StorageManager.removeItem(this.storageKey);
  }
}