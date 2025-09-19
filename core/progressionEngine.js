// core/progressionEngine.js

export class ProgressionEngine {
  constructor(profile, history) {
    this.profile = profile;
    this.history = history;
  }

  // Основной метод — анализ последнего выполнения упражнения
  suggest(exerciseId, exerciseName = '') {
    const performance = this.getLastPerformance(exerciseId);
    if (!performance) return this.defaultSuggestion();

    const { avgReps, avgRPE, lastWeight } = performance;

    // Правила прогрессии
    if (avgRPE <= 7 && avgReps >= 12) {
      return {
        action: 'increase_weight',
        delta: this.getRecommendedIncrease(exerciseName),
        advice: `Вы отлично справились: ${avgReps} повторов при RPE ${avgRPE}. Можно увеличить вес.`
      };
    }

    if (avgRPE <= 8 && avgReps >= 10) {
      return {
        action: 'increase_weight',
        delta: this.getRecommendedIncrease(exerciseName) / 2,
        advice: `Хорошее выполнение. Небольшое увеличение веса поможет расти.`
      };
    }

    if (avgRPE > 9 || avgReps < 6) {
      return {
        action: 'maintain_weight',
        delta: 0,
        advice: `Последний подход был тяжёлым (RPE ${Math.round(avgRPE)}). Лучше остаться на этом весе и набрать объём.`
      };
    }

    return {
      action: 'continue',
      delta: 0,
      advice: `Продолжайте в том же темпе. Вес подобран верно.`
    };
  }

  // Получаем последние данные по упражнению
  getLastPerformance(exerciseId) {
    const tracker = this.history?.workoutTracker || this.history || [];
    const arr = Array.isArray(tracker) ? tracker : [];

    for (let i = arr.length - 1; i >= 0; i--) {
      const workout = arr[i];
      for (const day of workout.program || []) {
        for (const ex of day.exercises || []) {
          if (ex.id === exerciseId && ex.completedSets?.length > 0) {
            const reps = ex.completedSets.map(s => s.reps);
            const weights = ex.completedSets.map(s => s.weight);
            const rpes = ex.completedSets.map(s => s.rpe).filter(r => r);

            const avgReps = reps.reduce((a, b) => a + b, 0) / reps.length;
            const avgRPE = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 8;
            const lastWeight = Math.max(...weights);

            return { avgReps, avgRPE, lastWeight };
          }
        }
      }
    }
    return null;
  }

  // Рекомендованное увеличение в зависимости от упражнения
  getRecommendedIncrease(exerciseName) {
    const lowerBody = ['присед', 'жим ногами', 'становая'];
    const push = ['жим', 'отжимания', 'армейский'];

    if (lowerBody.some(k => exerciseName.toLowerCase().includes(k))) return 2.0;
    if (push.some(k => exerciseName.toLowerCase().includes(k))) return 1.5;
    return 1.0;
  }

  // Стандартный совет, если нет данных
  defaultSuggestion() {
    return {
      action: 'unknown',
      delta: 0,
      advice: 'Нет данных для анализа. Выполни упражнение, чтобы получить персональные рекомендации.'
    };
  }

  // Прогноз достижения силовой цели
  forecastStrengthGoal(currentWeight, targetWeight, weeklyGain) {
    if (weeklyGain <= 0) return { weeks: Infinity, achievable: false };

    const diff = targetWeight - currentWeight;
    const weeks = Math.ceil(diff / weeklyGain);

    return {
      weeks,
      achievable: weeks <= 52, // реалистично за год
      date: this.addWeeks(new Date(), weeks)
    };
  }

  addWeeks(date, weeks) {
    const result = new Date(date);
    result.setDate(result.getDate() + weeks * 7);
    return result.toISOString().split('T')[0];
  }
}