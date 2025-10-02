// /modules/adaptiveEngine.js
// v0.7.2 — Полностью на ES Modules (браузер)
import { StorageManager } from '/utils/storage.js';

export class AdaptiveEngine {
  constructor() {
    this._workouts = null;
    this._progress = null;
    this._profile = null;
    this._lastAnalysis = null;
    this._analysisTimestamp = 0;
    this._cacheTTL = 1000;
  }

  async getWorkouts() {
    if (!this._workouts) {
      const { WorkoutTracker } = await import('/modules/workoutTracker.js');
      this._workouts = new WorkoutTracker();
    }
    return this._workouts;
  }

  async getProgress() {
    if (!this._progress) {
      const { ProgressTracker } = await import('/modules/progressTracker.js');
      this._progress = new ProgressTracker();
    }
    return this._progress;
  }

  async loadProfile() {
    try {
      const { MorpheProfile } = await import('/modules/profile.js');
      const user = new MorpheProfile();
      this._profile = user.isComplete() ? user.data : null;
    } catch (error) {
      console.warn('[AdaptiveEngine] Не удалось загрузить профиль:', error);
      this._profile = null;
    }
    return this._profile;
  }

  get profile() {
    return this._profile;
  }

  async getFatigueLevel() {
    const workouts = await this.getWorkouts();
    const last = workouts.getLast();
    if (!last) return 3;
    const daysSinceLast = (Date.now() - last.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceLast < 1) return 6;
    if (daysSinceLast > 5) return 2;
    return 4;
  }

  getWeightTrend() {
    // Этот метод не зависит от ProgressTracker — оставляем как есть
    const raw = localStorage.getItem('morphe-weight-entries');
    if (!raw) return 'neutral';
    try {
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries) || entries.length < 2) return 'neutral';
      const sorted = entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const weeks = Math.max(1, (new Date(last.date) - new Date(first.date)) / (7 * 24 * 60 * 60 * 1000));
      const changePerWeek = (last.weight - first.weight) / weeks;
      const goal = this.profile?.goal;
      if (goal === 'lose') {
        if (changePerWeek < -0.3) return 'good';
        if (changePerWeek > 0) return 'bad';
        return 'slow';
      } else if (goal === 'gain') {
        if (changePerWeek > 0.3) return 'good';
        if (changePerWeek < 0) return 'bad';
        return 'slow';
      }
      return 'neutral';
    } catch (e) {
      console.warn('Ошибка при анализе веса:', e);
      return 'neutral';
    }
  }

  async getWorkoutConsistency() {
    const workouts = await this.getWorkouts();
    const weekly = workouts.getWeeklyCount();
    const goal = this.profile?.goal || 'maintain';
    if ((goal === 'gain' && weekly >= 3) || (goal === 'lose' && weekly >= 2)) {
      return 'good';
    }
    if (weekly === 0) return 'bad';
    return 'slow';
  }

  async getReadinessScore() {
    const now = Date.now();
    if (this._lastAnalysis && now - this._analysisTimestamp < this._cacheTTL) {
      return this._lastAnalysis.readinessScore;
    }

    const fatigue = await this.getFatigueLevel();
    const weightTrend = this.getWeightTrend();
    const consistency = await this.getWorkoutConsistency();

    let score = 7;
    if (fatigue > 6) score -= 2;
    if (fatigue < 3) score += 1;
    if (weightTrend === 'bad') score -= 1;
    if (weightTrend === 'good') score += 1;
    if (consistency === 'bad') score -= 2;
    if (consistency === 'good') score += 1;

    const finalScore = Math.max(1, Math.min(10, Math.round(score)));

    this._lastAnalysis = {
      fatigue,
      weightTrend,
      consistency,
      readinessScore: finalScore,
      loadRecommendation: this._getLoadRecommendationFromScore(finalScore),
      advice: this._getAdviceFromRecommendation(this._getLoadRecommendationFromScore(finalScore))
    };
    this._analysisTimestamp = now;
    return finalScore;
  }

  _getLoadRecommendationFromScore(score) {
    if (score >= 8) return 'increase';
    if (score >= 5) return 'maintain';
    return 'reduce';
  }

  async getLoadRecommendation() {
    await this.getReadinessScore();
    return this._lastAnalysis.loadRecommendation;
  }

  _getAdviceFromRecommendation(rec) {
    const adviceMap = {
      increase: "Вы в отличной форме! Время увеличить нагрузку и двигаться дальше.",
      maintain: "Сохраняйте текущий темп — вы на правильном пути.",
      reduce: "Ваше тело просит отдыха. Снизьте интенсивность, восстановитесь."
    };
    return adviceMap[rec] || adviceMap.maintain;
  }

  async getAdaptiveAdvice() {
    await this.getReadinessScore();
    return this._lastAnalysis.advice;
  }

  async getFullAnalysis() {
    await this.getReadinessScore();
    return { ...this._lastAnalysis };
  }
}