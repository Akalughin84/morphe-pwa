// /core/strengthProgress.js
// v2.4.2 — Улучшенная надёжность, поддержка RIR, защита от ошибок
import { WorkoutTracker } from '/modules/workoutTracker.js';

export class StrengthProgress {
  constructor() {
    this.tracker = new WorkoutTracker();
    this._historyCache = new Map();
  }

  /**
   * Расчёт 1ПМ с учётом RIR (приближённо)
   * RIR 0 = отказ → вес ближе к реальному 1ПМ
   * RIR ≥ 2 → вес занижен
   */
  calculateOneRepMax(weight, reps, rir = 0) {
    if (typeof weight !== 'number' || typeof reps !== 'number' || weight <= 0 || reps <= 0) {
      return null;
    }
    // Базовая формула Epley
    let oneRM = weight * (1 + reps / 30);
    // Коррекция на RIR (примерная)
    if (rir >= 2) {
      oneRM *= (1 + rir * 0.03); // ~3% на каждый RIR
    }
    return Math.round(oneRM * 10) / 10;
  }

  getExerciseHistory(exId) {
    if (this._historyCache.has(exId)) {
      return this._historyCache.get(exId);
    }
    const all = this.tracker.getAll();
    const history = [];
    for (const session of all) {
      if (!session.exercises || !Array.isArray(session.exercises)) continue;
      const ex = session.exercises.find(e => e.id === exId);
      if (ex && typeof ex.weight === 'number' && typeof ex.reps === 'number' && ex.weight > 0 && ex.reps > 0) {
        const oneRM = this.calculateOneRepMax(ex.weight, ex.reps, ex.rir);
        if (oneRM !== null) {
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
    // Сортировка по дате (от старых к новым)
    const sorted = history.sort((a, b) => new Date(a.date) - new Date(b.date));
    this._historyCache.set(exId, sorted);
    return sorted;
  }

  predictFutureOneRM(history, weeksAhead = 4) {
    if (!Array.isArray(history) || history.length < 2) return null;
    // Фильтрация валидных записей
    const validHistory = history.filter(h => 
      h.oneRM != null && 
      !isNaN(new Date(h.date).getTime())
    );
    if (validHistory.length < 2) return null;
    const n = validHistory.length;
    const dates = validHistory.map(h => new Date(h.date).getTime());
    const minDate = dates[0];
    const days = dates.map(t => (t - minDate) / (1000 * 60 * 60 * 24));
    const weights = validHistory.map(h => h.oneRM);
    const sumX = days.reduce((a, b) => a + b, 0);
    const sumY = weights.reduce((a, b) => a + b, 0);
    const sumXY = days.reduce((sum, x, i) => sum + x * weights[i], 0);
    const sumX2 = days.reduce((a, b) => a + b * b, 0);
    const denominator = n * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 1e-10) return null; // избегаем деления на ноль
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    const futureDay = days[days.length - 1] + weeksAhead * 7;
    const predicted = intercept + slope * futureDay;
    return {
      current: weights[weights.length - 1],
      predicted: Math.max(0, Math.round(predicted * 10) / 10),
      trend: slope > 0.05 ? 'рост' : slope < -0.05 ? 'спад' : 'стабильность'
    };
  }

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

  getExerciseInsight(exId, currentWeight, currentReps) {
    const history = this.getExerciseHistory(exId);
    if (history.length === 0) {
      return "Начните выполнять это упражнение — скоро появится прогресс.";
    }
    const last = history[history.length - 1];
    const rmEstimate = this.calculateOneRepMax(currentWeight, currentReps, last.rir);
    return `
      Последний раз: ${last.weight} кг × ${last.reps}, RIR ${last.rir}
      Ваш текущий 1ПМ: ~${rmEstimate} кг
      ${this.checkDoubleProgression(exId, last).ready 
        ? '✅ Готовы к увеличению веса!' 
        : 'Продолжайте в том же темпе.'
      }
    `.trim();
  }

  /**
   * Очистка кэша (для тестов или после обновления тренировок)
   */
  clearCache() {
    this._historyCache.clear();
  }
}