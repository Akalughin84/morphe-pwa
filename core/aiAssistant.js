// /core/aiAssistant.js
// v1.3.0 — Умный, надёжный, расширяемый ИИ с поведенческой моделью, контекстом и отладкой

const AI_DEBUG = false; // ← установите true для отладки в консоли

export class AIAssistant {
  constructor() {
    this._profile = null;
    this._workouts = null;
    this._progress = null;
    this._nutrition = null;
    this._supplements = null;
    this._exercises = null;
    this._lastAdvice = null;
    this._adviceTimestamp = 0;
    this._cacheTTL = 30000; // 30 секунд

    // === ПАМЯТЬ ИИ ===
    this._memoryKey = 'morphe-ai-memory';
    this._memory = this._loadMemory();
    this._ensureBehaviorProfile();

    // === СИСТЕМА СТРАТЕГИЙ (для будущего расширения) ===
    this._adviceStrategies = [];
  }

  // === РЕГИСТРАЦИЯ СТРАТЕГИЙ ===
  registerAdviceStrategy(strategy) {
    if (typeof strategy.evaluate !== 'function') {
      console.warn('[AIAssistant] Стратегия должна иметь метод evaluate');
      return;
    }
    this._adviceStrategies.push(strategy);
  }

  _loadMemory() {
    try {
      const raw = localStorage.getItem(this._memoryKey);
      const mem = raw ? JSON.parse(raw) : {
        adviceHistory: [],
        userActions: {},
        preferences: {
          rejectedFoods: [],
          notificationTimes: { lastIgnored: null, preferred: '08:00' }
        },
        behaviorProfile: {
          consistencyScore: 0.5,
          responsiveness: 'medium',
          motivationPhase: 'start',
          preferredFeedbackStyle: 'encouraging'
        },
        adviceFeedback: {}
      };
      return mem;
    } catch (e) {
      console.warn('Не удалось загрузить память ИИ:', e);
      return {
        adviceHistory: [],
        userActions: {},
        preferences: {
          rejectedFoods: [],
          notificationTimes: { lastIgnored: null, preferred: '08:00' }
        },
        behaviorProfile: {
          consistencyScore: 0.5,
          responsiveness: 'medium',
          motivationPhase: 'start',
          preferredFeedbackStyle: 'encouraging'
        },
        adviceFeedback: {}
      };
    }
  }

  _ensureBehaviorProfile() {
    if (!this._memory.behaviorProfile) {
      this._memory.behaviorProfile = {
        consistencyScore: 0.5,
        responsiveness: 'medium',
        motivationPhase: 'start',
        preferredFeedbackStyle: 'encouraging'
      };
    }
    if (!this._memory.adviceFeedback) {
      this._memory.adviceFeedback = {};
    }
  }

  _saveMemory() {
    try {
      localStorage.setItem(this._memoryKey, JSON.stringify(this._memory));
    } catch (e) {
      console.warn('Не удалось сохранить память ИИ:', e);
    }
  }

  _recordAdvice(advice, reason = 'unknown') {
    const record = {
      id: advice.id || Date.now().toString(),
      type: advice.type,
      subtype: advice.subtype || null,
      title: advice.title,
      timestamp: Date.now(),
      acknowledged: false,
      reason,
      source: advice.source || 'legacy'
    };
    this._memory.adviceHistory.push(record);
    if (this._memory.adviceHistory.length > 50) {
      this._memory.adviceHistory = this._memory.adviceHistory.slice(-50);
    }
    this._saveMemory();
  }

  recordUserAction(actionType, data = {}) {
    this._memory.userActions[actionType] = {
      timestamp: Date.now(),
      count: (this._memory.userActions[actionType]?.count || 0) + 1,
      lastData: data
    };
    this._updateBehaviorProfile();
    this._saveMemory();
  }

  recordFoodRejection(foodName) {
    if (!this._memory.preferences.rejectedFoods.includes(foodName)) {
      this._memory.preferences.rejectedFoods.push(foodName);
      if (this._memory.preferences.rejectedFoods.length > 10) {
        this._memory.preferences.rejectedFoods.shift();
      }
      this._saveMemory();
    }
  }

