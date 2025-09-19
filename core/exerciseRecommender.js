// core/exerciseRecommender.js

export class ExerciseRecommender {
  constructor(exercises) {
    this.exercises = exercises;
  }

  // Основной метод: найти замены
  getAlternatives(exerciseId, userInjuries = []) {
    const original = this.exercises.find(e => e.id === exerciseId);
    if (!original) return [];

    // Фильтр 1: не использовать упражнения с риском для травм
    const safeExercises = this.exercises.filter(ex => {
      return !userInjuries.some(injury => ex.injuryRisk.includes(injury));
    });

    // Фильтр 2: совпадение по activityType (push, pull, legs)
    const matchingType = safeExercises.filter(ex => ex.activityType === original.activityType);

    // Фильтр 3: совпадение по category или mechanics
    const highPriority = matchingType.filter(ex => 
      ex.category === original.category || 
      ex.mechanics === original.mechanics
    );

    // Фильтр 4: по primary muscle group
    const byMuscle = matchingType.filter(ex => 
      this.hasMatchingPrimaryMuscle(ex, original)
    );

    // Объединяем и убираем дубли
    const all = [...new Set([...highPriority, ...byMuscle])];

    // Исключаем оригинал
    return all.filter(ex => ex.id !== exerciseId);
  }

  hasMatchingPrimaryMuscle(ex1, ex2) {
    const primary1 = new Set(ex1.muscleGroup.primary);
    const primary2 = new Set(ex2.muscleGroup.primary);
    
    for (let muscle of primary1) {
      if (primary2.has(muscle)) return true;
    }
    return false;
  }

  // Получить упражнения по группе мышц
  getByMuscleGroup(muscle, userInjuries = []) {
    return this.exercises.filter(ex => {
      if (userInjuries.some(injury => ex.injuryRisk.includes(injury))) return false;
      return ex.muscleGroup.primary.includes(muscle) || ex.muscleGroup.secondary.includes(muscle);
    });
  }

  // Получить упражнения по оборудованию
  getByEquipment(equipment, userInjuries = []) {
    return this.exercises.filter(ex => {
      if (userInjuries.some(injury => ex.injuryRisk.includes(injury))) return false;
      return ex.equipment.includes(equipment);
    });
  }
}