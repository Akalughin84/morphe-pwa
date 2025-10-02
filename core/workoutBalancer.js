// /core/workoutBalancer.js
// v1.0.1 — Улучшенная надёжность, поддержка тегов, кэширование

import { DataService } from '/services/dataService.js';

export class WorkoutBalancer {
  constructor() {
    this.exercises = [];
    this._classificationCache = new Map();
  }

  async init() {
    try {
      this.exercises = await DataService.getExercises();
    } catch (err) {
      console.warn('[WorkoutBalancer] Не удалось загрузить упражнения:', err);
      this.exercises = [];
    }
    return this;
  }

  /**
   * Классифицирует упражнение по тегам или ключевым словам
   */
  classifyExercise(exercise) {
    if (!exercise) return 'other';

    const id = exercise.id;
    if (this._classificationCache.has(id)) {
      return this._classificationCache.get(id);
    }

    // ✅ Приоритет: теги (надёжнее ключевых слов)
    if (Array.isArray(exercise.tags)) {
      if (exercise.tags.includes('push')) return 'push';
      if (exercise.tags.includes('pull')) return 'pull';
      if (exercise.tags.includes('legs')) return 'legs';
      if (exercise.tags.includes('cardio')) return 'cardio';
    }

    // Fallback: ключевые слова
    const pushKeywords = ['press', 'push', 'extension', 'fly', 'dip', 'жим', 'отжимание'];
    const pullKeywords = ['row', 'pull', 'curl', 'chin', 'lat', 'тяга', 'подтягивание'];
    const legKeywords = ['squat', 'deadlift', 'lunge', 'leg', 'calf', 'hip', 'присед', 'выпад', 'икра'];
    const cardioKeywords = ['бег', 'ходьба', 'прыжки', 'cardio', 'эллипс', 'беговая'];

    const name = (exercise.name || '').toLowerCase();
    const type = (exercise.type || '').toLowerCase();
    const primary = Array.isArray(exercise.primaryMuscles)
      ? exercise.primaryMuscles.join(' ').toLowerCase()
      : String(exercise.primaryMuscles || '').toLowerCase();

    const text = `${name} ${type} ${primary}`;

    let category = 'other';
    if (legKeywords.some(kw => text.includes(kw))) category = 'legs';
    else if (pushKeywords.some(kw => text.includes(kw))) category = 'push';
    else if (pullKeywords.some(kw => text.includes(kw))) category = 'pull';
    else if (cardioKeywords.some(kw => text.includes(kw))) category = 'cardio';

    this._classificationCache.set(id, category);
    return category;
  }

  classifyWorkout(exercises) {
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return {
        type: 'empty',
        ratio: { push: 0, pull: 0, legs: 0, cardio: 0 },
        counts: { push: 0, pull: 0, legs: 0, cardio: 0, other: 0 }
      };
    }

    const counts = { push: 0, pull: 0, legs: 0, cardio: 0, other: 0 };

    exercises.forEach(ex => {
      const exerciseData = this.exercises.find(e => e.id === ex.id);
      const category = this.classifyExercise(exerciseData);
      counts[category] = (counts[category] || 0) + 1;
    });

    const total = counts.push + counts.pull + counts.legs;
    const ratio = total > 0
      ? {
          push: Math.round((counts.push / total) * 100),
          pull: Math.round((counts.pull / total) * 100),
          legs: Math.round((counts.legs / total) * 100),
          cardio: Math.round((counts.cardio / total) * 100)
        }
      : { push: 0, pull: 0, legs: 0, cardio: 0 };

    let workoutType = 'balanced';
    if (counts.push > counts.pull + 2) workoutType = 'push-dominant';
    if (counts.pull > counts.push + 2) workoutType = 'pull-dominant';
    if (counts.legs > counts.push + counts.pull) workoutType = 'legs-dominant';

    return {
      type: workoutType,
      ratio,
      counts
    };
  }

  getBalanceAdvice(analysis) {
    const { type, ratio } = analysis;

    if (type === 'empty') {
      return {
        priority: 'low',
        advice: 'Добавьте упражнения для начала анализа.'
      };
    }

    if (type === 'push-dominant' && ratio.push > 60) {
      return {
        priority: 'high',
        advice: '⚠️ Слишком много жимов! Добавьте тяговые упражнения для баланса.'
      };
    }

    if (type === 'pull-dominant' && ratio.pull > 60) {
      return {
        priority: 'high',
        advice: '⚠️ Слишком много тяг! Добавьте жимовые упражнения.'
      };
    }

    if (type === 'legs-dominant' && ratio.legs > 60) {
      return {
        priority: 'medium',
        advice: '⚠️ Много ног — убедитесь, что верх тела не отстаёт.'
      };
    }

    if (ratio.push < 20 || ratio.pull < 20 || ratio.legs < 20) {
      return {
        priority: 'medium',
        advice: 'Рассмотрите добавление упражнений для слабой группы мышц.'
      };
    }

    return {
      priority: 'low',
      advice: '✅ Отличный баланс! Продолжайте в том же духе.'
    };
  }

  /**
   * Очистка кэша (для тестов или после обновления базы)
   */
  clearCache() {
    this._classificationCache.clear();
  }
}