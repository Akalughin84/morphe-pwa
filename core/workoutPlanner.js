// /core/workoutPlanner.js
// v3.3.1 — Полная поддержка готовых программ + ES Modules
import { UserService } from '/services/userService.js';
import { StorageManager } from '/utils/storage.js';
import { DataService } from '/services/dataService.js';

export class WorkoutPlanner {
  constructor() {
    this.storageKey = 'morphe-current-plan';
    this.user = null;
    this.exercises = [];
    this._recommender = null;
    this._balancer = null;
  }

  async init() {
    const profile = UserService.getProfile();
    if (!profile || !profile.data) {
      throw new Error("Профиль не заполнен или повреждён");
    }
    this.user = profile.data;
    if (this.exercises.length === 0) {
      this.exercises = await DataService.getExercises();
    }
    return this;
  }

  async getRecommender() {
    if (!this._recommender) {
      const { ExerciseRecommender } = await import('/core/exerciseRecommender.js');
      this._recommender = new ExerciseRecommender();
      await this._recommender.loadAll();
    }
    return this._recommender;
  }

  async getBalancer() {
    if (!this._balancer) {
      const { WorkoutBalancer } = await import('/core/workoutBalancer.js');
      this._balancer = new WorkoutBalancer();
      await this._balancer.init();
    }
    return this._balancer;
  }

  getCurrent() {
    return StorageManager.getItem(this.storageKey);
  }

  save(plan) {
    StorageManager.setItem(this.storageKey, plan);
  }

  // === НОВОЕ: Использовать готовую программу из programs.json ===
  async usePredefinedProgram(programId) {
    const allPrograms = await DataService.getPrograms();
    const program = allPrograms.find(p => p.id === programId);
    if (!program) throw new Error(`Программа ${programId} не найдена`);

    const schedule = program.weeklySchedule.map((dayName, i) => {
      const focus = this._extractFocusFromDayName(dayName);
      const sessionExercises = program.exercises.map(ex => {
        const fullEx = this.exercises.find(e => e.id === ex.id);
        return {
          id: ex.id,
          name: fullEx?.name || ex.id,
          type: fullEx?.type || 'unknown',
          equipment: fullEx?.equipment || 'bodyweight',
          sets: ex.sets,
          reps: ex.reps,
          rest: ex.rest || 90,
          tempo: fullEx?.scientificBasis?.tempo || '2-1-1',
          technique: 'standard',
          rir: 2,
          scientificBasis: fullEx?.scientificBasis || {}
        };
      });

      return {
        day: dayName,
        focus,
        session: {
          id: `session-${i}`,
          name: dayName,
          focus,
          exercises: sessionExercises,
          date: new Date().toISOString().split('T')[0]
        }
      };
    });

    const fullProgram = {
      id: program.id,
      name: program.name,
      goal: program.goal,
      level: program.level,
      daysPerWeek: program.daysPerWeek,
      schedule,
      generatedAt: new Date().toISOString()
    };

    this.save(fullProgram);
    return fullProgram;
  }

  _extractFocusFromDayName(dayName) {
    const lower = dayName.toLowerCase();
    if (lower.includes('грудь') || lower.includes('трицепс') || lower.includes('плечи')) return 'push';
    if (lower.includes('спина') || lower.includes('бицепс')) return 'pull';
    if (lower.includes('ноги') || lower.includes('ягодицы') || lower.includes('квадрицепс')) return 'legs';
    if (lower.includes('кор') || lower.includes('пресс') || lower.includes('абс')) return 'core';
    if (lower.includes('кардио') || lower.includes('hiit') || lower.includes('бег') || lower.includes('ходьба')) return 'cardio';
    if (lower.includes('отдых')) return 'rest';
    return 'full';
  }

