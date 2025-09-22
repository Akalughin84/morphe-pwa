export class GoalTracker {
  track(goalType, target, currentValue) {
    const progress = (currentValue / target) * 100;
    return {
      progress: Math.min(100, progress),
      completed: progress >= 100
    };
  }
}