  recordNotificationIgnore(time) {
    this._memory.preferences.notificationTimes.lastIgnored = time;
    const current = this._memory.preferences.notificationTimes.preferred;
    const [h, m] = current.split(':').map(Number);
    const newTime = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this._memory.preferences.notificationTimes.preferred = newTime;
    this._saveMemory();
  }

  recordAdviceFeedback(adviceId, reaction) {
    const advice = this._memory.adviceHistory.find(a => a.id === adviceId);
    if (!advice) return;

    const key = `${advice.type}:${advice.subtype || this._slugify(advice.title)}`;
    if (!this._memory.adviceFeedback[key]) {
      this._memory.adviceFeedback[key] = { accepted: 0, ignored: 0, not_helpful: 0 };
    }

    if (reaction === 'accepted' || reaction === 'helpful') {
      this._memory.adviceFeedback[key].accepted++;
    } else if (reaction === 'ignored' || reaction === 'dismissed') {
      this._memory.adviceFeedback[key].ignored++;
    } else if (reaction === 'not_helpful') {
      this._memory.adviceFeedback[key].not_helpful++;
    }

    this._updateBehaviorProfile();
    this._saveMemory();
  }

  _slugify(str) {
    if (typeof str !== 'string') return 'unknown';
    return str
      .toLowerCase()
      .replace(/[^\w\sа-яё]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  _updateBehaviorProfile() {
    const profile = this._memory.behaviorProfile;
    const actions = this._memory.userActions;

    // === Последовательность: уникальные дни активности за 14 дней ===
    const now = Date.now();
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const activeDays = new Set();

    for (const action of Object.values(actions)) {
      if (action.timestamp >= fourteenDaysAgo) {
        const day = new Date(action.timestamp).toISOString().split('T')[0];
        activeDays.add(day);
      }
    }

    const recentActiveDays = Math.min(activeDays.size, 7);
    profile.consistencyScore = Math.min(1, recentActiveDays / 7);

    // === Респонсивность ===
    const feedback = this._memory.adviceFeedback;
    const totalInteractions = Object.values(feedback).reduce(
      (sum, f) => sum + f.accepted + f.ignored + f.not_helpful,
      0
    );
    if (totalInteractions > 0) {
      const acceptRate = Object.values(feedback).reduce((sum, f) => sum + f.accepted, 0) / totalInteractions;
      profile.responsiveness = acceptRate > 0.6 ? 'high' : acceptRate > 0.3 ? 'medium' : 'low';
    }

    // === Фаза мотивации: любая релевантная активность ===
    const relevantActions = ['logged_progress', 'completed_workout', 'logged_nutrition', 'skipped_lunch'];
    let lastRelevantAction = 0;
    for (const key of relevantActions) {
      if (actions[key]?.timestamp > lastRelevantAction) {
        lastRelevantAction = actions[key].timestamp;
      }
    }

    const daysSinceActivity = lastRelevantAction
      ? (Date.now() - lastRelevantAction) / (1000 * 60 * 60 * 24)
      : 999;

    if (daysSinceActivity > 14) {
      profile.motivationPhase = 'burnout';
    } else if (daysSinceActivity > 7) {
      profile.motivationPhase = 'plateau';
    } else if (daysSinceActivity < 2) {
      profile.motivationPhase = 'growth';
    } else {
      profile.motivationPhase = 'start';
    }

    // === Стиль обратной связи ===
    const notHelpfulCount = Object.values(feedback).reduce((sum, f) => sum + f.not_helpful, 0);
    if (notHelpfulCount >= 3 && profile.preferredFeedbackStyle !== 'data') {
      profile.preferredFeedbackStyle = 'data';
    }
  }

  _hasRecentPlateau() {
    const recentProgress = this._memory.userActions.logged_progress?.lastData?.history;
    if (!recentProgress || !Array.isArray(recentProgress) || recentProgress.length < 2) return false;
    const first = recentProgress[recentProgress.length - 1];
    const last = recentProgress[0];
    if (typeof first.weight !== 'number' || typeof last.weight !== 'number') return false;
    const change = Math.abs(last.weight - first.weight);
    return change < 0.3;
  }

  getIgnoredAdviceCount(adviceType, days = 7) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this._memory.adviceHistory.filter(a => 
      a.type === adviceType && 
      !a.acknowledged && 
      a.timestamp > cutoff
    ).length;
  }

  // === Ленивые геттеры ===
  async _getWorkouts() {
    if (!this._workouts) {
      const { WorkoutTracker } = await import('/modules/workoutTracker.js');
      this._workouts = new WorkoutTracker();
    }
    return this._workouts;
  }

  async _getProgress() {
    if (!this._progress) {
      const { ProgressTracker } = await import('/modules/progressTracker.js');
      this._progress = new ProgressTracker();
    }
    return this._progress;
  }

  async _getNutrition() {
    if (!this._nutrition) {
      try {
        const { NutritionTracker } = await import('/modules/nutritionTracker.js');
        this._nutrition = new NutritionTracker();
      } catch (e) {
        this._nutrition = null;
      }
    }
    return this._nutrition;
  }

  async getSupplementAdvisor() {
    if (!this._supplements) {
      const { SupplementAdvisor } = await import('/modules/supplementAdvisor.js');
      this._supplements = new SupplementAdvisor();
    }
    return this._supplements;
  }

  async getExerciseRecommender() {
    if (!this._exercises) {
      const { ExerciseRecommender } = await import('/core/exerciseRecommender.js');
      const recommender = new ExerciseRecommender();
      await recommender.loadAll();
      this._exercises = recommender;
    }
    return this._exercises;
  }

  async loadUserData() {
    try {
      const { UserService } = await import('/services/userService.js');
      const user = UserService.getProfile();
      this._profile = user ? user.data : null;
    } catch (error) {
      console.warn('[AIAssistant] Не удалось загрузить профиль:', error);
      this._profile = null;
    }
    return this._profile;
  }

  async generateAdvice() {
    const now = Date.now();
    if (this._lastAdvice && now - this._adviceTimestamp < this._cacheTTL) {
      return { ...this._lastAdvice, id: Date.now().toString() };
    }

    const profile = await this.loadUserData();
    let advice, reason = 'neutral';

    // Защита от частично загруженного профиля
    if (profile) {
      profile.goal = profile.goal || 'maintain';
      profile.injuries = Array.isArray(profile.injuries) ? profile.injuries : [];
      profile.allergies = Array.isArray(profile.allergies) ? profile.allergies : [];
    }

    if (!profile) {
      advice = this._genericGuestAdvice();
      reason = 'guest';
    } else {
      const advicePool = await this._buildAdvicePool(profile);
      if (advicePool.length > 0) {
        advice = this._pickWeightedAdvice(advicePool);
        reason = `${advice.type}:${advice.subtype || 'unknown'}`;
      } else {
        advice = this._neutralObservation();
        reason = 'no-advice-generated';
      }
    }

    advice.id = Date.now().toString();
    advice.source = reason;
    this._recordAdvice(advice, reason);
    this._lastAdvice = advice;
    this._adviceTimestamp = now;
    return advice;
  }

  async _buildAdvicePool(profile) {
    const context = this._getContext();

    // === НОВАЯ СИСТЕМА: стратегии ===
    if (this._adviceStrategies.length > 0) {
      const pool = [];
      for (const strategy of this._adviceStrategies) {
        try {
          const advice = await strategy.evaluate({
            profile,
            memory: this._memory,
            context,
            getWorkouts: () => this._getWorkouts(),
            getProgress: () => this._getProgress(),
            getNutrition: () => this._getNutrition(),
            getExerciseRecommender: () => this.getExerciseRecommender(),
            getSupplementAdvisor: () => this.getSupplementAdvisor(),
            getStrengthProgress: () => this.getStrengthProgress(),
            getRecoveryStatus: () => this.getRecoveryStatus(),
            getTomorrowWorkout: () => this.getTomorrowWorkout(),
            getSkippedMeals: () => this.getSkippedMeals(),
            getVitaminDeficiencyFromSymptoms: () => this.getVitaminDeficiencyFromSymptoms(),
          });
          if (advice && this._shouldShowAdvice(advice)) {
            advice.message = this._personalizeMessage(advice.message, context);
            pool.push(advice);
          }
        } catch (e) {
          console.warn('[AIAssistant] Ошибка в стратегии:', e);
        }
      }
      return pool;
    }

    // === СТАРАЯ СИСТЕМА: fallback ===
    const pool = [];
    await this._addInjuryWarnings(pool, profile, context);
    await this._addStrengthPlateauAdvice(pool, context);
    await this._addRecoveryAdvice(pool, context);
    await this._addVitaminDeficiencyAdvice(pool, context);
    await this._addWeightProgressAdvice(pool, profile, context);
    await this._addSupplementAdvice(pool, profile, context);
    await this._addProactiveAdvice(pool, context);
    this._addGoalSpecificAdvice(pool, profile, context);
    await this._addHydrationIgnoreAdvice(pool, context);
    await this._addProgressLoggingReminder(pool, context);

    // Эмпатия к усталости/настроению
    const fatigueCount = this._memory.userActions.fatigue?.count || 0;
    const lowMoodCount = this._memory.userActions.lowMood?.count || 0;
    if (fatigueCount >= 3) {
      const advice = {
        type: 'empathy',
        subtype: 'chronic-fatigue',
        title: 'Вы часто уставали',
        message: 'За последнюю неделю вы 3+ раза отмечали усталость. Может, стоит добавить день отдыха или прогулку на свежем воздухе?',
        emoji: '😴',
        action: { text: 'Посмотреть восстановление', url: '/pages/recovery.html' }
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    } else if (lowMoodCount >= 3) {
      const advice = {
        type: 'empathy',
        subtype: 'low-mood-support',
        title: 'Мы рядом',
        message: 'Физическая активность помогает настроению. Хотите лёгкую 10-минутную тренировку для подъёма духа?',
        emoji: '💙',
        action: { text: 'Попробовать', url: '/pages/workouts/quick-mood.html' }
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    }

    return pool;
  }

  _shouldShowAdvice(advice) {
    const key = `${advice.type}:${advice.subtype || this._slugify(advice.title)}`;
    const feedback = this._memory.adviceFeedback[key] || { ignored: 0, not_helpful: 0 };

    if (feedback.ignored >= 2 || feedback.not_helpful >= 1) {
      return false;
    }

    const phase = this._memory.behaviorProfile.motivationPhase;
    if (phase === 'burnout' && advice.type === 'warning') {
      return false;
    }

    return true;
  }

  _personalizeMessage(message, context) {
    if (typeof message !== 'string') {
      console.warn('[AIAssistant] Некорректное сообщение:', message);
      message = 'Совет временно недоступен.';
    }

    const style = this._memory.behaviorProfile.preferredFeedbackStyle || 'encouraging';

    // Время суток
    if (context.isMorning) {
      message = message.replace(/сегодня/gi, 'сегодня утром');
    } else if (context.isEvening) {
      message = message.replace(/сегодня/gi, 'сегодня вечером');
    }

    // Выходной
    if (context.isWeekend) {
      message = message.replace(/сегодня/gi, 'сегодня, в выходной');
    }

    // Сезон
    if (context.season === 'winter') {
      message += ' Зимой особенно важно следить за витамином D.';
    } else if (context.season === 'summer') {
      message += ' Летом не забывайте пить больше воды.';
    }

    // Эмпатия к настроению
    if (context.recentMood === 'tired') {
      message = message.replace(/Попробуйте|Рекомендуем/g, 'Может, стоит попробовать');
      message += ' Вы недавно отмечали усталость — не перенапрягайтесь.';
    } else if (context.recentMood === 'low') {
      message = message.replace(/Попробуйте|Рекомендуем/g, 'Как насчёт того, чтобы');
      message += ' Забота о себе — уже шаг вперёд. Вы молодец.';
    }

    // Стиль подачи
    if (style === 'encouraging') {
      return '🌟 ' + message;
    } else if (style === 'data') {
      return '📊 ' + message;
    } else if (style === 'minimal') {
      return message
        .replace(/Попробуйте|Рекомендуем|Хотите|Давайте/g, '')
        .replace(/\?/g, '.');
    }

    return message;
  }

  _getContext() {
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();

    let season;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    const isMorning = hour >= 6 && hour < 12;
    const isEvening = hour >= 18 && hour < 23;

    const fatigueCount = this._memory.userActions.fatigue?.count || 0;
    const lowMoodCount = this._memory.userActions.lowMood?.count || 0;
    const recentMood = 
      fatigueCount >= 2 ? 'tired' :
      lowMoodCount >= 2 ? 'low' :
      'neutral';

    return {
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      season,
      hour,
      isMorning,
      isEvening,
      recentMood,
    };
  }

  _pickWeightedAdvice(pool) {
    if (AI_DEBUG && pool.length > 0) {
      console.group('[AIAssistant] Выбор совета из пула:');
      pool.forEach((a, i) => console.log(`${i + 1}. [${a.type}] ${a.title}`));
      console.groupEnd();
    }

    const priority = {
      warning: 10,
      empathy: 9,
      encouragement: 8,
      tip: 7,
      proactive: 6,
      info: 5,
      warmup: 4
    };

    pool.sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0));
    const topPriority = priority[pool[0]?.type] || 0;
    const candidates = pool.filter(a => (priority[a.type] || 0) >= topPriority - 1);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    if (AI_DEBUG && chosen) {
      console.log('[AIAssistant] Выбран совет:', chosen.title, '| Причина:', chosen.source);
    }

    return chosen;
  }

  _pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  _genericGuestAdvice() {
    return {
      type: 'info',
      subtype: 'guest',
      title: 'Заполните профиль',
      message: 'Чтобы получать персональные советы, заполните свой профиль.',
      action: { text: 'Перейти', url: '/pages/profile.html' }
    };
  }

  _goalSpecificTip(goal) {
    const tips = {
      lose: {
        type: 'tip',
        title: 'Фокус на белке',
        message: 'При дефиците калорий сохраняйте мышцы: ешьте 1.8–2.2 г белка на кг веса.',
        emoji: '🥚'
      },
      gain: {
        type: 'tip',
        title: 'Прогрессия нагрузки',
        message: 'Добавляйте по 1–2 кг в неделю. Это ключ к росту силы и массы.',
        emoji: '📈'
      },
      maintain: {
        type: 'tip',
        title: 'Баланс — ваш друг',
        message: 'Поддержание формы — это тоже достижение. Не недооценивайте стабильность.',
        emoji: '🕊'
      }
    };
    return tips[goal] || tips.maintain;
  }

  _neutralObservation() {
    return {
      type: 'info',
      subtype: 'neutral',
      title: 'Всё идёт своим чередом',
      message: 'Продолжайте в том же духе. Прогресс не всегда виден сразу.',
      emoji: '🟢'
    };
  }

  generateWarmupAdvice(focus, userContext = {}) {
    const { injuries = [], level = 'beginner', workoutLocation = 'gym' } = userContext;
    
    const baseTips = {
      push: [
        "Разогрейте плечевые суставы — 30 секунд круговых движений руками вперёд и назад.",
        "Сделайте 2 подхода 'кошки-коровы' для подвижности грудного отдела.",
        "Выполните 10 лёгких отжиманий от стены для активации груди."
      ],
      pull: [
        "Разомните локти и запястья — вращения по 15 сек в каждую сторону.",
        "Сделайте 'лопаточные подтягивания' на перекладине — 2×10 без подъёма тела.",
        "Потяните широчайшие: наклонитесь вбок, держась за опору."
      ],
      legs: [
        "Разогрейте тазобедренные суставы — 'восьмёрки' тазом по 30 сек в каждую сторону.",
        "Сделайте 20 лёгких выпадов без веса для активации квадрицепсов.",
        "Покачайтесь на носках — 30 сек для кровотока в икроножных."
      ],
      core: [
        "Выполните 'мёртвого жука' — 2×10 для активации глубокого кора.",
        "Сделайте боковые наклоны с вытянутой рукой — по 10 на сторону.",
        "Дышите диафрагмой: 5 глубоких вдохов через нос, выдох через рот."
      ],
      cardio: [
        "Начните с лёгкой ходьбы на месте — 1 минута.",
        "Добавьте бег с подниманием колен — 30 сек.",
        "Завершите прыжками с хлопком — 30 сек."
      ],
      full: [
        "Пройдите по 'динамической йоге': кошка-корова → планка → выпад.",
        "Сделайте 3 круга: 10 приседаний + 5 отжиманий + 15 сек планки.",
        "Дышите осознанно: вдох — 4 сек, выдох — 6 сек."
      ]
    };

    let injuryTips = [];
    if (injuries.includes('shoulder')) {
      injuryTips.push("Избегайте резких махов руками. Замените на изометрические удержания.");
    }
    if (injuries.includes('knee')) {
      injuryTips.push("Не делайте глубокие выпады. Замените на 'стену' (присед у стены).");
    }
    if (injuries.includes('back')) {
      injuryTips.push("Избегайте наклонов с поворотами. Сфокусируйтесь на дыхании и лёгкой мобилизации.");
    }

    const tips = [...(baseTips[focus] || baseTips.full), ...injuryTips];
    const selected = tips
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(3, tips.length));

    return {
      type: 'warmup',
      subtype: 'warmup-' + focus,
      title: 'Совет перед разминкой',
      message: selected.join(" "),
      emoji: '🧘'
    };
  }

