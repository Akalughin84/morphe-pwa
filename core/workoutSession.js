// /core/workoutSession.js
// v2.2.0 — Логика одной тренировочной сессии

import { StorageManager } from '/utils/storage.js';
import { DateUtils } from '/utils/dateUtils.js';

export class WorkoutSession {
  constructor(plan) {
    this.sessionId = Date.now();
    this.date = DateUtils.today();
    this.plan = plan;
    this.exercises = plan.exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      sets: ex.sets || 3,
      reps: ex.reps || '8–12',
      weight: null,
      rir: null,
      rest: ex.rest || 90,
      notes: '',
      completed: false
    }));
    this.rpe = null;
    this.doms = null; // 1–10
    this.notes = '';
    this.completedAt = null;
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
    if (ex) {
      Object.assign(ex, data);
      this.save();
    }
  }
}