  async generateUniqueSession(focus = 'full', dayOfWeek = 0, context = {}) {
    const { rpe = 7, doms = 1, mood = 'normal' } = context;
    const userLocation = this.user.workoutLocation || 'gym';
    const allowedEquipment = userLocation === 'home'
      ? ['bodyweight', 'dumbbells', 'resistance-band']
      : ['barbell', 'dumbbells', 'cable', 'machine', 'bodyweight'];

    const availableExercises = this.exercises.filter(ex =>
      allowedEquipment.includes(ex.equipment)
    );

    const intensityMultiplier = doms >= 4 ? 0.7 : mood === 'tired' ? 0.8 : 1.0;
    const volumeMultiplier = doms >= 4 ? 0.6 : mood === 'energetic' ? 1.2 : 1.0;
    const targetTypes = this._getFocusTypes(focus);
    const basePool = availableExercises.filter(ex =>
      targetTypes.includes(ex.type) && this._isLevelAppropriate(ex.level)
    );

    if (basePool.length === 0) {
      console.warn(`⚠️ Нет упражнений для фокуса "${focus}" в ${userLocation}`);
      return this._generateFallbackSession(focus, rpe, mood);
    }

    const recommender = await this.getRecommender();
    const balancer = await this.getBalancer();

    const rotatedPool = this._rotateExercises(basePool, dayOfWeek);
    let selectedExercises = rotatedPool.slice(0, 4 + (dayOfWeek % 3));
    selectedExercises = this._applyAlternatives(selectedExercises, dayOfWeek, recommender);

    const workoutExercises = selectedExercises.map((ex, index) =>
      this._generateExerciseParams(ex, index, dayOfWeek, rpe, intensityMultiplier, volumeMultiplier)
    );

    const analysis = balancer.classifyWorkout(workoutExercises);
    const advice = balancer.getBalanceAdvice(analysis);

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

    if (!session.exercises || session.exercises.length === 0) {
      return this._generateFallbackSession(focus, rpe, mood);
    }
    return session;
  }

  _applyAlternatives(exercises, daySeed, recommender) {
    return exercises.map((ex, index) => {
      if (index % 2 === 1) {
        const alternatives = recommender.getAlternatives(ex, 3, 'equipment');
        return alternatives.length > 0 ? alternatives[daySeed % alternatives.length] : ex;
      }
      return ex;
    });
  }

