// /core/index.js
// v2.1.0 — Единая точка входа для всего ядра

export { HeaderController } from './HeaderController.js';
export { HomeDashboard } from './HomeDashboard.js';
export { ThemeManager } from './themeManager.js';

// AI и анализ
export { AIAssistant } from './aiAssistant.js';           // → /modules/aiAssistant.js
export { AdaptiveEngine } from '../modules/adaptiveEngine.js';
export { AnalyticsEngine } from './analytics.js';
export { AchievementEngine } from './achievementEngine.js';

// Планировщики
export { WorkoutPlanner } from './workoutPlanner.js';
export { MenuGenerator } from './menuGenerator.js';
export { ExerciseRecommender } from './exerciseRecommender.js';

// Трекеры (обёртки)
export { StrengthGoalTracker } from './strengthGoalTracker.js'; // → /modules/strengthGoalTracker.js

// Движки
export { NutritionEngine } from './nutritionEngine.js';