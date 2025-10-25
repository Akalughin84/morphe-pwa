// /modules/adaptiveEngine.js
// v1.2.0 — Улучшения: адаптация под травмы, мягкие био-штрафы, анализ веса за 14 дней, кэш 5 мин
// Сохранена 100% совместимость с v1.1.0

import { StorageManager } from '/utils/storage.js';

export class AdaptiveEngine {
  constructor() {
    this._workouts = null;
    this._progress = null;
    this._profile = null;
    this._lastAnalysis = null;
    this._analysisTimestamp = 0;
    this._cacheTTL = 5 * 60 * 1000; // 5 минут (было 1 секунда)
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
    const raw = localStorage.getItem('morphe-weight-entries');
    if (!raw) return 'neutral';
    try {
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries) || entries.length < 2) return 'neutral';

      // Анализируем только последние 14 дней
      const now = new Date();
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(now.getDate() - 14);

      const recentEntries = entries
        .filter(e => new Date(e.date) >= twoWeeksAgo)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (recentEntries.length < 2) return 'neutral';

      const first = recentEntries[0];
      const last = recentEntries[recentEntries.length - 1];
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

  async getRecoveryStatus() {
    const workouts = await this.getWorkouts();
    const last = workouts.getLast();
    
    if (!last) return { rpe: null, doms: null, needsRecovery: false, skippedExercises: [] };

    const rpe = last.rpe ? parseFloat(last.rpe) : null;
    const doms = last.doms ? parseInt(last.doms) : null;
    const skipped = Array.isArray(last.skippedExercises) ? last.skippedExercises : [];

    const needsRecovery = (rpe >= 9 || doms >= 4);

    return { rpe, doms, needsRecovery, skippedExercises: skipped };
  }

  // === УЛУЧШЕНО: Мягкие биологические штрафы (макс. -3) ===
  _getBiologicalPenalty() {
    if (!this._profile) return 0;

    let penalty = 0;

    // Курение
    if (this._profile.smoking === 'regular') penalty += 0.8;
    else if (this._profile.smoking === 'occasional') penalty += 0.4;

    // Алкоголь
    if (this._profile.alcohol === 'frequent') penalty += 0.8;
    else if (this._profile.alcohol === 'occasional') penalty += 0.4;

    // Анализы
    if (this._profile.hemoglobin !== null && this._profile.hemoglobin < 120) {
      penalty += 0.5;
    }
    if (this._profile.vitaminD !== null && this._profile.vitaminD < 20) {
      penalty += 0.5;
    }

    // Хронические заболевания
    const chronic = this._profile.chronicConditions || [];
    if (chronic.includes('heart') || chronic.includes('hypertension')) {
      penalty += 1.0;
    }
    if (chronic.includes('diabetes')) {
      penalty += 0.3;
    }

    // Максимальный штраф — 3 балла
    return Math.min(3.0, penalty);
  }

  async getReadinessScore() {
    const now = Date.now();
    if (this._lastAnalysis && now - this._analysisTimestamp < this._cacheTTL) {
      return this._lastAnalysis.readinessScore;
    }

    await this.loadProfile();
    const fatigue = await this.getFatigueLevel();
    const weightTrend = this.getWeightTrend();
    const consistency = await this.getWorkoutConsistency();
    const recovery = await this.getRecoveryStatus();
    const biologicalPenalty = this._getBiologicalPenalty();

    let score = 7;
    if (fatigue > 6) score -= 2;
    if (fatigue < 3) score += 1;
    if (weightTrend === 'bad') score -= 1;
    if (weightTrend === 'good') score += 1;
    if (consistency === 'bad') score -= 2;
    if (consistency === 'good') score += 1;
    if (recovery.needsRecovery) score -= 2;

    // Применяем смягчённый биологический штраф
    score -= biologicalPenalty;

    const finalScore = Math.max(1, Math.min(10, Math.round(score)));

    this._lastAnalysis = {
      fatigue,
      weightTrend,
      consistency,
      recovery,
      biologicalPenalty,
      readinessScore: finalScore,
      loadRecommendation: this._getLoadRecommendationFromScore(finalScore),
      advice: this._getAdviceFromRecommendation(finalScore)
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

  _getAdviceFromRecommendation(score) {
    if (score >= 8) return "Вы в отличной форме! Время увеличить нагрузку и двигаться дальше.";
    if (score >= 5) return "Сохраняйте текущий темп — вы на правильном пути.";
    return "Ваше тело просит отдыха. Снизьте интенсивность, восстановитесь.";
  }

  async getAdaptiveAdvice() {
    await this.getReadinessScore();
    return this._lastAnalysis.advice;
  }

  // === УЛУЧШЕНО: Учёт травм при генерации контекста ===
  async getNextSessionContext() {
    await this.getReadinessScore();
    const analysis = this._lastAnalysis;
    const profile = this.profile;

    let rpe = 7;
    let mood = 'normal';
    let volumeMultiplier = 1.0;
    let intensityMultiplier = 1.0;

    // Адаптация по общей готовности
    if (analysis.readinessScore <= 4) {
      rpe = 5;
      mood = 'tired';
      volumeMultiplier = 0.7;
      intensityMultiplier = 0.8;
    } else if (analysis.readinessScore >= 8) {
      rpe = 8;
      mood = 'energetic';
      volumeMultiplier = 1.2;
    }

    // Дополнительная осторожность при травмах
    const hasInjuries = profile?.injuries && profile.injuries.length > 0;
    if (hasInjuries) {
      mood = 'tired';
      rpe = Math.min(rpe, 6);
      volumeMultiplier = Math.min(volumeMultiplier, 0.8);
      intensityMultiplier = Math.min(intensityMultiplier, 0.8);
    }

    return {
      rpe,
      mood,
      volumeMultiplier,
      intensityMultiplier,
      recoveryStatus: analysis.recovery
    };
  }

  async getFullAnalysis() {
    await this.getReadinessScore();
    return { ...this._lastAnalysis };
  }
}