// modules/simpleWorkout.js
// Version: 2.0.0

export class SimpleWorkoutGenerator {
  constructor() {
    this.exercises = this.getDefaultExercises();
  }

  // Базовые упражнения - всегда работают
  getDefaultExercises() {
    return [
      {
        id: "pushup",
        name: "Отжимания от пола",
        type: "push",
        equipment: "none",
        sets: 3,
        reps: "10-15",
        rest: 60
      },
      {
        id: "squat",
        name: "Приседания",
        type: "legs",
        equipment: "none",
        sets: 3,
        reps: "12-15",
        rest: 60
      },
      {
        id: "plank",
        name: "Планка",
        type: "core",
        equipment: "none",
        sets: 3,
        reps: "30-60 сек",
        rest: 30
      },
      {
        id: "db_press",
        name: "Жим гантелей лёжа",
        type: "push",
        equipment: "dumbbells",
        sets: 3,
        reps: "8-12",
        rest: 90
      },
      {
        id: "db_row",
        name: "Тяга гантели в наклоне",
        type: "pull",
        equipment: "dumbbells",
        sets: 3,
        reps: "10-12",
        rest: 90
      },
      {
        id: "lunges",
        name: "Выпады",
        type: "legs",
        equipment: "dumbbells",
        sets: 3,
        reps: "12 на ногу",
        rest: 60
      }
    ];
  }

  // Генерация простой программы
  generate(profile) {
    console.log("🔄 Генерация простой программы для:", profile);
    
    // Проверяем оборудование
    const hasDumbbells = profile.equipment && profile.equipment.includes("dumbbells");
    const equipment = hasDumbbells ? "dumbbells" : "none";
    
    // Создаем программу на 4 дня
    const program = {
      day1: {
        name: "День 1: Верх тело",
        type: "upper",
        exercises: this.getExercisesByType("push", equipment)
      },
      day2: {
        name: "День 2: Отдых",
        type: "rest",
        exercises: []
      },
      day3: {
        name: "День 3: Низ тело",
        type: "lower",
        exercises: this.getExercisesByType("legs", equipment)
      },
      day4: {
        name: "День 4: Отдых",
        type: "rest",
        exercises: []
      },
      day5: {
        name: "День 5: Все тело",
        type: "fullbody",
        exercises: [
          ...this.getExercisesByType("push", equipment, 1),
          ...this.getExercisesByType("legs", equipment, 1),
          ...this.getExercisesByType("core", equipment, 1)
        ]
      },
      day6: {
        name: "День 6: Отдых",
        type: "rest",
        exercises: []
      },
      day7: {
        name: "День 7: Отдых",
        type: "rest",
        exercises: []
      }
    };

    console.log("✅ Простая программа создана:", program);
    return program;
  }

  // Получить упражнения по типу
  getExercisesByType(type, equipment, limit = 2) {
    return this.exercises
      .filter(ex => ex.type === type && ex.equipment === equipment)
      .slice(0, limit)
      .map(ex => ({
        ...ex,
        recommendedWeight: equipment === "dumbbells" ? 10 : 0
      }));
  }

  // Сохранить программу
  saveProgram(program) {
    try {
      localStorage.setItem('morphe_simple_program', JSON.stringify(program));
      console.log("💾 Программа сохранена");
    } catch (err) {
      console.error("❌ Ошибка сохранения:", err);
    }
  }

  // Загрузить программу
  loadProgram() {
    try {
      const saved = localStorage.getItem('morphe_simple_program');
      if (saved) {
        console.log("📥 Программа загружена");
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error("❌ Ошибка загрузки:", err);
    }
    return null;
  }
}