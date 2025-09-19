// core/adaptiveEngine.js

export class AdaptiveEngine {
  constructor(profile, history = {}) {
    this.profile = profile;
    this.history = history;
    this.state = null;
  }

  analyze() {
    const adherence = this.getAdherence();
    const fatigue = this.calculateFatigue();
    const injuryRisk = this.detectInjuryRisk();
    const progressTrend = this.getProgressTrend();

    // Вычисляем готовность, передавая нужные данные напрямую
    const readiness = this.calculateReadiness(adherence, fatigue);

    this.state = {
      phase: this.getPhase(fatigue, progressTrend),
      fatigue,
      injuryRisk,
      adherence,
      readiness,
      progressTrend
    };

    return this.state;
  }

  getPhase(fatigue, trend) {
    if (fatigue > 7) return 'deload';
    if (trend === 'plateau') return 'change_stimulus';
    return 'accumulation';
  }

  calculateFatigue() {
    const recentWorkouts = this.history.workouts?.slice(-7) || [];
    const intenseDays = recentWorkouts.filter(w => w.intensity > 7).length;

    if (intenseDays >= 5) return 8;
    if (intenseDays >= 3) return 5;
    return 2;
  }

  detectInjuryRisk() {
    if (!this.profile.injuries || this.profile.injuries.length === 0) return 'low';

    const riskyExercises = ['overhead_press', 'bench_press', 'squats'];
    const recentWorkouts = this.history.workouts?.slice(-3) || [];

    for (let workout of recentWorkouts) {
      if (workout.exercises?.some(e => riskyExercises.includes(e.id))) {
        return this.profile.injuries[0];
      }
    }

    return 'medium';
  }

  getAdherence() {
    const lastWeek = this.history.workouts?.slice(-7) || [];
    const completed = lastWeek.filter(w => w.completed).length;
    return completed / Math.max(1, lastWeek.length);
  }

  // 🔥 Ключевое исправление: принимаем данные извне
  calculateReadiness(adherence, fatigue) {
    let score = 10;

    if (adherence < 0.5) score -= 4;
    if (fatigue > 6) score -= 3;
    if (this.history.sleepAvg < 6) score -= 2;

    return Math.max(1, Math.round(score));
  }

  getProgressTrend() {
    const weights = this.history.weights?.slice(-4).map(w => w.weight) || [];
    if (weights.length < 2) return 'unknown';

    const diff = weights[weights.length - 1] - weights[0];
    return diff > 0.5 ? 'gaining' : diff < -0.5 ? 'losing' : 'plateau';
  }

  getRecommendation() {
    const { phase, fatigue, injuryRisk, adherence, progressTrend } = this.state;

    if (fatigue > 7) return 'deload';
    if (injuryRisk !== 'low') return 'modify_exercises';
    if (adherence < 0.4) return 'simplify';
    if (progressTrend === 'plateau') return 'change_stimulus';
    return 'continue_and_progress';
  }
}