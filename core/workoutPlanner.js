// /core/workoutPlanner.js
// v3.7.1 — Исправлена генерация расписания: сегодня включается, если это тренировочный день
// Сохранена 100% совместимость с v3.7.0

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
    this.user = { ...profile.data };
    // Автоматическое определение уровня подготовки
    this.user.level = this._getUserLevel(this.user);
    if (this.exercises.length === 0) {
      this.exercises = await DataService.getExercises();
    }
    return this;
  }

  _getUserLevel(profile) {
    const activity = parseFloat(profile.activity) || 1.375;
    const trainingDays = profile.trainingDays?.length || 0;

    if (activity <= 1.375 && trainingDays <= 3) {
      return 'beginner';
    } else if (activity <= 1.55 && trainingDays <= 4) {
      return 'intermediate';
    } else {
      return 'advanced';
    }
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

  // === ОБНОВЛЁННЫЙ: ГОТОВАЯ ПРОГРАММА С ПОДДЕРЖКОЙ ГИБКИХ ДНЕЙ И ПРОГРЕССИИ ===
  async usePredefinedProgram(programId, weekNumber = 1) {
    const allPrograms = await DataService.getPrograms();
    const program = allPrograms.find(p => p.id === programId);
    if (!program) throw new Error(`Программа ${programId} не найдена`);

    // Получаем дни пользователя
    const userTrainingDays = this.user.trainingDays || [1, 3, 5];
    let daysPerWeekValue = 3;
    if (Array.isArray(program.daysPerWeek)) {
      // Выбираем ближайшее допустимое значение
      const valid = program.daysPerWeek.filter(n => n <= userTrainingDays.length);
      daysPerWeekValue = valid.length ? Math.max(...valid) : Math.min(...program.daysPerWeek);
    } else {
      daysPerWeekValue = program.daysPerWeek || 3;
    }
    const daysPerWeek = Math.min(daysPerWeekValue, userTrainingDays.length);
    const actualTrainingDays = userTrainingDays.slice(0, daysPerWeek);

    // Валидация недели
    const maxWeeks = program.durationWeeks || 6;
    const safeWeek = Math.max(1, Math.min(maxWeeks, weekNumber)) - 1;

    // Определяем последовательность типов тренировок
    const baseSequence = program.sessionSequence || ['full'];
    const extendedSequence = [];
    for (let i = 0; i < actualTrainingDays.length; i++) {
      extendedSequence.push(baseSequence[i % baseSequence.length]);
    }

    // === ИСПРАВЛЕНО: Генерация дат начинается с сегодняшнего дня ===
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayDayOfWeek = today.getDay();

    const scheduleDates = [];

    // Если сегодня — тренировочный день, добавляем его первым
    if (actualTrainingDays.includes(todayDayOfWeek)) {
      scheduleDates.push(todayStr);
    }

    // Добавляем остальные дни (до нужного количества)
    let offset = 1;
    while (scheduleDates.length < actualTrainingDays.length && offset < 30) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const dayOfWeek = date.getDay();
      if (actualTrainingDays.includes(dayOfWeek)) {
        scheduleDates.push(date.toISOString().split('T')[0]);
      }
      offset++;
    }

    const userInjuries = this.user.injuries || [];
    const schedule = scheduleDates.map((dateStr, i) => {
      const focus = extendedSequence[i];
      const dayName = new Date(dateStr).toLocaleDateString('ru-RU', { weekday: 'long' });

      // Получаем упражнения для этого типа
      const weekKey = `${focus}-week-${weekNumber}`;
      const exerciseIds = program.exerciseMapping?.[weekKey] || program.exerciseMapping?.[focus] || [];
      const baseExercises = exerciseIds.map(exId => {
        const exRef = program.exercises.find(e => e.id === exId);
        const fullEx = this.exercises.find(e => e.id === exId) || {};

        // Применяем прогрессию для недели
        const sets = program.progression?.rules?.sets?.[safeWeek] ?? exRef?.sets ?? 3;
        const reps = program.progression?.rules?.reps?.[safeWeek] ?? exRef?.reps ?? '8–12';
        const rest = program.progression?.rules?.rest?.[safeWeek] ?? exRef?.rest ?? 90;
        const rir = program.progression?.rules?.rir?.[safeWeek] ?? 2;

        return {
          ...fullEx,
          id: exId,
          name: fullEx.name || exId,
          type: fullEx.type || 'unknown',
          equipment: fullEx.equipment || 'bodyweight',
          sets,
          reps: String(reps),
          rest,
          tempo: fullEx.scientificBasis?.tempo || '2-1-1',
          technique: 'standard',
          rir,
          scientificBasis: fullEx.scientificBasis || {}
        };
      }).filter(ex => {
        return !ex.contraindications?.some(c => userInjuries.includes(c));
      });

      const warmup = this._getWarmupExercises(focus);
      const stretch = this._getStretchExercises(focus);
      const fullSessionExercises = [...warmup, ...baseExercises, ...stretch];

      return {
        date: dateStr,
        day: dayName,
        focus,
        session: {
          id: `session-${weekNumber}-${i}`,
          name: `${focus} (Неделя ${weekNumber})`,
          focus,
          exercises: fullSessionExercises,
          date: dateStr,
          week: weekNumber
        }
      };
    });

    const fullProgram = {
      id: `${program.id}-week-${weekNumber}`,
      name: `${program.name} — Неделя ${weekNumber}`,
      originalProgramId: program.id,
      goal: program.goal,
      level: program.level,
      daysPerWeek: actualTrainingDays.length,
      schedule,
      generatedAt: new Date().toISOString()
    };

    // Добавляем предупреждения
    const warnings = [];
    const chronic = this.user.chronicConditions || [];
    if (chronic.includes('heart') || chronic.includes('hypertension')) {
      warnings.push('⚠️ Избегайте задержки дыхания и пиковых нагрузок');
    }
    if (this.user.smoking !== 'no') {
      warnings.push('🚭 Курение снижает выносливость');
    }
    fullProgram.warnings = warnings;

    this.save(fullProgram);
    return fullProgram;
  }

  // === РАЗМИНКА И РАСТЯЖКА — ВСЕГДА ДОСТУПНЫ ===
  _getWarmupExercises(focus) {
    const warmups = [
      { id: 'warmup-cardio', name: 'Лёгкая кардио-разминка', type: 'warmup', duration: 5 },
      { id: 'warmup-joints', name: 'Разминка суставов', type: 'warmup', duration: 3 }
    ];
    if (focus === 'push') {
      warmups.push({ id: 'warmup-shoulders', name: 'Разминка плеч', type: 'warmup', duration: 2 });
    } else if (focus === 'legs') {
      warmups.push({ id: 'warmup-hips', name: 'Разминка тазобедренных', type: 'warmup', duration: 2 });
    } else if (focus === 'pull') {
      warmups.push({ id: 'warmup-back', name: 'Мобилизация спины', type: 'warmup', duration: 2 });
    }
    return warmups.map(ex => ({
      ...ex,
      sets: 1,
      reps: 'выполнить',
      rest: 0,
      tempo: '',
      technique: 'standard',
      rir: null,
      scientificBasis: {},
      weight: null
    }));
  }

  _getStretchExercises(focus) {
    const stretches = [
      { id: 'stretch-full', name: 'Общая растяжка', type: 'stretch', duration: 5 }
    ];
    if (focus === 'push') {
      stretches.push({ id: 'stretch-chest', name: 'Растяжка груди', type: 'stretch', duration: 2 });
    } else if (focus === 'pull') {
      stretches.push({ id: 'stretch-back', name: 'Растяжка спины', type: 'stretch', duration: 2 });
    } else if (focus === 'legs') {
      stretches.push({ id: 'stretch-quads', name: 'Растяжка квадрицепсов', type: 'stretch', duration: 2 });
      stretches.push({ id: 'stretch-hamstrings', name: 'Растяжка задней поверхности бедра', type: 'stretch', duration: 2 });
    }
    return stretches.map(ex => ({
      ...ex,
      sets: 1,
      reps: 'выполнить',
      rest: 0,
      tempo: '',
      technique: 'standard',
      rir: null,
      scientificBasis: {},
      weight: null
    }));
  }

  // === ГЛАВНЫЙ МЕТОД: ГЕНЕРАЦИЯ СЕССИИ С АВТОМАТИЧЕСКОЙ РАЗМИНКОЙ/РАСТЯЖКОЙ ===
  async generateUniqueSession(focus = 'full', dayOfWeek = 0, context = {}) {
    let finalContext = context;
    if (Object.keys(context).length === 0) {
      const { AdaptiveEngine } = await import('/modules/adaptiveEngine.js');
      const engine = new AdaptiveEngine();
      finalContext = engine.getNextSessionContext();
    }
    const { rpe = 7, doms = 1, mood = 'normal' } = context;
    const userLocation = this.user.workoutLocation || 'gym';
    const allowedEquipment = userLocation === 'home'
      ? ['bodyweight', 'dumbbells', 'resistance-band']
      : ['barbell', 'dumbbells', 'cable', 'machine', 'bodyweight'];
    
    const userInjuries = this.user.injuries || [];  
    const availableExercises = this.exercises.filter(ex =>
      allowedEquipment.includes(ex.equipment) &&
      !ex.contraindications?.some(c => userInjuries.includes(c))
    );

    const biologicalPenalty = this._getBiologicalPenalty();
    const baseIntensity = context.intensityMultiplier || (doms >= 4 ? 0.7 : mood === 'tired' ? 0.8 : 1.0);
    const intensityMultiplier = Math.max(0.5, baseIntensity - biologicalPenalty);

    let volumeMultiplier = context.volumeMultiplier || (doms >= 4 ? 0.6 : mood === 'energetic' ? 1.2 : 1.0);
    // Для женщин — немного меньше объёма в силовых
    if (this.user.gender === 'female' && ['push', 'pull', 'legs'].includes(focus)) {
      volumeMultiplier *= 0.9;
    }

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
    let workoutExercises = selectedExercises.map((ex, index) =>
      this._generateExerciseParams(ex, index, dayOfWeek, rpe, intensityMultiplier, volumeMultiplier)
    );

    // === УЧЁТ ВРЕМЕНИ ТРЕНИРОВКИ ===
    const maxDuration = this.user.workoutDuration || 60;
    const warmupTime = this._getWarmupExercises(focus).reduce((sum, ex) => sum + ex.duration, 0);
    const stretchTime = this._getStretchExercises(focus).reduce((sum, ex) => sum + ex.duration, 0);
    const restTime = workoutExercises.reduce((sum, ex) => sum + (ex.sets - 1) * ex.rest / 60, 0);
    const workTime = workoutExercises.length * 2;
    let totalTime = warmupTime + workTime + restTime + stretchTime;

    if (totalTime > maxDuration) {
      const reductionFactor = maxDuration / totalTime;
      const maxExercises = Math.max(2, Math.floor(workoutExercises.length * reductionFactor));
      workoutExercises = workoutExercises.slice(0, maxExercises);
      totalTime = warmupTime + (workoutExercises.length * 2) + 
                  workoutExercises.reduce((sum, ex) => sum + (ex.sets - 1) * ex.rest / 60, 0) + 
                  stretchTime;
    }

    // ВСЕГДА ДОБАВЛЯЕМ РАЗМИНКУ И РАСТЯЖКУ
    const warmupExercises = this._getWarmupExercises(focus);
    const stretchExercises = this._getStretchExercises(focus);
    const fullExercises = [...warmupExercises, ...workoutExercises, ...stretchExercises];

    const analysis = balancer.classifyWorkout(workoutExercises);
    const advice = balancer.getBalanceAdvice(analysis);

    // ПРЕДУПРЕЖДЕНИЯ
    const warnings = [];
    const chronic = this.user.chronicConditions || [];
    if (chronic.includes('heart') || chronic.includes('hypertension')) {
      warnings.push('⚠️ Избегайте задержки дыхания и пиковых нагрузок');
    }
    if (chronic.includes('diabetes')) {
      warnings.push('⚠️ Следите за самочувствием, имейте источник углеводов');
    }
    if (this.user.smoking !== 'no') {
      warnings.push('🚭 Курение снижает выносливость — снижена интенсивность');
    }

    const session = {
      id: `session-${Date.now()}`,
      name: this._generateSessionName(focus, dayOfWeek, mood),
      focus,
      date: new Date().toISOString().split('T')[0],
      exercises: fullExercises,
      analysis,
      advice,
      warnings,
      context: { rpe, doms, mood, intensityMultiplier, volumeMultiplier },
      generatedAt: new Date().toISOString()
    };

    if (!session.exercises || session.exercises.length === 0) {
      return this._generateFallbackSession(focus, rpe, mood);
    }
    return session;
  }

  _getBiologicalPenalty() {
    let penalty = 0;
    const profile = this.user;

    if (profile.smoking === 'regular') penalty += 0.2;
    else if (profile.smoking === 'occasional') penalty += 0.1;

    if (profile.alcohol === 'frequent') penalty += 0.2;
    else if (profile.alcohol === 'occasional') penalty += 0.1;

    if (profile.hemoglobin !== null && profile.hemoglobin < 120) penalty += 0.15;
    if (profile.vitaminD !== null && profile.vitaminD < 20) penalty += 0.1;

    const chronic = profile.chronicConditions || [];
    if (chronic.includes('heart') || chronic.includes('hypertension')) {
      penalty += 0.3;
    }
    if (chronic.includes('diabetes')) {
      penalty += 0.1;
    }

    return Math.min(0.5, penalty);
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
      ...ex,
      sets: 3,
      reps: ex.type === 'cardio' ? '30 сек' : 12,
      tempo: '2-1-1',
      rest: 60,
      technique: 'standard',
      rir: this._getBaseRIR(rpe),
      scientificBasis: {},
      weight: null
    }));

    // ДОБАВЛЯЕМ РАЗМИНКУ И РАСТЯЖКУ ДАЖЕ В FALLBACK
    const warmup = this._getWarmupExercises(focus);
    const stretch = this._getStretchExercises(focus);
    const fullExercises = [...warmup, ...workoutExercises, ...stretch];

    return {
      id: `fallback-${Date.now()}`,
      name: `Восстановительная сессия (${focus})`,
      focus,
      date: new Date().toISOString().split('T')[0],
      exercises: fullExercises,
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
      ...ex,
      sets,
      reps,
      tempo,
      rest,
      technique,
      rir: baseRIR
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
    const profile = this.user;
    const trainingDays = profile.trainingDays || [1, 3, 5];
    const daysPerWeek = Math.min(6, Math.max(2, trainingDays.length));
    let workoutType = profile.workoutType;
    if (!workoutType || workoutType === 'balanced') {
      if (profile.goal === 'lose') workoutType = 'cardio';
      else if (profile.goal === 'gain') workoutType = 'strength';
      else workoutType = 'balanced';
    }
    const program = {
      id: `program-${Date.now()}`,
      name: `Персональная программа ${new Date().toLocaleDateString('ru-RU')}`,
      goal: profile.goal,
      level: profile.level,
      daysPerWeek,
      schedule: [],
      generatedAt: new Date().toISOString()
    };

    // === ИСПРАВЛЕНО: Генерация дат начинается с сегодняшнего дня ===
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayDayOfWeek = today.getDay();

    const scheduleDates = [];

    // Если сегодня — тренировочный день, добавляем его первым
    if (trainingDays.includes(todayDayOfWeek)) {
      scheduleDates.push(todayStr);
    }

    // Добавляем остальные дни (на 4 недели вперёд)
    const maxDays = daysPerWeek * 4;
    let offset = 1;
    let daysChecked = 0;
    while (scheduleDates.length < maxDays && daysChecked < 30) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const dayOfWeek = date.getDay();
      if (trainingDays.includes(dayOfWeek)) {
        scheduleDates.push(date.toISOString().split('T')[0]);
      }
      offset++;
      daysChecked++;
    }

    const baseRotation = this._getBaseRotation(workoutType, daysPerWeek);
    for (let i = 0; i < scheduleDates.length; i++) {
      const dateStr = scheduleDates[i];
      const focus = baseRotation[i % baseRotation.length];
      let context = { rpe: 7, doms: 1, mood: 'normal' };
      try {
        const { AdaptiveEngine } = await import('/modules/adaptiveEngine.js');
        const engine = new AdaptiveEngine();
        context = await engine.getNextSessionContext();
      } catch (e) {
        console.warn('Не удалось загрузить адаптивный контекст:', e);
      }
      const session = await this.generateUniqueSession(focus, i, context);
      program.schedule.push({
        date: dateStr,
        day: new Date(dateStr).toLocaleDateString('ru-RU', { weekday: 'long' }),
        focus,
        session: {
          ...session,
          date: dateStr
        }
      });
    }

    // Добавляем предупреждения в программу
    const warnings = [];
    const chronic = this.user.chronicConditions || [];
    if (chronic.includes('heart') || chronic.includes('hypertension')) {
      warnings.push('⚠️ Избегайте задержки дыхания и пиковых нагрузок');
    }
    if (this.user.smoking !== 'no') {
      warnings.push('🚭 Курение снижает выносливость');
    }
    program.warnings = warnings;

    this.save(program);
    return program;
  }

  _getBaseRotation(workoutType, daysPerWeek) {
    if (workoutType === 'cardio') {
      return ['cardio', 'full', 'cardio', 'light', 'cardio'].slice(0, daysPerWeek);
    } else if (workoutType === 'light') {
      return ['light', 'core', 'light', 'mobility', 'light'].slice(0, daysPerWeek);
    } else if (workoutType === 'strength') {
      if (daysPerWeek === 2) return ['full', 'full'];
      if (daysPerWeek === 3) return ['push', 'pull', 'legs'];
      if (daysPerWeek === 4) return ['push', 'pull', 'legs', 'full'];
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs'].slice(0, daysPerWeek);
    } else {
      // balanced
      if (daysPerWeek === 2) return ['full', 'full'];
      if (daysPerWeek === 3) return ['push', 'pull', 'legs'];
      if (daysPerWeek === 4) return ['push', 'pull', 'legs', 'full'];
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs'].slice(0, daysPerWeek);
    }
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