// core/workoutPlanner.js

import { AdaptiveEngine } from './adaptiveEngine.js';

export class WorkoutPlanner {
  constructor(profile, history = {}) {
    this.profile = profile;
    this.history = history;
    this.engine = new AdaptiveEngine(profile, history);
    this.exercises = this.loadExercises();
  }

  loadExercises() {
    // Можно загружать из /data/exercises.json
    return [
      // Push
      { id: 'push_up', name: 'Отжимания', type: 'push', equipment: [], primary: 'chest' },
      { id: 'db_bench_press', name: 'Жим гантелей лёжа', type: 'push', equipment: ['dumbbells', 'bench'], primary: 'chest' },
      { id: 'overhead_press', name: 'Жим стоя', type: 'push', equipment: ['dumbbells'], primary: 'shoulders' },
      
      // Pull
      { id: 'row_incline', name: 'Тяга гантели в наклоне', type: 'pull', equipment: ['dumbbells'], primary: 'back' },
      { id: 'lat_pulldown', name: 'Тяга блока к поясу', type: 'pull', equipment: ['machine'], primary: 'back' },
      { id: 'face_pull', name: 'Фейспаллы', type: 'pull', equipment: ['cable'], primary: 'rear_delts' },

      // Legs
      { id: 'goblet_squat', name: 'Приседания с гантелью', type: 'legs', equipment: ['dumbbells'], primary: 'quads' },
      { id: 'split_squat', name: 'Выпады', type: 'legs', equipment: ['dumbbells'], primary: 'quads' },
      { id: 'hamstring_curl', name: 'Сгибание ног', type: 'legs', equipment: ['machine'], primary: 'hamstrings' },

      // Core
      { id: 'plank', name: 'Планка', type: 'core', equipment: [], primary: 'core' }
    ];
  }

  // Основной метод — создание программы
  plan() {
    const state = this.engine.analyze();
    const recommendation = this.engine.getRecommendation();

    console.log('🎯 Рекомендация:', recommendation);

    switch (recommendation) {
      case 'deload':
        return this.generateDeloadProgram();
      case 'modify_exercises':
        return this.generateSafeProgram();
      case 'simplify':
        return this.generateSimpleProgram();
      case 'change_stimulus':
        return this.generateNewStimulusProgram();
      default:
        return this.generateAdaptiveProgram();
    }
  }

  // === ПРОГРАММЫ ===

  generateAdaptiveProgram() {
    const priority = this.profile.priority || 'balanced';
    const goal = this.profile.goal;

    if (priority === 'time') {
      return this.generateFullBody3xWeek();
    } else if (priority === 'strength') {
      return this.generateStrengthOriented();
    } else if (priority === 'muscle') {
      return this.generateHypertrophySplit();
    } else {
      return this.generateUpperLower();
    }
  }

  // 1. Программа для тех, кто ценит время
  generateFullBody3xWeek() {
    return [
      {
        day: 1,
        type: 'fullBody',
        name: '🔥 Полное тело (быстро)',
        description: '3 упражнения, 3 подхода, минимум времени — идеально при нехватке времени',
        exercises: [
          { ...this.getExercise('goblet_squat'), sets: 3, reps: '12-15', rest: '60 сек' },
          { ...this.getExercise('db_bench_press'), sets: 3, reps: '10-12', rest: '60 сек' },
          { ...this.getExercise('row_incline'), sets: 3, reps: '12-15', rest: '60 сек' }
        ]
      },
      {
        day: 3,
        type: 'fullBody',
        name: '🔥 Полное тело (быстро)',
        description: 'Изменённый акцент: спина + кора',
        exercises: [
          { ...this.getExercise('split_squat'), sets: 3, reps: '12-15', rest: '60 сек' },
          { ...this.getExercise('lat_pulldown'), sets: 3, reps: '10-12', rest: '60 сек' },
          { ...this.getExercise('plank'), sets: 3, reps: '45 сек', rest: '30 сек' }
        ]
      }
    ];
  }

  // 2. Для роста силы
  generateStrengthOriented() {
    return [
      {
        day: 1,
        type: 'upper',
        name: '💪 Верх тела (сила)',
        description: 'Высокий вес, низкое количество повторений — фокус на прогрессии жима и тяги',
        exercises: [
          { ...this.getExercise('db_bench_press'), sets: 5, reps: '4-6', rest: '120 сек', progression: '+2 кг или +1 повт' },
          { ...this.getExercise('overhead_press'), sets: 4, reps: '6-8', rest: '90 сек', progression: '+1 повт' },
          { ...this.getExercise('row_incline'), sets: 4, reps: '8-10', rest: '75 сек' }
        ]
      },
      {
        day: 3,
        type: 'lower',
        name: '🦵 Ниж тела (сила)',
        description: 'Работа с высокой нагрузкой — фокус на приседаниях',
        exercises: [
          { ...this.getExercise('goblet_squat'), sets: 5, reps: '5-6', rest: '120 сек', progression: '+2 кг' },
          { ...this.getExercise('split_squat'), sets: 3, reps: '10-12', rest: '60 сек' },
          { ...this.getExercise('hamstring_curl'), sets: 3, reps: '12-15', rest: '60 сек' }
        ]
      }
    ];
  }

