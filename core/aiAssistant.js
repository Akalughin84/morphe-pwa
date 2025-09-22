// /core/aiAssistant.js
// v0.4.0 — Локальный AI-ассистент (без сервера)

import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';

/**
 * MorpheAI — ваш цифровой советник
 * Анализирует данные и даёт персональные советы
 * Полностью в браузере, без передачи данных
 */
export class AIAssistant {
  constructor() {
    this.profile = null;
    this.workouts = new WorkoutTracker();
    this.progress = new ProgressTracker();
  }

  /**
   * Загружает все данные пользователя
   */
  async loadUserData() {
    const user = UserService.getProfile();
    if (!user) return null;

    this.profile = user.data;
    return this.profile;
  }

  /**
   * Генерирует совет на основе анализа
   */
  async generateAdvice() {
    const profile = await this.loadUserData();
    if (!profile) {
      return this._genericGuestAdvice();
    }

    const advicePool = [];

    // 1. Анализ активности
    const weeklyWorkouts = this.workouts.getWeeklyCount();
    if (weeklyWorkouts === 0) {
      advicePool.push(this._suggestStartTraining());
    } else if (weeklyWorkouts < 2) {
      advicePool.push(this._encourageConsistency());
    }

    // 2. Прогресс по весу
    const recentProgress = this.progress.getSince(14); // за 2 недели
    if (recentProgress.length >= 2) {
      const first = recentProgress[recentProgress.length - 1];
      const last = recentProgress[0];
      const weightChange = last.weight - first.weight;

      if (profile.goal === 'lose' && weightChange > 0) {
        advicePool.push(this._adviseOnWeightGain());
      } else if (profile.goal === 'gain' && weightChange < 0.5) {
        advicePool.push(this._adviseOnMassGain());
      }
    }

    // 3. Последняя тренировка
    const lastWorkout = this.workouts.getLast();
    if (lastWorkout) {
      const daysSince = (Date.now() - lastWorkout.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSince > 3 && profile.goal !== 'maintain') {
        advicePool.push(this._remindToTrain());
      }
    }

    // 4. Целевой совет
    advicePool.push(this._goalSpecificTip());

    // Возвращаем случайный совет из пула (чтобы не повторялся)
    return advicePool.length > 0
      ? this._pickRandom(advicePool)
      : this._neutralObservation();
  }

  _pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

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

  _goalSpecificTip() {
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
    return tips[this.profile.goal] || tips.maintain;
  }

  _neutralObservation() {
    return {
      type: 'info',
      title: 'Всё идёт своим чередом',
      message: 'Продолжайте в том же духе. Прогресс не всегда виден сразу.',
      emoji: '🟢'
    };
  }
}