  _generateFallbackSession(focus, rpe, mood) {
    const baseExercises = {
      push: [
        { id: 'push-ups', name: 'Отжимания', type: 'chest', equipment: 'bodyweight' },
        { id: 'dips', name: 'Брусья', type: 'arms', equipment: 'bodyweight' }
      ],
      pull: [
        { id: 'pull-ups', name: 'Подтягивания', type: 'back', equipment: 'bodyweight' },
        { id: 'inverted-rows', name: 'Горизонтальные подтягивания', type: 'back', equipment: 'bodyweight' }
      ],
      legs: [
        { id: 'squat-bodyweight', name: 'Приседания без веса', type: 'legs', equipment: 'bodyweight' },
        { id: 'lunges', name: 'Выпады', type: 'legs', equipment: 'bodyweight' }
      ],
      core: [
        { id: 'plank', name: 'Планка', type: 'core', equipment: 'bodyweight' },
        { id: 'russian-twist', name: 'Русские скручивания', type: 'core', equipment: 'bodyweight' }
      ],
      cardio: [
        { id: 'jumping-jacks', name: 'Прыжки с хлопком', type: 'cardio', equipment: 'bodyweight' },
        { id: 'mountain-climbers', name: 'Альпинисты', type: 'core', equipment: 'bodyweight' }
      ],
      full: [
        { id: 'burpees', name: 'Бёрпи', type: 'full-body', equipment: 'bodyweight' },
        { id: 'jumping-jacks', name: 'Прыжки с хлопком', type: 'cardio', equipment: 'bodyweight' }
      ],
      light: [
        { id: 'yoga-flow', name: 'Йога-поток', type: 'light', equipment: 'bodyweight' },
        { id: 'walking', name: 'Ходьба', type: 'cardio', equipment: 'bodyweight' }
      ]
    };
    const exercises = baseExercises[focus] || baseExercises.full;
    const workoutExercises = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      type: ex.type,
      equipment: ex.equipment,
      sets: 3,
      reps: ex.type === 'cardio' ? '30 сек' : 12,
      tempo: '2-1-1',
      rest: 60,
      technique: 'standard',
      rir: this._getBaseRIR(rpe),
      scientificBasis: {}
    }));
    return {
      id: `fallback-${Date.now()}`,
      name: `Восстановительная сессия (${focus})`,
      focus,
      date: new Date().toISOString().split('T')[0],
      exercises: workoutExercises,
      analysis: { type: 'fallback', ratio: {}, counts: {} },
      advice: 'Не хватает оборудования. Используются базовые упражнения.',
      context: { rpe, doms: 1, mood, intensityMultiplier: 1.0, volumeMultiplier: 1.0 },
      generatedAt: new Date().toISOString()
    };
  }

  _getFocusTypes(focus) {
    const map = {
      push: ['chest', 'shoulders'],
      pull: ['back', 'arms'],
      legs: ['legs'],
      core: ['core'],
      full: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'],
      cardio: ['cardio'],
      light: ['core', 'bodyweight', 'mobility'],
      mobility: ['mobility']
    };
    return map[focus] || map.full;
  }

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

  _generateExerciseParams(ex, index, dayOfWeek, rpe, intensityMult, volumeMult) {
    const baseSets = this._getBaseSets(ex.type);
    const baseReps = this._getBaseReps(ex.primaryMuscles?.[0]);
    const baseRIR = this._getBaseRIR(rpe);
    const variationSeed = (dayOfWeek + ex.id.length + index) % 5;
    let sets, reps, tempo, rest, technique;
    switch (variationSeed) {
      case 0:
        sets = Math.max(1, Math.round(baseSets * volumeMult));
        reps = `${baseReps - 2}–${baseReps}`;
        tempo = ex.scientificBasis?.tempo || "3-1-1";
        rest = Math.round((ex.scientificBasis?.rest || 90) * intensityMult);
        technique = "wave";
        break;
      case 1:
        sets = Math.max(1, Math.round((baseSets - 1) * volumeMult));
        reps = `${baseReps}+`;
        tempo = "2-1-1";
        rest = 60;
        technique = "drop-set";
        break;
      case 2:
        sets = 1;
        reps = `MAX × 3`;
        tempo = "1-0-1";
        rest = 20;
        technique = "rest-pause";
        break;
      case 3:
        sets = Math.max(1, Math.round(baseSets * volumeMult));
        reps = `${Math.floor(baseReps / 2)} × 2`;
        tempo = "1-5-1";
        rest = 15;
        technique = "cluster";
        break;
      default:
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
      scientificBasis: ex.scientificBasis || {}
    };
  }

  _generateSessionName(focus, dayOfWeek, mood) {
    const focusNames = {
      push: "Жимовой день",
      pull: "Тяговый день",
      legs: "Ноги",
      core: "Ядро",
      full: "Фулбоди",
      cardio: "Кардио",
      light: "Лёгкая",
      mobility: "Мобильность"
    };
    const moodNames = {
      tired: "Восстановительная",
      normal: "Стандартная",
      energetic: "Энергетическая"
    };
    const dayNames = ["Альфа", "Бета", "Гамма", "Дельта", "Эпсилон", "Зета", "Эта"];
    return `${focusNames[focus]} ${dayNames[dayOfWeek % 7]} (${moodNames[mood]})`;
  }

  _getBaseSets(exerciseType) {
    const map = {
      legs: 3, back: 3, chest: 3, shoulders: 4,
      arms: 3, core: 3, cardio: 3, mobility: 2
    };
    return map[exerciseType] || 3;
  }

  _getBaseReps(muscleGroup) {
    const map = {
      quadriceps: 8, glutes: 8, hamstrings: 8,
      pectorals: 8, lats: 8, deltoids: 12,
      biceps: 10, triceps: 10, core: 15,
      cardiovascular: 30, mobility: 10
    };
    return map[muscleGroup] || 10;
  }

  _getBaseRIR(rpe) {
    return rpe >= 9 ? 0 : rpe >= 8 ? 1 : rpe >= 7 ? 2 : 3;
  }

  _isLevelAppropriate(exLevel) {
    const allowed = {
      beginner: ['beginner'],
      intermediate: ['beginner', 'intermediate'],
      advanced: ['beginner', 'intermediate', 'advanced']
    };
    return allowed[this.user.level]?.includes(exLevel);
  }

  async generateWeeklyProgram() {
    const daysPerWeek = this.user.daysPerWeek || 3;

    // Автоматический выбор типа программы по цели
    let workoutType = this.user.workoutType;
    if (!workoutType || workoutType === 'balanced') {
      if (this.user.goal === 'lose') workoutType = 'cardio';
      else if (this.user.goal === 'gain') workoutType = 'strength';
      else workoutType = 'balanced';
    }

    const program = {
      id: `program-${Date.now()}`,
      name: `Персональная программа ${new Date().toLocaleDateString('ru-RU')}`,
      goal: this.user.goal,
      level: this.user.level,
      daysPerWeek,
      schedule: [],
      generatedAt: new Date().toISOString()
    };

    let baseRotation = ['push', 'pull', 'legs'];
    if (workoutType === 'cardio') {
      baseRotation = ['cardio', 'full', 'cardio', 'light', 'cardio'];
    } else if (workoutType === 'light') {
      baseRotation = ['light', 'core', 'light', 'mobility', 'light'];
    } else if (workoutType === 'strength') {
      baseRotation = ['push', 'pull', 'legs', 'full', 'push'];
    }

    for (let i = 0; i < daysPerWeek; i++) {
      const focus = baseRotation[i % baseRotation.length];
      const session = await this.generateUniqueSession(focus, i, { rpe: 7, doms: 1, mood: 'normal' });
      program.schedule.push({ day: `День ${i + 1}`, focus, session });
    }

    this.save(program);
    return program;
  }

  async generate() {
    return await this.generateWeeklyProgram();
  }

  async regenerate() {
    return await this.generateWeeklyProgram();
  }

  isPlateaued() {
    return false;
  }
}