  // === НОВЫЕ МЕТОДЫ ===
  async getStrengthProgress() {
    try {
      const { StrengthProgress } = await import('/core/strengthProgress.js');
      const engine = new StrengthProgress();
      const history = engine.getExerciseHistory('squat-barbell');
      if (history?.length >= 3) {
        return engine.predictFutureOneRM(history, 2);
      }
    } catch (e) {
      console.warn('Не удалось загрузить прогресс силы:', e);
    }
    return null;
  }

  async getRecoveryStatus() {
    const { AdaptiveEngine } = await import('/modules/adaptiveEngine.js');
    const engine = new AdaptiveEngine();
    return await engine.getRecoveryStatus();
  }

  getVitaminDeficiencyFromSymptoms() {
    const symptoms = this._memory.userActions;
    const fatigueCount = symptoms.fatigue?.count || 0;
    const lowMoodCount = symptoms.lowMood?.count || 0;
    
    if (fatigueCount >= 2) {
      return { vitamins: ['витамин D', 'B12'], symptoms: ['усталость'] };
    }
    if (lowMoodCount >= 2) {
      return { vitamins: ['магний', 'омега-3'], symptoms: ['низкое настроение'] };
    }
    return null;
  }

  async getTomorrowWorkout() {
    const { WorkoutPlanner } = await import('/core/workoutPlanner.js');
    const planner = new WorkoutPlanner();
    await planner.init();
    const plan = planner.getCurrent();
    if (!plan) return null;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    return plan.schedule.find(s => s.date === tomorrowStr)?.session || null;
  }

