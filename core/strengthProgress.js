// /core/strengthProgress.js
// v2.4.1 — Анализ прогресса по силе и прогноз 1ПМ (исправлено: защита от undefined)

import { WorkoutTracker } from '/modules/workoutTracker.js';
import { StorageManager } from '/utils/storage.js';

/**
 * StrengthProgress — анализирует прогресс по силе
 * На основе истории тренировок
 */
export class StrengthProgress {
  constructor() {
    this.tracker = new WorkoutTracker();
  }

  /**
   * Прогноз 1ПМ по формуле Epley
   * 1RM = weight * (1 + reps / 30)
   */
  calculateOneRepMax(weight, reps) {
    if (typeof weight !== 'number' || typeof reps !== 'number' || weight <= 0 || reps <= 0) {
      return null;
    }
    return Math.round((weight * (1 + reps / 30)) * 10) / 10;
  }

  /**
   * Получить историю для упражнения
   */
  getExerciseHistory(exId) {
    const all = this.tracker.getAll();
    const history = [];

    for (const session of all) {
      // ✅ Защита: если exercises отсутствует или не массив — пропускаем
      if (!session.exercises || !Array.isArray(session.exercises)) {
        continue;
      }

      const ex = session.exercises.find(e => e.id === exId);
      if (ex && ex.weight && ex.reps) {
        const oneRM = this.calculateOneRepMax(ex.weight, ex.reps);
        if (oneRM !== null) { // ✅ Дополнительная проверка
          history.push({
            date: session.date,
            weight: ex.weight,
            reps: ex.reps,
            rir: ex.rir || 0,
            oneRM
          });
        }
      }
    }

    // Сортировка по дате
    return history.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Прогноз будущего 1ПМ (линейная регрессия)
   */
  predictFutureOneRM(history, weeksAhead = 4) {
    if (!Array.isArray(history) || history.length < 2) return null;

    const n = history.length;
    const dates = history.map(h => new Date(h.date).getTime());
    const minDate = dates[0];
    const days = dates.map(t => (t - minDate) / (1000 * 60 * 60 * 24));

    const weights = history.map(h => h.oneRM);

    // Линейная регрессия: y = a + bx
    const sumX = days.reduce((a, b) => a + b, 0);
    const sumY = weights.reduce((a, b) => a + b, 0);
    const sumXY = days.reduce((sum, x, i) => sum + x * weights[i], 0);
    const sumX2 = days.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Прогноз через N недель
    const futureDay = days[days.length - 1] + weeksAhead * 7;
    const predicted = intercept + slope * futureDay;

    return {
      current: weights[weights.length - 1],
      predicted: Math.max(0, Math.round(predicted * 10) / 10),
      trend: slope > 0 ? 'рост' : slope < 0 ? 'спад' : 'стабильность'
    };
  }

  /**
   * Проверка на Double Progression
   * Если сделал все подходы с RIR ≥ 2 — можно увеличить вес
   */
  checkDoubleProgression(exId, recentSession) {
    const history = this.getExerciseHistory(exId);
    if (history.length === 0) return { ready: false };

    const last = history[history.length - 1];
    const isRecentSuccess = recentSession?.rir != null && recentSession.rir >= 2;

    if (isRecentSuccess && last.reps >= 8) {
      return {
        ready: true,
        advice: `Вы успешно выполнили ${last.reps} повторений с RIR ≥ 2. Можно увеличить вес.`
      };
    }

    return { ready: false };
  }

  /**
   * Получить совет по упражнению
   */
  getExerciseInsight(exId, currentWeight, currentReps) {
    const history = this.getExerciseHistory(exId);
    if (history.length === 0) {
      return "Начните выполнять это упражнение — скоро появится прогресс.";
    }

    const last = history[history.length - 1];
    const rmEstimate = this.calculateOneRepMax(currentWeight, currentReps);

    return `
      Последний раз: ${last.weight} кг × ${last.reps}, RIR ${last.rir}
      Ваш текущий 1ПМ: ~${rmEstimate} кг
      ${this.checkDoubleProgression(exId, last).ready 
        ? '✅ Готовы к увеличению веса!' 
        : 'Продолжайте в том же темпе.'
      }
    `.trim();
  }
}