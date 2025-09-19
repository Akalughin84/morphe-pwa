// modules/workoutTracker.js

export class WorkoutTracker {
  constructor() {
    this.history = this.load(); // Должен быть массивом
  }

  load() {
    try {
      const saved = localStorage.getItem('morphe_workout_history');
      const parsed = saved ? JSON.parse(saved) : [];
      
      // Убедимся, что это массив
      if (!Array.isArray(parsed)) {
        console.warn('История тренировок не является массивом. Сброс.');
        return [];
      }
      
      return parsed;
    } catch (e) {
      console.error('Ошибка парсинга истории тренировок:', e);
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem('morphe_workout_history', JSON.stringify(this.history));
    } catch (e) {
      console.error('Не удалось сохранить историю:', e);
    }
  }

  logWorkout(workoutPlan, userInputs, feedback = '') {
    const completedWorkout = {
      id: Date.now(),
      date: new Date().toISOString(),
      dayOfWeek: new Date().toLocaleDateString('ru-RU', { weekday: 'long' }),
      program: workoutPlan.map(day => ({
        ...day,
        exercises: day.exercises.map(ex => {
          const userEx = userInputs.find(u => u.exerciseId === ex.id);
          return {
            id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.rest,
            completedSets: userEx?.completedSets || [],
            note: ex.note
          };
        })
      })),
      feedback,
      duration: this.estimateDuration(workoutPlan),
      summary: this.generateSummary(workoutPlan, userInputs)
    };

    this.history.push(completedWorkout);
    this.save();
    return completedWorkout;
  }

  generateSummary(plan, inputs) {
    const totalSets = inputs.reduce((acc, ex) => acc + ex.completedSets.length, 0);
    const completedReps = inputs.reduce((acc, ex) => 
      acc + ex.completedSets.reduce((sum, s) => sum + s.reps, 0), 0);

    const rpes = inputs.flatMap(ex => ex.completedSets.map(s => s.rpe)).filter(r => r);
    const avgRPE = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null;

    return { totalSets, completedReps, avgRPE };
  }

  estimateDuration(plan) {
    let seconds = 0;
    plan.forEach(day => {
      day.exercises.forEach(ex => {
        const sets = parseInt(ex.sets) || 4;
        const restSec = ex.rest.includes('90') ? 90 : ex.rest.includes('75') ? 75 : 60;
        seconds += sets * restSec;
      });
    });
    return Math.round(seconds / 60);
  }

  getLastPerformance(exerciseId) {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const workout = this.history[i];
      for (const day of workout.program) {
        const ex = day.exercises.find(e => e.id === exerciseId);
        if (ex && ex.completedSets && ex.completedSets.length > 0) {
          const lastSet = ex.completedSets[ex.completedSets.length - 1];
          return {
            weight: lastSet.weight,
            reps: lastSet.reps,
            rpe: lastSet.rpe,
            date: workout.date.split('T')[0]
          };
        }
      }
    }
    return null;
  }

  getExerciseHistory(exerciseId) {
    const history = [];

    this.history.forEach(workout => {
      workout.program.forEach(day => {
        day.exercises.forEach(ex => {
          if (ex.id === exerciseId && ex.completedSets && ex.completedSets.length > 0) {
            ex.completedSets.forEach(set => {
              history.push({
                x: workout.date.split('T')[0],
                y: set.weight,
                reps: set.reps,
                rpe: set.rpe
              });
            });
          }
        });
      });
    });

    return history;
  }
}