  // 3. Для роста мышечной массы
  generateHypertrophySplit() {
    return [
      {
        day: 1,
        type: 'push',
        name: '🏋️‍♂️ Грудь/Плечи/Трицепс',
        description: 'Высокий объём, средние веса — оптимально для гипертрофии',
        exercises: [
          { ...this.getExercise('db_bench_press'), sets: 4, reps: '8-12', rest: '90 сек' },
          { ...this.getExercise('overhead_press'), sets: 3, reps: '10-15', rest: '75 сек' },
          { ...this.getExercise('push_up'), sets: 3, reps: 'до отказа', rest: '60 сек' }
        ]
      },
      {
        day: 3,
        type: 'pull',
        name: '🏋️‍♀️ Спина/Бицепс',
        description: 'Акцент на растяжение и контроль',
        exercises: [
          { ...this.getExercise('lat_pulldown'), sets: 4, reps: '10-12', rest: '90 сек' },
          { ...this.getExercise('row_incline'), sets: 3, reps: '12-15', rest: '75 сек' },
          { ...this.getExercise('face_pull'), sets: 3, reps: '15-20', rest: '60 сек' }
        ]
      },
      {
        day: 5,
        type: 'legs',
        name: '🦵 Ноги + Корпус',
        description: 'Полная проработка нижней части тела',
        exercises: [
          { ...this.getExercise('goblet_squat'), sets: 4, reps: '10-15', rest: '90 сек' },
          { ...this.getExercise('split_squat'), sets: 3, reps: '12-15', rest: '75 сек' },
          { ...this.getExercise('hamstring_curl'), sets: 3, reps: '15-20', rest: '60 сек' },
          { ...this.getExercise('plank'), sets: 3, reps: '60 сек', rest: '30 сек' }
        ]
      }
    ];
  }

  // 4. Баланс: Upper/Lower
  generateUpperLower() {
    return [
      {
        day: 1,
        type: 'upper',
        name: '💪 Верх тела',
        description: 'Комплексная тренировка груди, спины, плеч',
        exercises: [
          { ...this.getExercise('db_bench_press'), sets: 4, reps: '8-12', rest: '90 сек' },
          { ...this.getExercise('row_incline'), sets: 4, reps: '10-15', rest: '75 сек' },
          { ...this.getExercise('overhead_press'), sets: 3, reps: '10-12', rest: '75 сек' }
        ]
      },
      {
        day: 3,
        type: 'lower',
        name: '🦵 Ниж тела',
        description: 'Приседания, выпады, работа с задней цепью',
        exercises: [
          { ...this.getExercise('goblet_squat'), sets: 4, reps: '10-15', rest: '90 сек' },
          { ...this.getExercise('split_squat'), sets: 3, reps: '12-15', rest: '75 сек' },
          { ...this.getExercise('hamstring_curl'), sets: 3, reps: '15-20', rest: '60 сек' }
        ]
      }
    ];
  }

  // 5. Разгрузка
  generateDeloadProgram() {
    return [
      {
        day: 1,
        type: 'upper',
        name: '🔄 Разгрузка: Верх тела',
        description: '60% от обычного веса, 2 подхода × 10–15 — восстановление без перегрузки',
        exercises: [
          { ...this.getExercise('push_up'), sets: 2, reps: '10-15', rest: '60 сек' },
          { ...this.getExercise('row_incline'), sets: 2, reps: '12-15', rest: '60 сек' },
          { ...this.getExercise('overhead_press'), sets: 2, reps: '10-12', rest: '60 сек' }
        ]
      },
      {
        day: 3,
        type: 'lower',
        name: '🔄 Разгрузка: Ниж тела',
        description: 'Лёгкие приседания и выпады — кровообращение без стресса',
        exercises: [
          { ...this.getExercise('goblet_squat'), sets: 2, reps: '12-15', rest: '60 сек' },
          { ...this.getExercise('split_squat'), sets: 2, reps: '10-12', rest: '60 сек' }
        ]
      }
    ];
  }

  // 6. Безопасная программа (при травме)
  generateSafeProgram() {
    const safeExercises = this.filterHighRisk(this.exercises);
    return [
      {
        day: 1,
        type: 'safe_upper',
        name: '🛡 Безопасные упражнения',
        warning: `Избегаем нагрузки на ${this.profile.injuries[0]}`,
        exercises: [
          { ...this.getExercise('row_incline'), sets: 3, reps: '12-15', rest: '75 сек' },
          { ...this.getExercise('face_pull'), sets: 3, reps: '15-20', rest: '60 сек' }
        ]
      }
    ];
  }

  // 7. Упрощённая программа
  generateSimpleProgram() {
    return [
      {
        day: 1,
        type: 'fullBody',
        name: '🟢 Простая тренировка',
        description: '3 упражнения, 3 подхода — чтобы не пропустить неделю',
        exercises: [
          { name: 'Приседания с гантелью', sets: 3, reps: '12-15', rest: '60 сек' },
          { name: 'Жим гантелей лёжа', sets: 3, reps: '10-12', rest: '60 сек' },
          { name: 'Тяга гантели в наклоне', sets: 3, reps: '12-15', rest: '60 сек' }
        ]
      }
    ];
  }

  // 8. Новый стимул (при плато)
  generateNewStimulusProgram() {
    return [
      {
        day: 1,
        type: 'new_stimulus',
        name: '💥 Новый стимул!',
        description: 'Замена упражнений для преодоления плато',
        exercises: [
          { name: 'Выпады с гантелей', sets: 4, reps: '10-12', rest: '75 сек', note: 'Новое упражнение!' },
          { name: 'Жим гантелей на наклонной скамье', sets: 4, reps: '8-12', rest: '90 сек', note: 'Новое упражнение!' },
          { name: 'Тяга блока к поясу', sets: 3, reps: '12-15', rest: '60 сек' }
        ]
      }
    ];
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

  getExercise(id) {
    return this.exercises.find(ex => ex.id === id) || { id, name: 'Упражнение' };
  }

  filterHighRisk(exercises) {
    const riskyNames = ['overhead_press', 'bench_press', 'deep_squats'];
    return exercises.filter(ex => !riskyNames.includes(ex.id));
  }
}