// core/analytics.js

export class AnalyticsEngine {
  constructor(profile, history) {
    this.profile = profile;
    this.history = history;
  }

  // === АНАЛИЗ ВЕСА ===
  analyzeWeightTrend() {
    const log = this.history.weights || [];
    if (log.length < 2) return { trend: 'insufficient_data' };

    const points = log.map(e => ({
      x: new Date(e.date).getTime(),
      y: e.weight
    }));

    const result = this.linearRegression(points);
    const weeklyChange = result.slope * (7 * 24 * 60 * 60 * 1000); // изменение за неделю

    let phase = 'stable';
    if (weeklyChange > 0.3) phase = 'gaining_fast';
    else if (weeklyChange > 0.1) phase = 'gaining';
    else if (weeklyChange < -0.3) phase = 'losing_fast';
    else if (weeklyChange < -0.1) phase = 'losing';

    return {
      trend: phase,
      weeklyChange: parseFloat(weeklyChange.toFixed(2)),
      rSquared: result.rSquared,
      forecast: this.forecastWeight(result)
    };
  }

  // === АНАЛИЗ СИЛЫ ===
  analyzeStrengthTrend(workoutLog) {
    const squat = this.extractExerciseTrend(workoutLog, ['squat', 'goblet_squat']);
    const bench = this.extractExerciseTrend(workoutLog, ['bench', 'db_bench_press']);

    return {
      squat: this.calculateProgress(squat),
      bench: this.calculateProgress(bench),
      overall: this.overallStrengthScore([squat, bench])
    };
  }

  extractExerciseTrend(log, keywords) {
    const data = [];

    log.forEach(workout => {
      workout.exercises?.forEach(ex => {
        if (keywords.some(k => ex.name.toLowerCase().includes(k))) {
          const weightMatch = ex.name.match(/(\d+) кг/) || 
                             ex.progression?.match(/(\d+) кг/) ||
                             [null, 0];
          const weight = parseFloat(weightMatch[1]) || 0;

          if (weight > 0) {
            data.push({
              date: new Date(workout.date).getTime(),
              weight
            });
          }
        }
      });
    });

    return data;
  }

  calculateProgress(data) {
    if (data.length < 2) return { progress: 'insufficient_data' };

    const sorted = data.sort((a, b) => a.date - b.date);
    const first = sorted[0].weight;
    const last = sorted[sorted.length - 1].weight;
    const change = last - first;
    const weeks = (sorted[sorted.length - 1].date - sorted[0].date) / (7 * 24 * 60 * 60 * 1000);

    return {
      start: first,
      current: last,
      change: parseFloat(change.toFixed(1)),
      weeks: parseFloat(weeks.toFixed(1)),
      weeklyGain: weeks > 0 ? parseFloat((change / weeks).toFixed(2)) : 0
    };
  }

  overallStrengthScore(progresses) {
    const gains = progresses
      .filter(p => p.weeklyGain)
      .map(p => p.weeklyGain);

    if (gains.length === 0) return 0;
    return parseFloat(gains.reduce((a, b) => a + b, 0) / gains.length).toFixed(2);
  }

  // === ПРОГНОЗ ВЕСА ===
  forecastWeight(regression, weeks = 8) {
    const now = Date.now();
    const futureDate = now + weeks * 7 * 24 * 60 * 60 * 1000;
    const predictedY = regression.intercept + regression.slope * futureDate;

    return {
      date: new Date(futureDate).toISOString().split('T')[0],
      weight: parseFloat(predictedY.toFixed(1)),
      weeks
    };
  }

  // === ЛИНЕЙНАЯ РЕГРЕССИЯ ===
  linearRegression(points) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
    const n = points.length;

    points.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
      sumYY += p.y * p.y;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictedYs = points.map(p => ({ y: intercept + slope * p.x }));
    const tss = sumYY - (sumY * sumY) / n;
    let rss = 0;
    predictedYs.forEach((py, i) => {
      const residual = points[i].y - py.y;
      rss += residual * residual;
    });

    const rSquared = Math.abs(tss) < 1e-8 ? 0 : 1 - rss / tss;

    return { slope, intercept, rSquared };
  }

  // === СВОДКА ДЛЯ DASHBOARD ===
  getDashboardSummary() {
    const weightAnalysis = this.analyzeWeightTrend();
    const strength = this.analyzeStrengthTrend(this.history.workouts || []);

    return {
      weight: {
        trend: weightAnalysis.trend,
        weeklyChange: weightAnalysis.weeklyChange,
        forecast: weightAnalysis.forecast
      },
      strength: {
        score: strength.overall,
        squat: strength.squat.change,
        bench: strength.bench.change
      },
      nutrition: this.getNutritionInsight(),
      readiness: this.getReadinessScore()
    };
  }

  getNutritionInsight() {
    const daily = this.history.dailyNutrition?.slice(-7) || [];
    const avgProtein = daily.length ? daily.reduce((a, b) => a + b.protein, 0) / daily.length : 0;
    const target = Math.round(2.2 * this.profile.weight);

    if (avgProtein < target * 0.8) {
      return `📉 Белок ниже нормы: ${Math.round(avgProtein)} из ${target} г`;
    }
    return `✅ Белок в норме: ${Math.round(avgProtein)} г/день`;
  }

  getReadinessScore() {
    const adherence = this.getAdherence();
    const fatigue = this.getFatigue();

    let score = 10;
    if (adherence < 0.5) score -= 4;
    if (fatigue > 6) score -= 3;
    if (!this.hasRecentWorkout()) score -= 2;

    return Math.max(1, score);
  }

  getAdherence() {
    const lastWeek = this.history.workouts?.slice(-7) || [];
    const completed = lastWeek.filter(w => w.completed).length;
    return completed / 7;
  }

  getFatigue() {
    const recent = this.history.workouts?.slice(-7) || [];
    return recent.filter(w => w.intensity > 7).length;
  }

  hasRecentWorkout() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (this.history.workouts || []).some(w => new Date(w.date).getTime() > weekAgo);
  }
}