  getSkippedMeals() {
    const lunchSkips = this._memory.userActions.skipped_lunch?.count || 0;
    return { lunch: lunchSkips };
  }

  // === МЕТОДЫ ДЛЯ ОТЛАДКИ И ТЕСТИРОВАНИЯ ===
  exportState() {
    return {
      memory: { ...this._memory },
      profile: this._profile,
      timestamp: Date.now()
    };
  }

  importState(state) {
    if (state.memory) {
      this._memory = { ...state.memory };
      this._saveMemory();
    }
    if (state.profile) {
      this._profile = { ...state.profile };
    }
    console.log('[AIAssistant] Состояние восстановлено');
  }

  // === МЕТОДЫ ДОБАВЛЕНИЯ СОВЕТОВ (рефакторинг _buildAdvicePool) ===
  async _addInjuryWarnings(pool, profile, context) {
    if (!profile.injuries?.length) return;
    const recommender = await this.getExerciseRecommender();
    const workouts = await this._getWorkouts();
    const lastWorkout = workouts.getLast();
    if (!lastWorkout || !Array.isArray(lastWorkout.exercises)) return;
    for (const ex of lastWorkout.exercises) {
      const fullEx = recommender.exercises.find(e => e.id === ex.id);
      if (fullEx?.contraindications?.some(c => profile.injuries.includes(c))) {
        const advice = {
          type: 'warning',
          subtype: 'injury',
          title: '⚠️ Упражнение при травме',
          message: `Вы выполнили "${fullEx.name}", несмотря на травму "${profile.injuries.join(', ')}". Рекомендуем заменить.`,
          emoji: '⚠️'
        };
        if (this._shouldShowAdvice(advice)) {
          advice.message = this._personalizeMessage(advice.message, context);
          pool.push(advice);
        }
      }
    }
  }

