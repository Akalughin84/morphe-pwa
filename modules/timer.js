// /modules/workoutTimer.js
// v1.1.0 — Надёжный таймер для тренировок

/**
 * WorkoutTimer — управляет таймером упражнения или отдыха
 */
export class WorkoutTimer {
  constructor() {
    this.interval = null;
    this.startTime = null;
    this.duration = 0;
    this.pausedAt = null;
  }

  /**
   * Запускает таймер
   * @param {number} durationSec — длительность в секундах
   * @param {function(number): void} onTick — вызывается каждую секунду с оставшимся временем
   * @param {function(): void} onComplete — вызывается по завершении
   * @returns {Object} контроллер таймера с методом stop()
   */
  start(durationSec, onTick, onComplete) {
    this.stop(); // остановить предыдущий, если есть

    this.duration = durationSec;
    this.startTime = Date.now();
    this.pausedAt = null;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, this.duration - elapsed);

      onTick?.(remaining);

      if (remaining <= 0) {
        this.stop();
        onComplete?.();
      }
    };

    // Первый тик сразу
    tick();

    // Затем каждую секунду
    this.interval = setInterval(tick, 1000);

    return {
      stop: () => this.stop(),
      isRunning: () => this.interval !== null
    };
  }

  /**
   * Остановить таймер
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * (Опционально) Поставить на паузу
   */
  pause() {
    if (this.interval) {
      this.pausedAt = Date.now();
      this.stop();
    }
  }

  /**
   * (Опционально) Возобновить после паузы
   */
  resume(onTick, onComplete) {
    if (this.pausedAt && this.startTime) {
      // Корректируем startTime, чтобы компенсировать паузу
      const pauseDuration = Date.now() - this.pausedAt;
      this.startTime += pauseDuration;
      this.pausedAt = null;
      this.interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const remaining = Math.max(0, this.duration - elapsed);
        onTick?.(remaining);
        if (remaining <= 0) {
          this.stop();
          onComplete?.();
        }
      }, 1000);
    }
  }
}