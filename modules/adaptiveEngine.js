// /modules/adaptiveEngine.js
// v0.7.0 — Анализ состояния пользователя

import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';
import { StorageManager } from '/utils/storage.js';

/**
 * AdaptiveEngine — анализирует состояние пользователя
 * Выводит: уровень усталости, готовности, риска травмы, прогресса
 */
export class AdaptiveEngine {
  constructor() {
    this.workouts = new WorkoutTracker();
    this.progress = new ProgressTracker();
    this.profile = null;
  }

  /**
   * Загружает профиль
   */
  async loadProfile() {
    const user = new (await import('../modules/profile.js')).MorpheProfile();
    this.profile = user.isComplete() ? user.data : null;
    return this.profile;
  }

  /**
   * Уровень усталости (0–10)
   */
  getFatigueLevel() {
    const last = this.workouts.getLast();
    if (!last) return 3; // низкая усталость

    const daysSinceLast = (Date.now() - last.timestamp) / (1000 * 60 * 60 * 24);

    // Если тренировались вчера — усталость средняя
    if (daysSinceLast < 1) return 6;

    // Если давно не тренировались — усталость низкая, но мотивация может быть под вопросом
    if (daysSinceLast > 5) return 2;

    return 4;
  }

  /**
   * Темп прогресса по весу
   */
  getWeightTrend() {
    const recent = this.progress.getSince(21); // за 3 недели
    if (recent.length < 2) return 'neutral';

    const first = recent[recent.length - 1];
    const last = recent[0];
    const changePerWeek = (last.weight - first.weight) / (recent.length / 7);

    if (this.profile?.goal === 'lose') {
      return changePerWeek < -0.3 ? 'good' : changePerWeek > 0 ? 'bad' : 'slow';
    } else if (this.profile?.goal === 'gain') {
      return changePerWeek > 0.3 ? 'good' : changePerWeek < 0 ? 'bad' : 'slow';
    }
    return 'neutral';
  }

  /**
   * Прогресс по тренировкам (частота)
   */
  getWorkoutConsistency() {
    const weekly = this.workouts.getWeeklyCount();
    const goal = this.profile?.goal || 'maintain';

    if (goal === 'gain' && weekly >= 3) return 'good';
    if (goal === 'lose' && weekly >= 2) return 'good';
    if (weekly === 0) return 'bad';
    return 'slow';
  }

  /**
   * Общий уровень готовности к нагрузке (0–10)
   */
  getReadinessScore() {
    let score = 7; // база

    const fatigue = this.getFatigueLevel();
    const weightTrend = this.getWeightTrend();
    const consistency = this.getWorkoutConsistency();

    // Корректировка по усталости
    if (fatigue > 6) score -= 2;
    if (fatigue < 3) score += 1;

    // По прогрессу
    if (weightTrend === 'bad') score -= 1;
    if (weightTrend === 'good') score += 1;

    // По консистентности
    if (consistency === 'bad') score -= 2;
    if (consistency === 'good') score += 1;

    return Math.max(1, Math.min(10, Math.round(score)));
  }

  /**
   * Рекомендация по нагрузке
   */
  getLoadRecommendation() {
    const score = this.getReadinessScore();

    if (score >= 8) return 'increase';   // можно увеличить нагрузку
    if (score >= 5) return 'maintain';   // сохранять текущую
    return 'reduce';                      // снизить нагрузку
  }

  /**
   * Совет для пользователя
   */
  getAdaptiveAdvice() {
    const rec = this.getLoadRecommendation();

    const adviceMap = {
      increase: "Вы в отличной форме! Время увеличить нагрузку и двигаться дальше.",
      maintain: "Сохраняйте текущий темп — вы на правильном пути.",
      reduce: "Ваше тело просит отдыха. Снизьте интенсивность, восстановитесь."
    };

    return adviceMap[rec] || adviceMap.maintain;
  }
}