  async _addStrengthPlateauAdvice(pool, context) {
    const strengthProgress = await this.getStrengthProgress();
    if (strengthProgress && strengthProgress.trend === 'plateau') {
      const advice = {
        type: 'warning',
        subtype: 'strength-plateau',
        title: 'Плато силы',
        message: `Ваши результаты не растут последние 2 недели. Попробуйте увеличить вес на 2.5 кг или добавить 1 подход.`,
        emoji: '📈'
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    }
  }

  async _addRecoveryAdvice(pool, context) {
    const recoveryStatus = await this.getRecoveryStatus();
    if (recoveryStatus.needsRecovery) {
      const advice = {
        type: 'tip',
        subtype: 'recovery',
        title: 'Низкое восстановление',
        message: `Уровень DOMS (${recoveryStatus.doms}) и усталости (${recoveryStatus.rpe}) высок. Сегодня — лёгкая тренировка или отдых.`,
        emoji: '🧘'
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    }
  }

  async _addVitaminDeficiencyAdvice(pool, context) {
    const symptomBasedDeficiency = this.getVitaminDeficiencyFromSymptoms();
    if (symptomBasedDeficiency) {
      const advice = {
        type: 'tip',
        subtype: 'vitamins',
        title: 'Возможный дефицит',
        message: `Симптомы (${symptomBasedDeficiency.symptoms.join(', ')}) могут указывать на нехватку ${symptomBasedDeficiency.vitamins.join(', ')}.`,
        emoji: '💊'
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    }
  }

  async _addWeightProgressAdvice(pool, profile, context) {
    const progress = await this._getProgress();
    const recentProgress = progress.getSince(14);
    if (recentProgress.length < 2) return;
    const first = recentProgress[recentProgress.length - 1];
    const last = recentProgress[0];
    const weightChange = last.weight - first.weight;
    const timeDiff = new Date(last.date) - new Date(first.date);
    const weeks = Math.max(1, timeDiff / (7 * 24 * 60 * 60 * 1000));

    const safeWeightChange = typeof weightChange === 'number' && !isNaN(weightChange) 
      ? weightChange.toFixed(1) 
      : 'неизвестно';
    const safeWeeks = typeof weeks === 'number' && !isNaN(weeks) 
      ? weeks.toFixed(1) 
      : 'несколько';

    let advice;
    if (profile.goal === 'lose' && weightChange > 0.3) {
      advice = {
        type: 'warning',
        subtype: 'weight-gain-on-lose',
        title: 'Вес растёт при цели "похудеть"',
        message: `За ${safeWeeks} нед. вы набрали ${safeWeightChange} кг. Проверьте калории и кардио.`,
        emoji: '⚖️'
      };
    } else if (profile.goal === 'gain' && weightChange < 0.2) {
      advice = {
        type: 'tip',
        subtype: 'slow-gain',
        title: 'Медленный набор массы',
        message: `За ${safeWeeks} нед. прирост всего ${safeWeightChange} кг. Увеличьте калории на 200–300 в день.`,
        emoji: '🍗'
      };
    }
    if (advice && this._shouldShowAdvice(advice)) {
      advice.message = this._personalizeMessage(advice.message, context);
      pool.push(advice);
    }
  }

  async _addSupplementAdvice(pool, profile, context) {
    if (profile.allergies?.includes('supplements')) return;
    try {
      const advisor = await this.getSupplementAdvisor();
      const recs = await advisor.getPersonalizedRecommendations();
      if (recs.length > 0) {
        const supplement = recs[0];
        const advice = {
          type: 'tip',
          subtype: 'supplement',
          title: 'Добавка дня',
          message: `${supplement.name}: ${supplement.dosage}. ${supplement.description}`,
          emoji: '💊'
        };
        if (this._shouldShowAdvice(advice)) {
          advice.message = this._personalizeMessage(advice.message, context);
          pool.push(advice);
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить добавки:', e);
    }
  }

  async _addProactiveAdvice(pool, context) {
    const tomorrowWorkout = this.getTomorrowWorkout();
    if (tomorrowWorkout && tomorrowWorkout.focus === 'legs') {
      const advice = {
        type: 'proactive',
        subtype: 'pre-legs',
        title: 'Подготовка к тренировке ног',
        message: 'Завтра тяжёлая тренировка ног. Сегодня — больше магния, воды и 8 часов сна.',
        emoji: '🦵'
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    }

    const skippedMeals = this.getSkippedMeals();
    if (skippedMeals.lunch >= 2) {
      const advice = {
        type: 'proactive',
        subtype: 'skipped-lunch',
        title: 'Пропускаете обед?',
        message: 'Вы 2 раза пропустили обед. Хотите, чтобы я автоматически генерировал ланч?',
        emoji: '🥗',
        action: { text: 'Включить генерацию', url: '/pages/nutrition.html' }
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    }
  }

  _addGoalSpecificAdvice(pool, profile, context) {
    let goalTip = this._goalSpecificTip(profile.goal);
    goalTip = {
      ...goalTip,
      subtype: `goal-${profile.goal}`,
      message: this._personalizeMessage(goalTip.message, context)
    };
    pool.push(goalTip);
  }

  async _addHydrationIgnoreAdvice(pool, context) {
    const ignoredHydration = this.getIgnoredAdviceCount('reminder', 3);
    if (ignoredHydration >= 2) {
      const advice = {
        type: 'empathy',
        subtype: 'hydration-ignore',
        title: 'Напоминания о воде',
        message: 'Я заметил, что вы часто пропускаете напоминания пить воду. Хотите отключить их или изменить время?',
        emoji: '💧',
        action: { text: 'Настройки уведомлений', url: '/pages/notifications.html' }
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    }
  }

  async _addProgressLoggingReminder(pool, context) {
    const progressActions = this._memory.userActions.logged_progress;
    const daysSinceProgress = progressActions 
      ? (Date.now() - progressActions.timestamp) / (1000 * 60 * 60 * 24) 
      : 999;
    if (daysSinceProgress > 10) {
      const advice = {
        type: 'encouragement',
        subtype: 'log-progress',
        title: 'Ваши данные важны',
        message: 'Без замеров я не вижу прогресс. Давайте начнём с веса? Это займёт 30 секунд.',
        emoji: '📊',
        action: { text: 'Записать вес', url: '/pages/progress.html' }
      };
      if (this._shouldShowAdvice(advice)) {
        advice.message = this._personalizeMessage(advice.message, context);
        pool.push(advice);
      }
    }
  }
}

// === ПРИМЕР СТРАТЕГИИ (можно вынести позже) ===
export class StrengthPlateauStrategy {
  async evaluate({ profile, memory, context, getStrengthProgress }) {
    const strengthProgress = await getStrengthProgress();
    if (strengthProgress && strengthProgress.trend === 'plateau') {
      return {
        type: 'warning',
        subtype: 'strength-plateau',
        title: 'Плато силы',
        message: `Ваши результаты не растут последние 2 недели. Попробуйте увеличить вес на 2.5 кг или добавить 1 подход.`,
        emoji: '📈'
      };
    }
    return null;
  }
}