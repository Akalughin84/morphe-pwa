// /core/workoutPlanner.js
// v3.1.1 — Исправлено: ротация, volumeMultiplier, безопасность, структура

import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';
import { DataService } from '/services/dataService.js';
import { ExerciseRecommender } from './exerciseRecommender.js';
import { WorkoutBalancer } from './workoutBalancer.js';

export class WorkoutPlanner {
  constructor() {
    this.storageKey = 'morphe-current-plan';
    this.user = null;
    this.history = new WorkoutTracker();
    this.progress = new ProgressTracker();
    this.exercises = [];
    this.recommender = new ExerciseRecommender();
    this.balancer = new WorkoutBalancer();
  }

  async init() {
    const profile = UserService.getProfile();
    if (!profile || !profile.data) {
      throw new Error("Профиль не заполнен или повреждён");
    }
    this.user = profile.data;
    this.exercises = await DataService.getExercises();
    await this.recommender.loadAll();
    await this.balancer.init();
    return this;
  }

  getCurrent() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse workout plan from localStorage", e);
      return null;
    }
  }

  save(plan) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(plan));
    } catch (e) {
      console.error("Failed to save workout plan", e);
    }
  }

  /**
   * Генерирует УНИКАЛЬНУЮ тренировку на лету
   */
  async generateUniqueSession(focus = 'full', dayOfWeek = 0, context = {}) {
    const { rpe = 7, doms = 1, mood = 'normal' } = context;

    // Фильтрация по оборудованию
    const availableExercises = this.exercises.filter(ex =>
      (this.user.equipment || []).includes(ex.equipment)
    );

    // Адаптация под самочувствие
    const intensityMultiplier = doms >= 4 ? 0.7 : mood === 'tired' ? 0.8 : 1.0;
    const volumeMultiplier = doms >= 4 ? 0.6 : mood === 'energetic' ? 1.2 : 1.0;

    // Выбор упражнений по фокусу
    const targetTypes = this._getFocusTypes(focus);
    const basePool = availableExercises.filter(ex =>
      targetTypes.includes(ex.type) && this._isLevelAppropriate(ex.level)
    );

    // Ротация через детерминированный хеш
    const rotatedPool = this._rotateExercises(basePool, dayOfWeek);

    // Берём 4–6 упражнений
    let selectedExercises = rotatedPool.slice(0, 4 + (dayOfWeek % 3));

    // Применяем альтернативы каждому второму упражнению
    selectedExercises = this._applyAlternatives(selectedExercises, dayOfWeek);

    // Генерируем параметры для каждого упражнения
    const workoutExercises = selectedExercises.map((ex, index) =>
      this._generateExerciseParams(ex, index, dayOfWeek, rpe, intensityMultiplier, volumeMultiplier)
    );

    // Анализ баланса
    const analysis = this.balancer.classifyWorkout(workoutExercises);
    const advice = this.balancer.getBalanceAdvice(analysis);

    // Создание сессии
    const session = {
      id: `session-${Date.now()}`,
      name: this._generateSessionName(focus, dayOfWeek, mood),
      focus,
      date: new Date().toISOString().split('T')[0],
      exercises: workoutExercises,
      analysis,
      advice,
      context: { rpe, doms, mood, intensityMultiplier, volumeMultiplier },
      generatedAt: new Date().toISOString()
    };
    // ✅ Защита: убедимся, что есть упражнения
    if (!session.exercises || session.exercises.length === 0) {
      console.warn('⚠️ Сгенерирована пустая сессия — используем fallback');
      session.exercises = [
        { id: 'squat-barbell', name: 'Приседания', sets: 3, reps: 8, rest: 90, technique: 'standard' },
        { id: 'bench-press', name: 'Жим лёжа', sets: 3, reps: 8, rest: 90, technique: 'standard' }
      ];
    }

    return session;
  }

  /**
   * Получить типы упражнений по фокусу
   */
  _getFocusTypes(focus) {
    const map = {
      push: ['chest', 'shoulders'],
      pull: ['back', 'arms'],
      legs: ['legs'],
      core: ['core'],
      full: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']
    };
    return map[focus] || map.full;
  }

  /**
   * Детерминированная ротация упражнений
   */
  _rotateExercises(pool, seed) {
    const hash = (str, seed) => {
      let h = seed;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
      }
      return Math.abs(h);
    };

    return [...pool]
      .map(ex => ({ ex, key: hash(ex.id, seed) }))
      .sort((a, b) => a.key - b.key)
      .map(item => item.ex);
  }

  /**
   * Заменить каждое второе упражнение на альтернативу
   */
  _applyAlternatives(exercises, daySeed) {
    return exercises.map((ex, index) => {
      if (index % 2 === 1) {
        const alternatives = this.recommender.getAlternatives(ex, 3, 'equipment');
        return alternatives.length > 0 ? alternatives[daySeed % alternatives.length] : ex;
      }
      return ex;
    });
  }

  /**
   * Генерация параметров упражнения с вариативностью
   */
  _generateExerciseParams(ex, index, dayOfWeek, rpe, intensityMult, volumeMult) {
    const baseSets = this._getBaseSets(ex.type);
    const baseReps = this._getBaseReps(ex.primaryMuscles[0]);
    const baseRIR = this._getBaseRIR(rpe);

    const variationSeed = (dayOfWeek + ex.id.length + index) % 5;

    let sets, reps, tempo, rest, technique;

    switch (variationSeed) {
      case 0: // Wave Loading
        sets = Math.max(1, Math.round(baseSets * volumeMult));
        reps = `${baseReps - 2}–${baseReps}`;
        tempo = ex.scientificBasis?.tempo || "3-1-1";
        rest = Math.round((ex.scientificBasis?.rest || 90) * intensityMult);
        technique = "wave";
        break;
      case 1: // Drop Set
        sets = Math.max(1, Math.round((baseSets - 1) * volumeMult));
        reps = `${baseReps}+`;
        tempo = "2-1-1";
        rest = 60;
        technique = "drop-set";
        break;
      case 2: // Rest-Pause
        sets = 1;
        reps = `MAX × 3`;
        tempo = "1-0-1";
        rest = 20;
        technique = "rest-pause";
        break;
      case 3: // Cluster
        sets = Math.max(1, Math.round(baseSets * volumeMult));
        reps = `${Math.floor(baseReps / 2)} × 2`;
        tempo = "1-5-1";
        rest = 15;
        technique = "cluster";
        break;
      default: // Стандарт
        sets = Math.max(1, Math.round(baseSets * volumeMult));
        reps = baseReps;
        tempo = ex.scientificBasis?.tempo || "3-1-1";
        rest = Math.round((ex.scientificBasis?.rest || 90) * intensityMult);
        technique = "standard";
    }

    return {
      id: ex.id,
      name: ex.name,
      type: ex.type,
      equipment: ex.equipment,
      sets,
      reps,
      tempo,
      rest,
      technique,
      rir: baseRIR,
      scientificBasis: ex.scientificBasis
    };
  }

  /**
   * Генерация имени сессии
   */
  _generateSessionName(focus, dayOfWeek, mood) {
    const focusNames = {
      push: "Жимовой день",
      pull: "Тяговый день",
      legs: "Ноги",
      core: "Ядро",
      full: "Фулбоди"
    };

    const moodNames = {
      tired: "Восстановительная",
      normal: "Стандартная",
      energetic: "Энергетическая"
    };

    const dayNames = ["Альфа", "Бета", "Гамма", "Дельта", "Эпсилон", "Зета", "Эта"];

    return `${focusNames[focus]} ${dayNames[dayOfWeek % 7]} (${moodNames[mood]})`;
  }

  /**
   * Базовое количество подходов
   */
  _getBaseSets(exerciseType) {
    const map = { legs: 3, back: 3, chest: 3, shoulders: 4, arms: 3, core: 3 };
    return map[exerciseType] || 3;
  }

  /**
   * Базовое количество повторений
   */
  _getBaseReps(muscleGroup) {
    const map = {
      quadriceps: 8, glutes: 8, hamstrings: 8,
      pectorals: 8, lats: 8, deltoids: 12,
      biceps: 10, triceps: 10, core: 15
    };
    return map[muscleGroup] || 10;
  }

  /**
   * RIR на основе RPE
   */
  _getBaseRIR(rpe) {
    return rpe >= 9 ? 0 : rpe >= 8 ? 1 : rpe >= 7 ? 2 : 3;
  }

  /**
   * Проверка уровня сложности
   */
  _isLevelAppropriate(exLevel) {
    const allowed = {
      beginner: ['beginner'],
      intermediate: ['beginner', 'intermediate'],
      advanced: ['beginner', 'intermediate', 'advanced']
    };
    return allowed[this.user.level]?.includes(exLevel);
  }

  /**
   * Генерация недельной программы
   */
  async generateWeeklyProgram() {
    const daysPerWeek = this.user.daysPerWeek || 3;
    const rotation = ['push', 'pull', 'legs', 'full', 'core', 'push', 'pull'];
    const program = {
      id: `program-${Date.now()}`,
      name: `Персональная программа ${new Date().toLocaleDateString('ru-RU')}`,
      goal: this.user.goal,
      level: this.user.level,
      daysPerWeek,
      schedule: [],
      generatedAt: new Date().toISOString()
    };

    for (let i = 0; i < daysPerWeek; i++) {
      const dayIndex = i % 7;
      const focus = rotation[dayIndex];
      const session = await this.generateUniqueSession(focus, dayIndex, { rpe: 7, doms: 1, mood: 'normal' });

      program.schedule.push({
        day: `День ${i + 1}`,
        focus,
        session
      });
    }

    this.save(program);
    return program;
  }

  /**
   * Основные методы
   */
  async generate() {
    return await this.generateWeeklyProgram();
  }

  async regenerate() {
    return await this.generateWeeklyProgram();
  }

  /**
   * Плато: менее 100 г прироста в неделю
   */
  isPlateaued() {
    const recent = this.progress.getSince(21);
    if (recent.length < 3) return false;

    const changes = recent.slice(1).map((curr, i) => curr.weight - recent[i].weight);
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return Math.abs(avgChange) < 0.1;
  }

  /**
   * Рекомендация по нагрузке
   */
  _getLoadRecommendation() {
    const weeklyCount = this.history.getWeeklyCount();
    const recent = this.progress.getSince(21);

    if (weeklyCount >= 5 && this.user.level !== 'advanced') {
      return 'reduce';
    }

    if (recent.length < 3) return 'maintain';

    const first = recent[recent.length - 1];
    const last = recent[0];
    const change = last.weight - first.weight;

    if (this.user.goal === 'gain' && change < 0.3) {
      return 'increase';
    }

    if (this.user.goal === 'lose' && change > 0) {
      return 'adjust-nutrition';
    }

    return 'maintain';
  }
}