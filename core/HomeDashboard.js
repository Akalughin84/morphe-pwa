// /core/HomeDashboard.js

import { UserService } from '/services/userService.js';
import { StorageManager } from '/utils/storage.js';

/**
 * HomeDashboard — управляет главной страницей
 * Показывает: имя, вес, цель, прогресс, совет
 */
export class HomeDashboard {
  constructor() {
    this.profile = null;
    this.nutritionPlan = null;
  }

  /**
   * Инициализация: загрузка данных, обновление UI
   */
  async init() {
    try {
      // Получаем данные
      this.profile = await this.loadProfile();
      this.nutritionPlan = UserService.getNutritionPlan();

      if (!this.profile) {
        this.showGuestView();
        return;
      }

      // Обновляем интерфейс
      this.updateGreeting();
      await this.updateWeightAndGoal();
      this.updateWeightAndGoal();
      this.updateLastWorkout();
      this.updateReadiness();
      this.updateCTA();

    } catch (err) {
      console.error('❌ Ошибка HomeDashboard:', err);
      this.showError("Не удалось загрузить данные.");
    }
  }

  /**
   * Загружает профиль через UserService
   */
  loadProfile() {
    return new Promise((resolve) => {
      const profile = UserService.getProfile();
      resolve(profile ? profile.data : null);
    });
  }

  /**
   * Приветствие
   */
  updateGreeting() {
    const el = document.getElementById('user-greeting');
    if (el && this.profile) {
      el.textContent = this.profile.name;
    }
  }

  /**
   * Вес и цель
   */
  updateWeightAndGoal() {
    const el = document.getElementById('current-stats');
    if (!el) return;

    const goalLabels = {
      lose: 'Сбросить вес',
      maintain: 'Поддерживать форму',
      gain: 'Набрать массу'
    };

    el.innerHTML = `
      <div class="stat-row">
        <strong>⚖️ ${this.profile.weight} кг</strong>
        <small>Рост ${this.profile.height} см • ${this.profile.age} лет</small>
      </div>
      <div class="stat-row">
        <strong>🎯 ${goalLabels[this.profile.goal] || '—'}</strong>
      </div>
    `;
  }

  /**
   * Последняя тренировка (из localStorage)
   */
  updateLastWorkout() {
    const el = document.getElementById('last-workout');
    if (!el) return;

    const last = StorageManager.getItem('morphe-last-workout');
    if (last) {
      const date = new Date(last.timestamp);
      const day = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
      el.innerHTML = `<strong>${day}</strong>: ${last.workoutName}`;
    } else {
      el.textContent = '—';
    }
  }

    /**
   * Отображение последнего веса
   */
  async updateWeightDisplay() {
    const el = document.getElementById('current-stats');
    if (!el || !this.profile) return;

    const tracker = new (await import('../modules/progressTracker.js')).ProgressTracker();
    const last = tracker.getLast();

    if (last) {
      el.querySelector('.stat-row:first-child strong').textContent = `⚖️ ${last.weight} кг`;
    }
    // Если нет — остаётся вес из профиля
  }

  /**
   * Уровень готовности (заглушка AI-анализа)
   */
  updateReadiness() {
    const el = document.getElementById('readiness-score');
    if (!el) return;

    // Имитация анализа: на основе активности, цели, дня недели
    const today = new Date().getDay(); // 0 — вс, 6 — сб
    const isHighLoadDay = [1, 3, 5].includes(today); // Пн, Ср, Пт — силовые
    const readiness = isHighLoadDay ? 7 : 9;

    el.innerHTML = `
      <div class="score-badge" data-readiness="${readiness}">
        ${this.getReadinessEmoji(readiness)} Уровень: ${readiness}/10
      </div>
      <small>${this.getReadinessAdvice(readiness)}</small>
    `;
  }

  getReadinessEmoji(score) {
    if (score >= 8) return '🟢';
    if (score >= 6) return '🟡';
    return '🔴';
  }

  getReadinessAdvice(score) {
    if (score >= 8) return 'Отличная готовность! Идеальный день для прогресса.';
    if (score >= 6) return 'Хорошо, но слушай тело. Не форсируй.';
    return 'Низкая готовность. Лучше восстановление или лёгкая тренировка.';
  }

  /**
   * CTA: изменяем кнопку в зависимости от времени суток
   */
  updateCTA() {
    const cta = document.querySelector('.cta-button');
    if (!cta) return;

    const hour = new Date().getHours();
    let text = 'Начать мою трансформацию →';

    if (hour >= 5 && hour < 12) {
      text = 'Доброе утро! Начать день с тренировки? 💪';
    } else if (hour >= 12 && hour < 18) {
      text = 'Время активности! Готов к прогрессу? 🚀';
    } else {
      text = 'Последний шанс сегодня стать сильнее 🌙';
    }

    cta.textContent = text;
  }

  /**
   * Если профиль не заполнен
   */
  showGuestView() {
    const el = document.getElementById('user-greeting');
    if (el) el.textContent = 'Пользователь';

    const stats = document.getElementById('current-stats');
    if (stats) {
      stats.innerHTML = `<p><a href="/pages/profile.html" class="link-primary">Заполните профиль</a>, чтобы увидеть свои данные.</p>`;
    }
  }

    /**
   * Показывает краткий совет ИИ на главной
   */
  async updateAISuggestion() {
    const el = document.getElementById('ai-suggestion');
    if (!el) return;

    try {
      const ai = new (await import('../core/aiAssistant.js')).AIAssistant();
      const advice = await ai.generateAdvice();

      el.innerHTML = `
        <div class="ai-badge">${advice.emoji || '💡'}</div>
        <div class="ai-text">
          <strong>${advice.title}</strong>
          <small>${advice.message}</small>
        </div>
      `;
    } catch (err) {
      el.innerHTML = '<small>Советы временно недоступны.</small>';
    }
  }

  /**
   * Показ ошибки
   */
  showError(message) {
    const el = document.getElementById('dashboardStatus') || document.body;
    el.innerHTML = `<p class="error-text">${message}</p>`;
  }
}