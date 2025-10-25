// /core/HomeDashboard.js
// v1.2.0 — Интеграция обратной связи с AIAssistant

import { UserService } from '/services/userService.js';

export class HomeDashboard {
  constructor() {
    this.profile = null;
    this.nutritionPlan = null;
    this.aiAssistant = null;        // ← сохраняем экземпляр ИИ
    this.currentAdvice = null;      // ← сохраняем текущий совет
  }

  async init() {
    try {
      this.profile = await this.loadProfile();
      this.nutritionPlan = UserService.getNutritionPlan();

      if (!this.profile) {
        this.showGuestView();
        return;
      }

      // Инициализируем ИИ один раз
      const { AIAssistant } = await import('/core/aiAssistant.js');
      this.aiAssistant = new AIAssistant();

      // Обновляем UI
      this.updateGreeting();
      this.updateWeightAndGoal();
      await this.updateWeightDisplay();
      this.updateLastWorkout();
      this.updateReadiness();
      this.updateCTA();
      await this.updateAISuggestion(); // ← теперь с обратной связью
    } catch (err) {
      console.error('❌ Ошибка HomeDashboard:', err);
      this.showError("Не удалось загрузить данные.");
    }
  }

  loadProfile() {
    const profile = UserService.getProfile();
    return Promise.resolve(profile ? profile.data : null);
  }

  updateGreeting() {
    const el = document.getElementById('user-greeting');
    if (el && this.profile) {
      el.textContent = this.profile.name;
    }
  }

  updateWeightAndGoal() {
    const el = document.getElementById('current-stats');
    if (!el || !this.profile) return;

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

  async updateWeightDisplay() {
    const el = document.getElementById('current-stats');
    if (!el || !this.profile) return;

    try {
      const { ProgressTracker } = await import('/modules/progressTracker.js');
      const tracker = new ProgressTracker();
      const last = tracker.getLast();

      if (last) {
        const weightEl = el.querySelector('.stat-row:first-child strong');
        if (weightEl) {
          weightEl.textContent = `⚖️ ${last.weight} кг`;
        }
      }
    } catch (err) {
      console.warn('Не удалось обновить вес из трекера:', err);
    }
  }

  async updateLastWorkout() {
    const el = document.getElementById('last-workout');
    if (!el) return;

    try {
      const { WorkoutTracker } = await import('/modules/workoutTracker.js');
      const tracker = new WorkoutTracker();
      const last = tracker.getLast();

      if (last) {
        const date = new Date(last.timestamp);
        const day = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
        el.innerHTML = `<strong>${day}</strong>: ${last.programName || last.workoutName}`;
      } else {
        el.textContent = '—';
      }
    } catch (err) {
      console.warn('Не удалось загрузить последнюю тренировку:', err);
      el.textContent = '—';
    }
  }

  async updateReadiness() {
    const el = document.getElementById('readiness-score');
    if (!el) return;

    try {
      const { AdaptiveEngine } = await import('/modules/adaptiveEngine.js');
      const engine = new AdaptiveEngine();
      await engine.loadProfile();

      const score = engine.getReadinessScore();
      el.innerHTML = `
        <div class="score-badge" data-readiness="${score}">
          ${this.getReadinessEmoji(score)} Уровень: ${score}/10
        </div>
        <small>${this.getReadinessAdvice(score)}</small>
      `;
    } catch (err) {
      console.warn('Не удалось рассчитать готовность:', err);
      const today = new Date().getDay();
      const isHighLoadDay = [1, 3, 5].includes(today);
      const score = isHighLoadDay ? 7 : 9;
      el.innerHTML = `
        <div class="score-badge" data-readiness="${score}">
          ${this.getReadinessEmoji(score)} Уровень: ${score}/10
        </div>
        <small>${this.getReadinessAdvice(score)}</small>
      `;
    }
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

  // === ОБНОВЛЁННЫЙ МЕТОД С ОБРАТНОЙ СВЯЗЬЮ ===
  async updateAISuggestion() {
    const el = document.getElementById('ai-suggestion');
    if (!el || !this.aiAssistant) return;

    try {
      const advice = await this.aiAssistant.generateAdvice();
      this.currentAdvice = advice; // сохраняем для обратной связи

      // Формируем HTML с кнопками
      el.innerHTML = `
        <div class="ai-advice-card">
          <div class="ai-badge">${advice.emoji || '💡'}</div>
          <div class="ai-text">
            <strong>${advice.title}</strong>
            <small>${advice.message}</small>
          </div>
          <div class="ai-actions">
            <button class="btn btn-sm btn-outline" data-reaction="accepted">Понятно</button>
            <button class="btn btn-sm btn-outline" data-reaction="ignored">Напомнить позже</button>
            <button class="btn btn-sm btn-outline" data-reaction="not_helpful">Не помогло</button>
          </div>
        </div>
      `;

      // Навешиваем обработчики
      el.querySelectorAll('.ai-actions button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const reaction = e.target.dataset.reaction;
          if (this.currentAdvice && this.aiAssistant) {
            this.aiAssistant.recordAdviceFeedback(this.currentAdvice.id, reaction);
            // Опционально: обновить совет сразу
            setTimeout(() => this.updateAISuggestion(), 300);
          }
        });
      });

    } catch (err) {
      console.warn('Совет ИИ недоступен:', err);
      el.innerHTML = '<small>Советы временно недоступны.</small>';
    }
  }

  showGuestView() {
    const el = document.getElementById('user-greeting');
    if (el) el.textContent = 'Пользователь';

    const stats = document.getElementById('current-stats');
    if (stats) {
      stats.innerHTML = `<p><a href="/pages/profile.html" class="link-primary">Заполните профиль</a>, чтобы увидеть свои данные.</p>`;
    }
  }

  showError(message) {
    const el = document.getElementById('dashboardStatus') || document.body;
    el.innerHTML = `<p class="error-text">${message}</p>`;
  }
}