// /modules/progressCalendar.js
// v2.0.0 — Поддержка тренировок + метод для получения деталей дня

import { NutritionTracker } from '/modules/nutritionTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';

export class ProgressCalendar {
  constructor() {
    this.nutrition = new NutritionTracker();
    this.body = new ProgressTracker();
    this.workouts = new WorkoutTracker();
  }

  /**
   * Получить данные за последние 30 дней
   */
  getLast30DaysData() {
    const today = new Date();
    const dates = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
    }

    return dates.map(dateStr => ({
      date: dateStr,
      hasBody: this.hasBodyEntry(dateStr),
      hasNutrition: this.hasNutritionEntry(dateStr),
      hasWorkout: this.hasWorkoutEntry(dateStr)
    }));
  }

  /**
   * Проверить наличие замера тела
   */
  hasBodyEntry(dateStr) {
    return this.body.data.some(entry => entry.date === dateStr);
  }

  /**
   * Проверить наличие питания
   */
  hasNutritionEntry(dateStr) {
    return this.nutrition.entries.some(entry => entry.date === dateStr);
  }

  /**
   * Проверить наличие тренировки
   */
  hasWorkoutEntry(dateStr) {
    return this.workouts.hasWorkoutOnDate(dateStr);
  }

  /**
   * Получить все данные за конкретную дату
   */
  getDayDetails(dateStr) {
    const bodyEntries = this.body.data.filter(entry => entry.date === dateStr);
    const nutritionEntries = this.nutrition.entries.filter(entry => entry.date === dateStr);
    const workoutEntries = this.workouts.getWorkoutsByDate(dateStr);

    return {
      date: dateStr,
      body: bodyEntries,
      nutrition: nutritionEntries,
      workouts: workoutEntries
    };
  }
}