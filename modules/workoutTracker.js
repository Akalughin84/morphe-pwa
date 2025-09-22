// /modules/workoutTracker.js
// v1.2.0 — Сохраняет полные данные тренировки для интеграции с ProgressCalendar

import { StorageManager } from '/utils/storage.js';

export class WorkoutTracker {
  constructor() {
    this.storageKey = 'morphe-workout-history';
    this.history = this.load();
  }

  load() {
    return StorageManager.getItem(this.storageKey) || [];
  }

  save() {
    StorageManager.setItem(this.storageKey, this.history);
  }

  /**
   * ✅ Сохраняет ПОЛНУЮ тренировочную сессию (включая упражнения, веса, RIR)
   */
  logSession(sessionData) {
    const entry = {
      id: Date.now().toString(),
      date: sessionData.date.split('T')[0], // YYYY-MM-DD
      timestamp: new Date(sessionData.date).getTime(),
      programId: sessionData.programId,
      programName: sessionData.programName,
      rpe: sessionData.rpe || null,
      doms: sessionData.doms || null,
      exercises: sessionData.exercises || [], // ← ВАЖНО: сохраняем упражнения
      durationMinutes: sessionData.exercises?.length * 5 || 30, // примерная оценка
      notes: ""
    };

    this.history.push(entry);
    this.history.sort((a, b) => b.timestamp - a.timestamp);
    this.save();

    StorageManager.setItem('morphe-last-workout', {
      workoutName: sessionData.programName,
      timestamp: entry.timestamp
    });

    return entry;
  }

  /**
   * Устаревший метод (для обратной совместимости)
   */
  log(workoutName, programId) {
    return this.logSession({
      date: new Date().toISOString(),
      programName: workoutName,
      programId: programId,
      exercises: []
    });
  }

  /**
   * Получить все тренировки
   */
  getAll() {
    return this.history;
  }

  /**
   * Получить за последнюю неделю
   */
  getLastWeek() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.history.filter(t => t.timestamp >= weekAgo);
  }

  /**
   * Количество тренировок за неделю
   */
  getWeeklyCount() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.history.filter(t => t.timestamp >= weekAgo).length;
  }

  /**
   * Последняя тренировка
   */
  getLast() {
    return this.history[0] || null;
  }

  /**
   * Проверить, была ли тренировка в указанную дату
   */
  hasWorkoutOnDate(dateStr) {
    return this.history.some(workout => workout.date === dateStr);
  }

  /**
   * Получить тренировки за указанную дату
   */
  getWorkoutsByDate(dateStr) {
    return this.history.filter(workout => workout.date === dateStr);
  }

  /**
   * Очистка (для тестов)
   */
  clear() {
    this.history = [];
    StorageManager.removeItem(this.storageKey);
    StorageManager.removeItem('morphe-last-workout');
  }
}