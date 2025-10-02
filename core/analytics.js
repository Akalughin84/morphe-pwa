// /core/analytics.js
// v2.1.0 — Исправлено: dynamic import вместо require

import { UserService } from '/services/userService.js';
import { DateUtils } from '/utils/dateUtils.js';

/**
 * AnalyticsEngine — генерирует текстовые выводы о прогрессе
 * Вместо графиков — смысл.
 */
export class AnalyticsEngine {
  constructor(profile = null) {
    this._profile = profile;
    this._workouts = null;
    this._progress = null;
    this._nutrition = null;
    this._goals = null;
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
      const { NutritionTracker } = await import('/modules/nutritionTracker.js');
      this._nutrition = new NutritionTracker();
    }
    if (this._goals === null) {
      try {
        const { StrengthGoalTracker } = await import('/core/strengthGoalTracker.js');
        this._goals = new StrengthGoalTracker();
      } catch (e) {
        // StrengthGoalTracker необязателен
        this._goals = null;
      }
    }
  }

  get profile() {
    if (this._profile === undefined) {
      const user = UserService.getProfile();
      this._profile = user ? user.data : null;
    }
    return this._profile;
  }

  get workouts() {
    return this._workouts;
  }

  get progress() {
    return this._progress;
  }

  get nutrition() {
    return this._nutrition;
  }

  get goals() {
    return this._goals;
  }

  /**
   * Получить сводный анализ
   */
  async getSummary() {
    await this._loadDependencies();
    if (!this.profile) {
      return {
        title: "Начните свой путь",
        summary: "Заполните профиль — и Morphe начнёт анализировать ваш прогресс."
      };
    }

    const weekly = this._getWeeklyAnalysis();
    const progress = await this._getProgressInsight();
    const nutrition = this._getNutritionInsight();
    const goals = this._getGoalsInsight();

    return {
      title: this._getTitle(progress.trend, weekly.consistency),
      summary: [
        weekly.text,
        progress.text,
        nutrition.text,
        goals.text
      ].filter(Boolean).join(' ')
    };
  }

  _getTitle(weightTrend, consistency) {
    if (consistency === 'excellent' && weightTrend === 'on-track') {
      return "Отличный темп!";
    }
    if (consistency === 'good' && weightTrend === 'on-track') {
      return "Вы на правильном пути";
    }
    if (consistency === 'low') {
      return "Пора вернуться";
    }
    return "Ваш прогресс";
  }

  _getWeeklyAnalysis() {
    const lastWeek = this.workouts.getLastWeek();
    const prevWeek = this._getPreviousWeek();

    const currentCount = lastWeek.length;
    const prevCount = prevWeek.length;

    let consistency = 'low';
    let text = '';

    if (currentCount >= 4) {
      consistency = 'excellent';
      text = 'Вы тренируетесь регулярно — это ключ к прогрессу.';
    } else if (currentCount >= 3) {
      consistency = 'good';
      text = 'Хорошая консистентность. Продолжайте в том же духе.';
    } else if (currentCount >= 1) {
      consistency = 'medium';
      text = 'Вы начали. Теперь важно закрепить привычку.';
    } else {
      text = 'Вы давно не тренировались. Начните с лёгкой тренировки.';
    }

    // Динамика
    if (prevCount > 0) {
      const change = ((currentCount - prevCount) / prevCount) * 100;
      if (change > 20) {
        text += ' Вы увеличили частоту тренировок — отличная динамика!';
      } else if (change < -20) {
        text += ' Частота снизилась. Возможно, стоит пересмотреть нагрузку.';
      }
    }

    return { count: currentCount, consistency, text };
  }

  /**
   * ✅ Исправлено: корректный расчёт предыдущей недели
   */
  _getPreviousWeek() {
    const now = new Date();
    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setDate(now.getDate() - now.getDay()); // воскресенье

    const startOfPrevWeek = new Date(startOfCurrentWeek);
    startOfPrevWeek.setDate(startOfCurrentWeek.getDate() - 7);
    const endOfPrevWeek = new Date(startOfCurrentWeek);

    const startTime = startOfPrevWeek.getTime();
    const endTime = endOfPrevWeek.getTime();

    return this.workouts.getAll().filter(t => t.timestamp >= startTime && t.timestamp < endTime);
  }

  /**
   * Асинхронный метод для анализа прогресса
   */
  async _getProgressInsight() {
    await this._loadDependencies();
    const recent = this.progress.getSince(21);
    if (recent.length < 2) {
      return { trend: 'unknown', text: '' };
    }

    const first = recent[recent.length - 1];
    const last = recent[0];
    const weeks = Math.max(1, recent.length / 7);
    const changePerWeek = (last.weight - first.weight) / weeks;

    let trend = 'off-track';
    let text = '';

    if (this.profile.goal === 'lose') {
      if (changePerWeek < -0.3) {
        trend = 'on-track';
        text = `Вы теряете вес в хорошем темпе — около ${Math.abs(changePerWeek).toFixed(1)} кг в неделю.`;
      } else if (changePerWeek > 0) {
        text = 'Вес растёт, хотя цель — похудение. Проверьте питание.';
      } else {
        text = 'Вес почти не меняется. Возможно, нужно скорректировать калории.';
      }
    } else if (this.profile.goal === 'gain') {
      if (changePerWeek > 0.3) {
        trend = 'on-track';
        text = `Вы набираете вес с хорошей скоростью — ${changePerWeek.toFixed(1)} кг в неделю.`;
      } else if (changePerWeek < 0) {
        text = 'Вес снижается, хотя цель — набор массы. Увеличьте калории.';
      } else {
        text = 'Вес стабилен. Для роста мышц нужен профицит.';
      }
    } else if (this.profile.goal === 'maintain') {
      if (Math.abs(changePerWeek) < 0.2) {
        trend = 'on-track';
        text = 'Отлично! Вы сохраняете форму — колебания минимальны.';
      } else {
        text = 'Форма немного меняется. Если хотите стабильности — скорректируйте питание.';
      }
    }

    return { trend, text };
  }

  _getNutritionInsight() {
    try {
      const today = this.nutrition.getAllToday();
      if (today.length === 0) {
        return { text: 'Сегодня вы ещё не записывали приёмы пищи.' };
      }

      const totals = this.nutrition.getTotalMacrosToday();
      const plan = UserService.getNutritionPlan?.();
      let text = '';

      if (plan?.macros) {
        const proteinPct = (totals.protein / plan.macros.protein) * 100;
        if (proteinPct < 70) {
          text = 'Сегодня вы потребили мало белка. Добавьте яйца, творог или курицу.';
        } else if (proteinPct > 130) {
          text = 'Белка сегодня достаточно. Отлично для восстановления!';
        } else {
          text = 'Питание сбалансировано: достаточно белка и энергии.';
        }
      } else {
        text = 'Вы сегодня записали приёмы пищи — это уже шаг вперёд!';
      }

      return { text };
    } catch (e) {
      console.warn('[AnalyticsEngine] Ошибка анализа питания:', e);
      return { text: '' };
    }
  }

  _getGoalsInsight() {
    try {
      if (!this._goals) return { text: '' };
      
      const completed = this.goals.getCompleted();
      const active = this.goals.getActive();

      if (completed.length > 0) {
        const suffix = completed.length === 1 ? 'ь' : 'и';
        return { text: `🎉 Вы достигли ${completed.length} цели${suffix} по силе. Это отличный результат!` };
      }

      if (active.length > 0) {
        const forecasts = active
          .map(goal => ({ goal, forecast: this.goals.getCompletionForecast(goal) }))
          .filter(item => item.forecast)
          .sort((a, b) => a.forecast.days - b.forecast.days);

        if (forecasts.length > 0) {
          const { goal, forecast } = forecasts[0];
          return { text: `🎯 Ближайшая цель: "${goal.exerciseName}". Прогноз достижения — через ${forecast.days} дней.` };
        }
      }

      return { text: '' };
    } catch (e) {
      console.warn('[AnalyticsEngine] Ошибка анализа целей:', e);
      return { text: '' };
    }
  }
}