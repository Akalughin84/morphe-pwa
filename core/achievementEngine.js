// /core/achievementEngine.js
// v1.8.0 — Ядро анализа для выдачи достижений

import { AchievementsManager } from '/modules/achievementsManager.js';
import { UserService } from '/services/userService.js';
import { WorkoutTracker } from '/modules/workoutTracker.js';
import { ProgressTracker } from '/modules/progressTracker.js';
import { StrengthGoalTracker } from '/core/strengthGoalTracker.js';

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

  /**
   * Проверка первых шагов
   */
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
   * Проверка серий (streak)
   */
  async checkStreaks() {
    const weekly = this.workouts.getWeeklyCount();
    const monthly = this.workouts.getAll().length;

    // Week streak
    if (weekly >= 7 && !this.achievements.isUnlocked('week_streak')) {
      this.achievements.unlock('week_streak');
    }

    // Month streak
    if (monthly >= 30 && !this.achievements.isUnlocked('month_streak')) {
      this.achievements.unlock('month_streak');
    }
  }

  /**
   * Проверка прогресса
   */
  async checkProgress() {
    const recent = this.progress.getSince(14); // за 2 недели
    if (recent.length < 2 || this.achievements.isUnlocked('weight_progress')) return;

    const first = recent[recent.length - 1];
    const last = recent[0];
    const weightChange = last.weight - first.weight;

    const profile = UserService.getProfile();
    if (profile?.data.goal === 'lose' && weightChange < 0) {
      this.achievements.unlock('weight_progress');
    }
  }

  /**
   * Проверка целей
   */
  async checkGoals() {
    const completed = this.goals.getCompleted();
    if (completed.length > 0 && !this.achievements.isUnlocked('first_goal')) {
      this.achievements.unlock('first_goal');
    }
  }

  /**
   * Этические достижения
   */
  async checkEthics() {
    // Пример: если пользователь ни разу не открывал premium
    // Это можно отслеживать через localStorage
    const visitedPremium = localStorage.getItem('morphe-visited-premium') === 'true';
    if (!visitedPremium && !this.achievements.isUnlocked('silent_discipline')) {
      // Можно выдать через 7 дней использования
      const firstUse = localStorage.getItem('morphe-first-use');
      if (firstUse) {
        const days = (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 7) {
          this.achievements.unlock('silent_discipline');
        }
      }
    }
  }
}