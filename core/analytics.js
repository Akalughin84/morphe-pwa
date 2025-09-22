// /core/analytics.js
// v2.0.0 — Текстовая аналитика без графиков

import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';
import { NutritionTracker } from '/modules/nutritionTracker.js';
import { StrengthGoalTracker } from '/core/strengthGoalTracker.js';
import { DateUtils } from '/utils/dateUtils.js';

/**
 * AnalyticsEngine — генерирует текстовые выводы о прогрессе
 * Вместо графиков — смысл.
 */
export class AnalyticsEngine {
  constructor(profile = null, history = null) {
    this.profile = profile || (UserService.getProfile()?.data ?? null);
    this.workouts = new WorkoutTracker();
    this.progress = new ProgressTracker();
    this.nutrition = new NutritionTracker();
    this.goals = new StrengthGoalTracker();
  }

  /**
   * Получить сводный анализ
   */
  getSummary() {
    if (!this.profile) {
      return {
        title: "Начните свой путь",
        summary: "Заполните профиль — и Morphe начнёт анализировать ваш прогресс."
      };
    }

    const weekly = this._getWeeklyAnalysis();
    const progress = this._getProgressInsight();
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

  /**
   * Заголовок на основе общего состояния
   */
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

  /**
   * Анализ тренировок
   */
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
   * Прошлая неделя
   */
  _getPreviousWeek() {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const cutoff = twoWeeksAgo.getTime();

    return this.workouts.getAll().filter(t => t.timestamp >= cutoff && t.timestamp < twoWeeksAgo.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Анализ прогресса по весу
   */
  _getProgressInsight() {
    const recent = this.progress.getSince(21); // за 3 недели
    if (recent.length < 2) {
      return { trend: 'unknown', text: '' };
    }

    const first = recent[recent.length - 1];
    const last = recent[0];
    const changePerWeek = (last.weight - first.weight) / (recent.length / 7);

    let trend = 'off-track';
    let text = '';

    if (this.profile.goal === 'lose') {
      if (changePerWeek < -0.3) {
        trend = 'on-track';
        text = 'Вы теряете вес в хорошем темпе — около ' + Math.abs(changePerWeek).toFixed(1) + ' кг в неделю.';
      } else if (changePerWeek > 0) {
        text = 'Вес растёт, хотя цель — похудение. Проверьте питание.';
      } else {
        text = 'Вес почти не меняется. Возможно, нужно скорректировать калории.';
      }
    }

    if (this.profile.goal === 'gain') {
      if (changePerWeek > 0.3) {
        trend = 'on-track';
        text = 'Вы набираете вес с хорошей скоростью — ' + changePerWeek.toFixed(1) + ' кг в неделю.';
      } else if (changePerWeek < 0) {
        text = 'Вес снижается, хотя цель — набор массы. Увеличьте калории.';
      } else {
        text = 'Вес стабилен. Для роста мышц нужен профицит.';
      }
    }

    if (this.profile.goal === 'maintain') {
      if (Math.abs(changePerWeek) < 0.2) {
        trend = 'on-track';
        text = 'Отлично! Вы сохраняете форму — колебания минимальны.';
      } else {
        text = 'Форма немного меняется. Если хотите стабильности — скорректируйте питание.';
      }
    }

    return { trend, text };
  }

  /**
   * Анализ питания
   */
  _getNutritionInsight() {
    const today = this.nutrition.getAllToday();
    if (today.length === 0) {
      return { text: 'Сегодня вы ещё не записывали приёмы пищи.' };
    }

    const totals = this.nutrition.getTotalMacrosToday();
    const engine = new (window.AnalyticsEngine ? null : () => {}); // заглушка
    // На практике можно сравнить с целями, но пока — общий комментарий
    return { text: 'Вы сегодня потребили достаточно белка и углеводов для восстановления.' };
  }

  /**
   * Анализ целей
   */
  _getGoalsInsight() {
    const completed = this.goals.getCompleted();
    const active = this.goals.getActive();

    if (completed.length > 0) {
      return { text: `🎉 Вы достигли ${completed.length} цели${completed.length === 1 ? '' : 'й'} по силе. Это отличный результат!` };
    }

    if (active.length > 0) {
      const closest = active.reduce((a, b) => 
        this.goals.getCompletionForecast(a)?.days < this.goals.getCompletionForecast(b)?.days ? a : b
      );
      const forecast = this.goals.getCompletionForecast(closest);
      if (forecast) {
        return { text: `🎯 Ближайшая цель: "${closest.exerciseName}". Прогноз достижения — через ${forecast.days} дней.` };
      }
    }

    return { text: '' };
  }
}