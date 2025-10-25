// /core/achievementEngine.js
// v1.8.2 — Улучшена надёжность streak'ов, добавлена поддержка новых бейджей, локальное время

import { AchievementsManager } from '/modules/achievementsManager.js';
import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';
import { StrengthGoalTracker } from '/core/strengthGoalTracker.js'; // ✅ Исправлен путь
import { StorageManager } from '/utils/storage.js';
import { ACHIEVEMENTS } from '/config/achievements.js'; // ✅ Конфигурация достижений

/**
 * AchievementEngine — автоматически проверяет условия и выдаёт бейджи
 */
export class AchievementEngine {
  constructor() {
    this.achievements = new AchievementsManager();
    this.workouts = new WorkoutTracker();
    this.progress = new ProgressTracker();
    this.goals = new StrengthGoalTracker();
  }

  /**
   * Преобразует Date в строку YYYY-MM-DD по локальному времени (игнорируя часовой пояс)
   * @param {Date} date
   * @returns {string} YYYY-MM-DD
   */
  toLocalDateStr(date) {
    const offset = date.getTimezoneOffset() * 60000; // смещение в миллисекундах
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().split('T')[0];
  }

  /**
   * Вычисляет разницу в днях между двумя датами в формате YYYY-MM-DD
   * @param {string} dateStr1 — более ранняя дата
   * @param {string} dateStr2 — более поздняя дата
   * @returns {number} разница в днях (0 = один день)
   */
  dateDiffInDays(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Проверка всех достижений
   */
  async checkAll() {
    await this.checkMilestones();
    await this.checkStreaks();
    await this.checkProgress();
    await this.checkGoals();
    await this.checkEthics();
  }

  async checkMilestones() {
    const profile = UserService.getProfile();
    if (profile && !this.achievements.isUnlocked('first_profile')) {
      this.achievements.unlock('first_profile');
    }

    const last = this.workouts.getLast();
    if (last && !this.achievements.isUnlocked('first_workout')) {
      this.achievements.unlock('first_workout');
    }

    // Новое: достижение за 10 тренировок
    const totalWorkouts = this.workouts.getAll().length;
    if (totalWorkouts >= 10 && !this.achievements.isUnlocked('ten_workouts')) {
      this.achievements.unlock('ten_workouts');
    }
  }

  /**
   * Проверка НЕПРЕРЫВНОЙ серии дней с тренировками (локальное время + кэширование)
   */
  async checkStreaks() {
    const todayStr = this.toLocalDateStr(new Date());
    const lastWorkoutDate = StorageManager.getItem('last_workout_date');
    let currentStreak = parseInt(StorageManager.getItem('current_streak')) || 0;

    const hasWorkoutToday = this.workouts.hasWorkoutOnDate(todayStr);

    if (lastWorkoutDate) {
      const daysSinceLast = this.dateDiffInDays(lastWorkoutDate, todayStr);
      if (daysSinceLast === 0) {
        // Уже обработано сегодня — ничего не меняем
      } else if (daysSinceLast === 1) {
        // Вчера была тренировка
        if (hasWorkoutToday) {
          currentStreak++;
        }
        // Если сегодня нет тренировки — streak "зависает", но не сбрасывается
        // Сброс произойдёт при daysSinceLast > 1
      } else if (daysSinceLast > 1) {
        // Был перерыв
        currentStreak = hasWorkoutToday ? 1 : 0;
      }
    } else {
      // Первая тренировка вообще
      currentStreak = hasWorkoutToday ? 1 : 0;
    }

    // Обновляем дату последней тренировки только если сегодня тренировка
    if (hasWorkoutToday) {
      StorageManager.setItem('last_workout_date', todayStr);
    }

    // Сохраняем текущий streak
    StorageManager.setItem('current_streak', currentStreak);

    // Выдача бейджей (в порядке возрастания)
    if (currentStreak >= 3 && !this.achievements.isUnlocked('three_day_streak')) {
      this.achievements.unlock('three_day_streak');
    }
    if (currentStreak >= 7 && !this.achievements.isUnlocked('week_streak')) {
      this.achievements.unlock('week_streak');
    }
    if (currentStreak >= 30 && !this.achievements.isUnlocked('month_streak')) {
      this.achievements.unlock('month_streak');
    }
  }

  async checkProgress() {
    const recent = this.progress.getSince(14);
    if (recent.length < 2 || this.achievements.isUnlocked('weight_progress')) return;

    const first = recent[recent.length - 1];
    const last = recent[0];
    const weightChange = last.weight - first.weight;

    const profile = UserService.getProfile();
    if (profile?.data.goal === 'lose' && weightChange < 0) {
      this.achievements.unlock('weight_progress');
    }
    // TODO: можно расширить для 'gain' и 'maintain' позже
  }

  async checkGoals() {
    const completed = this.goals.getCompleted();
    if (completed.length > 0 && !this.achievements.isUnlocked('first_goal')) {
      this.achievements.unlock('first_goal');
    }
  }

  async checkEthics() {
    const visitedPremium = StorageManager.getItem('morphe-visited-premium') === true;
    if (visitedPremium) return;

    if (this.achievements.isUnlocked('silent_discipline')) return;

    const firstUse = StorageManager.getItem('morphe-first-use');
    if (firstUse) {
      const days = (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 7) {
        this.achievements.unlock('silent_discipline');
      }
    }
  }
}