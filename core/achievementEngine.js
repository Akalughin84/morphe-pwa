// /core/achievementEngine.js
// v1.8.1 — Исправлена логика streak'ов, пути и надёжность

import { AchievementsManager } from '/modules/achievementsManager.js';
import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';
import { StrengthGoalTracker } from '/core/strengthGoalTracker.js'; // ✅ Исправлен путь
import { StorageManager } from '/utils/storage.js';

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
  }

  /**
   * ✅ Исправлено: проверка НЕПРЕРЫВНОЙ серии дней с тренировками
   */
  async checkStreaks() {
    const today = new Date();
    let currentStreak = 0;

    // Проверяем последние 30 дней назад
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      if (this.workouts.hasWorkoutOnDate(dateStr)) {
        currentStreak++;
      } else {
        break; // серия прервана
      }
    }

    // Week streak (7 дней подряд)
    if (currentStreak >= 7 && !this.achievements.isUnlocked('week_streak')) {
      this.achievements.unlock('week_streak');
    }

    // Month streak (30 дней подряд)
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