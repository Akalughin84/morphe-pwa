// /modules/aiAssistant.js
// v2.1.0 — Исправлено: dynamic import вместо require

/**
 * AIAssistant — ваш цифровой советник
 * Анализирует данные пользователя и даёт персональные советы
 * Полностью в браузере, без передачи данных
 */
export class AIAssistant {
  constructor() {
    this._profile = null;
    this._workouts = null;
    this._progress = null;
    this._nutrition = null;
    this._lastAdvice = null;
    this._adviceTimestamp = 0;
    this._cacheTTL = 2000; // 2 секунды кэша
  }

  async _loadDependencies() {
    if (this._workouts === null) {
      const { WorkoutTracker } = await import('/modules/workoutTracker.js');
      this._workouts = new WorkoutTracker();
    }
    if (this._progress === null) {
      const { ProgressTracker } = await import('/modules/progressTracker.js');
      this._progress = new ProgressTracker();
    }
    if (this._nutrition === null) {
      try {
        const { NutritionTracker } = await import('/modules/nutritionTracker.js');
        this._nutrition = new NutritionTracker();
      } catch (e) {
        // NutritionTracker необязателен
        this._nutrition = null;
      }
    }
  }

  /**
   * Загружает профиль пользователя
   */
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

  /**
   * Генерирует персонализированный совет
   */
  async generateAdvice() {
    const now = Date.now();
    if (this._lastAdvice && now - this._adviceTimestamp < this._cacheTTL) {
      return this._lastAdvice;
    }

    await this._loadDependencies();
    const profile = await this.loadUserData();
    let advice;

    if (!profile) {
      advice = this._genericGuestAdvice();
    } else {
      const advicePool = this._buildAdvicePool(profile);
      advice = advicePool.length > 0
        ? this._pickRandom(advicePool)
        : this._neutralObservation();
    }

    this._lastAdvice = advice;
    this._adviceTimestamp = now;
    return advice;
  }

  /**
   * Собирает все возможные советы на основе данных
   */
  _buildAdvicePool(profile) {
    const pool = [];

    // 1. Активность
    const weeklyWorkouts = this._workouts.getWeeklyCount();
    if (weeklyWorkouts === 0) {
      pool.push(this._suggestStartTraining());
    } else if (weeklyWorkouts < 2) {
      pool.push(this._encourageConsistency());
    }

    // 2. Вес (за последние 14 дней)
    const recentProgress = this._progress.getSince(14);
    if (recentProgress.length >= 2) {
      const first = recentProgress[recentProgress.length - 1];
      const last = recentProgress[0];
      const weightChange = last.weight - first.weight;

      if (profile.goal === 'lose' && weightChange > 0) {
        pool.push(this._adviseOnWeightGain());
      } else if (profile.goal === 'gain' && weightChange < 0.5) {
        pool.push(this._adviseOnMassGain());
      }
    }

    // 3. Последняя тренировка
    const lastWorkout = this._workouts.getLast();
    if (lastWorkout) {
      const daysSince = (Date.now() - lastWorkout.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSince > 3 && profile.goal !== 'maintain') {
        pool.push(this._remindToTrain());
      }
    }

    // 4. Целевой совет (всегда добавляется)
    pool.push(this._goalSpecificTip(profile.goal));

    return pool;
  }

  _pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // === Советы ===

  _genericGuestAdvice() {
    return {
      type: 'info',
      title: 'Заполните профиль',
      message: 'Чтобы получать персональные советы, заполните свой профиль.',
      action: { text: 'Перейти', url: '/pages/profile.html' }
    };
  }

  _suggestStartTraining() {
    return {
      type: 'motivation',
      title: 'Начните двигаться',
      message: 'Вы ещё не начали тренироваться. Даже 20 минут в неделю меняют всё.',
      emoji: '💪'
    };
  }

  _encourageConsistency() {
    return {
      type: 'reminder',
      title: 'Старайтесь быть стабильнее',
      message: 'Регулярность важнее интенсивности. Постройте привычку — результат придет.',
      emoji: '🔁'
    };
  }

  _adviseOnWeightGain() {
    return {
      type: 'warning',
      title: 'Вес растёт, а цель — похудеть?',
      message: 'Возможно, калорий слишком много или мало кардио. Проверьте питание.',
      emoji: '⚖️'
    };
  }

  _adviseOnMassGain() {
    return {
      type: 'tip',
      title: 'Нужен профицит',
      message: 'Для набора массы важно потреблять больше калорий, чем тратите. Ешьте чаще.',
      emoji: '🍗'
    };
  }

  _remindToTrain() {
    return {
      type: 'reminder',
      title: 'Вы давно не тренировались',
      message: 'Тело помнит. Вернитесь — даже лёгкая тренировка поднимет уровень.',
      emoji: '🏋️‍♂️'
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
      title: 'Всё идёт своим чередом',
      message: 'Продолжайте в том же духе. Прогресс не всегда виден сразу.',
      emoji: '🟢'
    };
  }

  /**
   * Возвращает все возможные советы (для отладки или анализа)
   */
  async getAllPossibleAdvice() {
    await this._loadDependencies();
    const profile = await this.loadUserData();
    if (!profile) return [this._genericGuestAdvice()];
    return this._buildAdvicePool(profile);
  }
}