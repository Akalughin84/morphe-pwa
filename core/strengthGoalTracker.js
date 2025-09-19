// core/strengthGoalTracker.js

export class StrengthGoalTracker {
  constructor(profile, history) {
    this.profile = profile;
    this.history = history;
    this.goal = null;
  }

  // Установка цели
  setGoal(exerciseId, exerciseName, targetWeight, targetWeeks = 8) {
    this.goal = {
      exerciseId,
      exerciseName,
      targetWeight,
      targetWeeks,
      startDate: new Date().toISOString().split('T')[0],
      achieved: false,
      progress: 0,
      milestones: this.generateMilestones(targetWeight, targetWeeks)
    };

    this.updateProgress();
    this.save();
    return this.goal;
  }

  generateMilestones(targetWeight, weeks) {
    const currentWeight = this.getCurrentMax() || (targetWeight * 0.8);
    const diff = targetWeight - currentWeight;
    const step = diff / weeks;

    return Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      target: Math.round((currentWeight + step * (i + 1)) * 10) / 10,
      achieved: false,
      date: this.addWeeks(new Date(), i + 1)
    }));
  }

  // Обновление прогресса
  updateProgress() {
    if (!this.goal) return;

    const current = this.getCurrentMax();
    const start = this.getStartingMax();

    const progressRaw = (current - start) / (this.goal.targetWeight - start);
    this.goal.progress = Math.min(100, Math.max(0, Math.round(progressRaw * 100)));

    this.goal.achieved = current >= this.goal.targetWeight;

    // Отметка вех
    this.goal.milestones.forEach(m => {
      if (!m.achieved && current >= m.target) {
        m.achieved = true;
      }
    });

    return this.goal;
  }

  // Текущий максимальный вес
  getCurrentMax() {
    const tracker = this.history?.workoutTracker || [];
    const arr = Array.isArray(tracker) ? tracker : [];

    let max = 0;

    for (let workout of arr) {
      for (const day of workout.program || []) {
        for (const ex of day.exercises || []) {
          if (ex.id === this.goal?.exerciseId && ex.completedSets?.length > 0) {
            const sessionMax = Math.max(...ex.completedSets.map(s => s.weight));
            if (sessionMax > max) max = sessionMax;
          }
        }
      }
    }

    return max || 0;
  }

  // Начальный вес (на момент цели)
  getStartingMax() {
    const tracker = this.history?.workoutTracker || [];
    const arr = Array.isArray(tracker) ? tracker : [];
    const goalDate = new Date(this.goal.startDate);

    let max = 0;

    for (let workout of arr) {
      const workoutDate = new Date(workout.date);
      if (workoutDate < goalDate) continue;

      for (const day of workout.program || []) {
        for (const ex of day.exercises || []) {
          if (ex.id === this.goal.exerciseId && ex.completedSets?.length > 0) {
            const sessionMax = Math.max(...ex.completedSets.map(s => s.weight));
            if (sessionMax > max) max = sessionMax;
          }
        }
      }
    }

    return max || this.goal.targetWeight * 0.8; // fallback
  }

  // Получение статуса
  getStatus() {
    if (!this.goal) return { active: false };

    this.updateProgress();

    const today = new Date();
    const end = new Date(this.goal.startDate);
    end.setDate(end.getDate() + this.goal.targetWeeks * 7);

    const totalDays = (end - new Date(this.goal.startDate)) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today - new Date(this.goal.startDate)) / (1000 * 60 * 60 * 24);
    const week = Math.min(this.goal.targetWeeks, Math.ceil(elapsedDays / 7));

    const current = this.getCurrentMax();
    const neededPerWeek = (this.goal.targetWeight - current) / (this.goal.targetWeeks - week);

    return {
      active: true,
      goal: this.goal,
      currentWeight: current,
      currentWeek: week,
      daysLeft: Math.max(0, Math.round(totalDays - elapsedDays)),
      progress: this.goal.progress,
      nextMilestone: this.goal.milestones.find(m => !m.achieved) || null,
      encouragement: this.getEncouragement(this.goal.progress),
      weeklyGainNeeded: neededPerWeek > 0 ? neededPerWeek.toFixed(2) : 0
    };
  }

  getEncouragement(progress) {
    if (progress < 20) return "Начало всегда сложнее всего. Главное — начать.";
    if (progress < 50) return "Полпути пройдено! Не сбавляй темп.";
    if (progress < 80) return "Ты близок к цели! Осталось немного.";
    if (progress < 100) return "Финишный рывок! Каждый день приближает тебя к лучшей версии себя.";
    return "🎉 Поздравляю! Ты достиг цели. Теперь — следующая!";
  }

  addWeeks(date, weeks) {
    const result = new Date(date);
    result.setDate(result.getDate() + weeks * 7);
    return result.toISOString().split('T')[0];
  }

  save() {
    localStorage.setItem('morphe_strength_goal', JSON.stringify(this.goal));
  }

  load() {
    const saved = localStorage.getItem('morphe_strength_goal');
    if (saved) {
      try {
        this.goal = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load strength goal:", e);
      }
    }
  }
}