// /core/workoutSession.js
// v2.2.1 — Улучшенная надёжность и интеграция с WorkoutTracker

import { StorageManager } from '/utils/storage.js';
import { DateUtils } from '/utils/dateUtils.js';

export class WorkoutSession {
  constructor(plan = null) {
    this.sessionId = this._generateId();
    this.date = DateUtils.today();
    this.plan = plan || { exercises: [] };
    this.exercises = Array.isArray(this.plan.exercises)
      ? this.plan.exercises.map(ex => ({
          id: String(ex.id || 'unknown'),
          name: String(ex.name || 'Упражнение'),
          sets: typeof ex.sets === 'number' ? ex.sets : 3,
          reps: String(ex.reps || '8–12'),
          weight: null,
          rir: null,
          rest: typeof ex.rest === 'number' ? ex.rest : 90,
          notes: '',
          completed: false
        }))
      : [];
    this.rpe = null;
    this.doms = null; // 1–10
    this.notes = '';
    this.completedAt = null;
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  save() {
    const key = `morphe-session-${this.date}`;
    StorageManager.setItem(key, this);
    return this;
  }

  static load(date = DateUtils.today()) {
    const key = `morphe-session-${date}`;
    return StorageManager.getItem(key);
  }

  complete() {
    this.completedAt = new Date().toISOString();
    this.save();
  }

  updateExercise(id, data) {
    const ex = this.exercises.find(e => e.id === id);
    if (ex && data) {
      // Защита от некорректных значений
      if (data.weight != null) ex.weight = typeof data.weight === 'number' ? data.weight : null;
      if (data.rir != null) ex.rir = typeof data.rir === 'number' ? Math.max(0, Math.min(10, data.rir)) : null;
      if (data.notes != null) ex.notes = String(data.notes);
      if (data.completed != null) ex.completed = Boolean(data.completed);
      
      this.save();
    }
  }

  /**
   * Экспорт в формат, совместимый с WorkoutTracker
   */
  toWorkoutTrackerFormat() {
    return {
      date: new Date().toISOString(),
      programId: this.plan.id || 'custom',
      programName: this.plan.name || 'Сессия без программы',
      rpe: this.rpe,
      doms: this.doms,
      notes: this.notes,
      exercises: this.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        weight: ex.weight,
        reps: ex.reps,
        rir: ex.rir,
        notes: ex.notes
      })),
      durationMinutes: Math.round(this.exercises.length * 5)
    };
  }
}