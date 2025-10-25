// /modules/workoutTracker.js
// v1.2.1 — Улучшенная надёжность, валидация и совместимость
import { StorageManager } from '/utils/storage.js';

export class WorkoutTracker {
  constructor(options = {}) {
    this.storageKey = 'morphe-workout-history';
    this.maxHistoryDays = options.maxHistoryDays || 365; // хранить до 1 года
    this.history = this.load();
    this._cleanupOldEntries();
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  _getCurrentDate() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  _cleanupOldEntries() {
    const cutoffTime = Date.now() - this.maxHistoryDays * 24 * 60 * 60 * 1000;
    const initialLength = this.history.length;
    this.history = this.history.filter(t => t.timestamp >= cutoffTime);
    if (this.history.length !== initialLength) {
      this.save();
    }
  }

  load() {
    const raw = StorageManager.getItem(this.storageKey) || [];
    // Убедимся, что все записи имеют id и date
    return raw.map(item => ({
      ...item,
      id: item.id || this._generateId(),
      date: item.date || this._getCurrentDate(),
      timestamp: item.timestamp || Date.now()
    })).sort((a, b) => b.timestamp - a.timestamp);
  }

  save() {
    StorageManager.setItem(this.storageKey, this.history);
  }

  /**
   * ✅ Сохраняет ПОЛНУЮ тренировочную сессию
   */
  logSession(sessionData) {
    if (!sessionData.programName) {
      throw new Error("programName обязателен");
    }

    // Нормализуем дату
    let dateStr, timestamp;
    if (sessionData.date) {
      const date = new Date(sessionData.date);
      if (isNaN(date.getTime())) {
        throw new Error("Некорректная дата");
      }
      dateStr = date.toISOString().split('T')[0];
      timestamp = date.getTime();
    } else {
      dateStr = this._getCurrentDate();
      timestamp = Date.now();
    }

    const entry = {
      id: this._generateId(),
      date: dateStr,
      timestamp: timestamp,
      programId: sessionData.programId || null,
      programName: String(sessionData.programName),
      rpe: sessionData.rpe != null ? Number(sessionData.rpe) : null,
      doms: sessionData.doms != null ? String(sessionData.doms) : null,
      completed: sessionData.completed !== false,
      skippedExercises: sessionData.skippedExercises || [],
      exercises: Array.isArray(sessionData.exercises) ? sessionData.exercises : [],
      durationMinutes: typeof sessionData.durationMinutes === 'number'
        ? sessionData.durationMinutes
        : Math.max(10, (sessionData.exercises?.length || 1) * 5),
      notes: String(sessionData.notes || "")
    };

    this.history.unshift(entry); // новые — в начало
    this.save();

    StorageManager.setItem('morphe-last-workout', {
      workoutName: entry.programName,
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

  getAll() {
    return [...this.history];
  }

  getLastWeek() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.history.filter(t => t.timestamp >= weekAgo);
  }

  getWeeklyCount() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.history.filter(t => t.timestamp >= weekAgo).length;
  }

  getLast() {
    return this.history[0] || null;
  }

  hasWorkoutOnDate(dateStr) {
    return this.history.some(workout => workout.date === dateStr);
  }

  getWorkoutsByDate(dateStr) {
    return this.history.filter(workout => workout.date === dateStr);
  }

  clear() {
    this.history = [];
    StorageManager.removeItem(this.storageKey);
    StorageManager.removeItem('morphe-last-workout');
  }
}