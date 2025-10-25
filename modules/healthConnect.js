// /modules/healthConnect.js
// v1.0.0 — Единый интерфейс для Apple HealthKit и Google Fit

export class HealthConnect {
  constructor() {
    this.isApple = 'health' in navigator && typeof navigator.health === 'object';
    this.isGoogle = typeof window !== 'undefined' && window.gapi;
    this.isSupported = this.isApple || this.isGoogle;
  }

  /**
   * Запрашивает разрешение на доступ к данным
   * @returns {Promise<boolean>}
   */
  async requestPermission() {
    if (this.isApple) {
      try {
        // Apple HealthKit (требует HTTPS и PWA)
        const types = [
          'sleep',
          'heartRateVariability',
          'stepCount',
          'heartRate'
        ];
        await navigator.health.requestAuthorization(types);
        return true;
      } catch (e) {
        console.warn('Apple Health: разрешение отклонено', e);
        return false;
      }
    }

    if (this.isGoogle) {
      try {
        // Google Fit (требует gapi и OAuth)
        await window.gapi.auth2.getAuthInstance().signIn();
        return true;
      } catch (e) {
        console.warn('Google Fit: разрешение отклонено', e);
        return false;
      }
    }

    return false;
  }

  /**
   * Получает данные сна за указанную дату
   * @param {Date} date — дата (по умолчанию — сегодня)
   * @returns {Promise<number|null>} — часы сна или null
   */
  async getSleepData(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    if (this.isApple) {
      try {
        const data = await navigator.health.query({
          startDate: start,
          endDate: end,
          dataType: 'sleep'
        });
        // HealthKit возвращает массив сессий сна
        const totalMinutes = data.reduce((sum, session) => sum + (session.value || 0), 0);
        return totalMinutes / 60; // в часах
      } catch (e) {
        console.warn('Apple Health: ошибка получения сна', e);
        return null;
      }
    }

    if (this.isGoogle) {
      try {
        const response = await fetch('/api/health/sleep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: start.toISOString().split('T')[0] })
        });
        if (response.ok) {
          const result = await response.json();
          return result.hours || null;
        }
      } catch (e) {
        console.warn('Google Fit: ошибка получения сна', e);
      }
    }

    return null;
  }

  /**
   * Получает HRV (вариабельность сердечного ритма)
   * @param {Date} date
   * @returns {Promise<number|null>} — RMSSD или SDNN в мс
   */
  async getHRV(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    if (this.isApple) {
      try {
        const data = await navigator.health.query({
          startDate: start,
          endDate: end,
          dataType: 'heartRateVariability'
        });
        if (data.length > 0) {
          // Берём последнее измерение
          return data[0].value || null;
        }
      } catch (e) {
        console.warn('Apple Health: ошибка HRV', e);
      }
    }

    if (this.isGoogle) {
      try {
        const response = await fetch('/api/health/hrv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: start.toISOString().split('T')[0] })
        });
        if (response.ok) {
          const result = await response.json();
          return result.hrv || null;
        }
      } catch (e) {
        console.warn('Google Fit: ошибка HRV', e);
      }
    }

    return null;
  }

  /**
   * Получает шаги за день
   */
  async getStepCount(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    if (this.isApple) {
      try {
        const data = await navigator.health.query({
          startDate: start,
          endDate: end,
          dataType: 'stepCount'
        });
        return data.reduce((sum, d) => sum + (d.value || 0), 0);
      } catch (e) {
        console.warn('Apple Health: шаги', e);
      }
    }

    if (this.isGoogle) {
      try {
        const response = await fetch('/api/health/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: start.toISOString().split('T')[0] })
        });
        if (response.ok) {
          const result = await response.json();
          return result.steps || 0;
        }
      } catch (e) {
        console.warn('Google Fit: шаги', e);
      }
    }

    return 0;
  }

  /**
   * Получает среднюю ЧСС за день
   */
  async getHeartRate(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    if (this.isApple) {
      try {
        const data = await navigator.health.query({
          startDate: start,
          endDate: end,
          dataType: 'heartRate'
        });
        if (data.length > 0) {
          const sum = data.reduce((s, d) => s + (d.value || 0), 0);
          return Math.round(sum / data.length);
        }
      } catch (e) {
        console.warn('Apple Health: ЧСС', e);
      }
    }

    return null;
  }

  /**
   * Возвращает объект с ключевыми метриками за день
   */
  async getDailyMetrics(date = new Date()) {
    const [sleep, hrv, steps, heartRate] = await Promise.all([
      this.getSleepData(date),
      this.getHRV(date),
      this.getStepCount(date),
      this.getHeartRate(date)
    ]);

    return {
      date: date.toISOString().split('T')[0],
      sleepHours: sleep,
      hrv: hrv,
      steps: steps,
      heartRate: heartRate,
      isSupported: this.isSupported
    };
  }
}