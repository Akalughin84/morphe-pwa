// /core/workoutBalancer.js
// v1.0.0 — Анализ баланса Push/Pull/Legs

import { DataService } from '/services/dataService.js';

export class WorkoutBalancer {
  constructor() {
    this.exercises = [];
  }

  async init() {
    this.exercises = await DataService.getExercises();
    return this;
  }

  /**
   * Классифицировать упражнение по типу движения
   */
  classifyExercise(exercise) {
    if (!exercise) return 'other';

    const pushKeywords = ['press', 'push', 'extension', 'fly', 'dip'];
    const pullKeywords = ['row', 'pull', 'curl', 'chin', 'lat'];
    const legKeywords = ['squat', 'deadlift', 'lunge', 'leg', 'calf', 'hip'];

    const name = (exercise.name || '').toLowerCase();
    const type = (exercise.type || '').toLowerCase();
    const primary = (exercise.primaryMuscles || []).join(' ').toLowerCase();

    const text = `${name} ${type} ${primary}`;

    if (legKeywords.some(kw => text.includes(kw))) return 'legs';
    if (pushKeywords.some(kw => text.includes(kw))) return 'push';
    if (pullKeywords.some(kw => text.includes(kw))) return 'pull';

    return 'other';
  }

  /**
   * Проанализировать баланс тренировки
   */
  classifyWorkout(exercises) {
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return {
        type: 'empty',
        ratio: { push: 0, pull: 0, legs: 0 },
        counts: { push: 0, pull: 0, legs: 0, other: 0 }
      };
    }

    const counts = { push: 0, pull: 0, legs: 0, other: 0 };

    exercises.forEach(ex => {
      const exerciseData = this.exercises.find(e => e.id === ex.id);
      const category = this.classifyExercise(exerciseData);
      counts[category]++;
    });

    const total = counts.push + counts.pull + counts.legs;
    const ratio = total > 0
      ? {
          push: Math.round((counts.push / total) * 100),
          pull: Math.round((counts.pull / total) * 100),
          legs: Math.round((counts.legs / total) * 100)
        }
      : { push: 0, pull: 0, legs: 0 };

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

  /**
   * Получить рекомендацию по балансу
   */
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
}