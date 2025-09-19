// modules/workoutGenerator.js

export class WorkoutGenerator {
  constructor() {
    this.exercises = [];
    this.programs = [];
    this.currentProgram = null;
  }

  async loadExercises() {
    const response = await fetch('../data/exercises.json');
    const data = await response.json();
    this.exercises = data.exercises;
  }

  async loadPrograms() {
    const response = await fetch('../data/programs.json');
    const data = await response.json();
    this.programs = data.programs;
  }

  selectProgram(profile) {
    // Выбираем программу по цели и опыту
    let available = this.programs.filter(p => 
      p.forGoals.includes(profile.goal) && 
      p.forExperience.includes(profile.experience)
    );

    if (profile.availableDays === 3) {
      return this.programs.find(p => p.id === 'fullBody');
    } else {
      return available.find(p => p.id === 'upperLower') || available[0];
    }
  }

  getExercisesForType(type, profile) {
    return this.exercises
      .filter(ex => ex.type === type)
      .filter(ex => this.isEquipmentAvailable(ex, profile.equipment))
      .filter(ex => !this.hasContraindication(ex, profile.injuries))
      .slice(0, 5); // 5 упражнений
  }

  isEquipmentAvailable(exercise, userEquipment) {
    if (userEquipment.includes('none')) return exercise.equipment.includes('none');
    return exercise.equipment.some(eq => userEquipment.includes(eq));
  }

  hasContraindication(exercise, injuries) {
    return injuries.length > 0 && 
           exercise.contraindications.some(c => injuries.includes(c));
  }

  async generate(profile) {
    await this.loadExercises();
    await this.loadPrograms();

    const selectedProgram = this.selectProgram(profile);
    const weeklyPlan = [];

    for (let dayData of selectedProgram.split) {
      if (dayData.type === 'rest') {
        weeklyPlan.push(dayData);
      } else {
        const exercises = this.getExercisesForType(dayData.type, profile);
        weeklyPlan.push({
          ...dayData,
          exercises: exercises
        });
      }
    }

    this.currentProgram = weeklyPlan;
    localStorage.setItem('morphe_workout_plan', JSON.stringify(weeklyPlan));
    console.log("✅ Программа сгенерирована:", weeklyPlan);
    return weeklyPlan;
  }
}