// core/goalTracker.js

export class GoalTracker {
  constructor(profile, history) {
    this.profile = profile;
    this.history = history;
    this.goal = null;
  }

  setGoal(type, target, weeks = 12) {
    if (!['muscle_gain', 'fat_loss'].includes(type)) {
      console.error('Invalid goal type:', type);
      return;
    }

    this.goal = {
      type,
      target,
      weeks,
      startDate: new Date().toISOString().split('T')[0],
      endDate: this.addWeeks(new Date(), weeks),
      completed: false,
      progress: 0,
      milestones: this.generateMilestones(target, weeks)
    };

    this.updateProgress();
    return this.goal;
  }

  generateMilestones(target, weeks) {
    const steps = [];
    const stepValue = target / weeks;

    for (let i = 1; i <= weeks; i++) {
      steps.push({
        week: i,
        target: Math.round(stepValue * i * 10) / 10,
        achieved: false,
        date: this.addWeeks(new Date(), i)
      });
    }

    return steps;
  }

  updateProgress() {
    if (!this.goal) return;

    const current = this.getCurrentValue();
    const progress = Math.min(100, Math.round((current / this.goal.target) * 100));
    
    this.goal.progress = progress;
    this.goal.completed = progress >= 100;

    this.goal.milestones.forEach(m => {
      if (!m.achieved && current >= m.target) {
        m.achieved = true;
      }
    });

    return this.goal;
  }

  getCurrentValue() {
    const log = this.history.weights || [];
    const last = log[log.length - 1];
    const first = log[0];

    if (this.goal.type === 'muscle_gain') {
      return last ? last.weight - (first ? first.weight : this.profile.weight) : 0;
    }

    if (this.goal.type === 'fat_loss') {
      return first ? first.weight - (last ? last.weight : first.weight) : 0;
    }

    return 0;
  }

  getStatus() {
    if (!this.goal) return { active: false };

    const today = new Date();
    const end = new Date(this.goal.endDate);
    const totalDays = (end - new Date(this.goal.startDate)) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today - new Date(this.goal.startDate)) / (1000 * 60 * 60 * 24);
    const week = Math.min(this.goal.weeks, Math.ceil(elapsedDays / 7));

    return {
      active: true,
      goal: this.goal,
      currentWeek: week,
      daysLeft: Math.max(0, Math.round(totalDays - elapsedDays)),
      phase: this.getPhase(week),
      nextMilestone: this.getNextMilestone(),
      encouragement: this.getEncouragement(this.goal.progress)
    };
  }

  getPhase(week) {
    const third = Math.floor(this.goal.weeks / 3);
    if (week <= third) return 'foundation';
    if (week <= third * 2) return 'intensify';
    return 'peak';
  }

  getNextMilestone() {
    return this.goal.milestones.find(m => !m.achieved) || null;
  }

  getEncouragement(progress) {
    if (progress < 20) return "Начало всегда сложнее всего. Главное — начать. Ты уже на пути.";
    if (progress < 50) return "Полпути пройдено! Не сбавляй темп — результаты скоро станут заметны.";
    if (progress < 80) return "Ты близок к цели! Осталось продержаться ещё немного — и победа твоя.";
    if (progress < 100) return "Вот он — финишный рывок! Каждый день приближает тебя к лучшей версии себя.";
    return "🎉 Поздравляю! Ты достиг цели. Теперь — следующая!";
  }

  addWeeks(date, weeks) {
    const result = new Date(date);
    result.setDate(result.getDate() + weeks * 7);
    return result.toISOString().split('T')[0];
  }

  save() {
    localStorage.setItem('morphe_current_goal', JSON.stringify(this.goal));
  }

  load() {
    const saved = localStorage.getItem('morphe_current_goal');
    if (saved) {
      this.goal = JSON.parse(saved);
    }
  }
}