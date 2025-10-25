// /config/achievements.js
// Метаданные достижений — описывают тип и минимальные условия
// Используется для документирования и будущей автоматизации

export const ACHIEVEMENTS = {
  first_profile: {
    type: 'profile',
    description: 'Заполнен профиль'
  },
  first_workout: {
    type: 'workout',
    description: 'Первая тренировка'
  },
  three_day_streak: {
    type: 'streak',
    minStreak: 3,
    description: '3 дня подряд — отличное начало!'
  },
  week_streak: {
    type: 'streak',
    minStreak: 7,
    description: '7 дней подряд с тренировками'
  },
  month_streak: {
    type: 'streak',
    minStreak: 30,
    description: '30 дней подряд'
  },
  ten_workouts: {
    type: 'workout_count',
    threshold: 10,
    description: '10 тренировок — ты в ритме!'
  },
  weight_progress: {
    type: 'progress',
    description: 'Прогресс по весу согласно цели'
  },
  first_goal: {
    type: 'goal',
    description: 'Выполнена первая цель'
  },
  silent_discipline: {
    type: 'ethics',
    minDaysSinceFirstUse: 7,
    description: '7 дней использования без посещения премиума'
  }
};