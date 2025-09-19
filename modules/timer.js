// modules/timer.js

export class WorkoutTimer {
  constructor() {
    this.timers = new Map(); // хранит активные таймеры
  }

  init() {
    document.querySelectorAll('.timer-btn').forEach(btn => {
      if (btn.dataset.timerInit) return; // защита от дублирования
      btn.dataset.timerInit = 'true';

      const duration = parseInt(btn.dataset.duration) || 60;
      const display = btn.parentElement.querySelector('.timer-display') || this.createDisplay(btn);
      
      btn.addEventListener('click', () => this.start(btn, display, duration));
    });
  }

  createDisplay(btn) {
    const div = document.createElement('div');
    div.className = 'timer-display';
    div.textContent = '00:00';
    btn.parentElement.insertBefore(div, btn);
    return div;
  }

  start(button, display, duration) {
    // Останавливаем предыдущий таймер
    if (this.timers.has(button)) {
      clearInterval(this.timers.get(button));
      this.timers.delete(button);
    }

    let timeLeft = duration;
    display.textContent = this.formatTime(timeLeft);
    button.disabled = true;
    button.textContent = "Ожидание...";

    const interval = setInterval(() => {
      timeLeft--;
      display.textContent = this.formatTime(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
        this.timers.delete(button);
        button.disabled = false;
        button.textContent = "✅ Готово!";
        this.playBeep();
      }
    }, 1000);

    this.timers.set(button, interval);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  playBeep() {
    // Простой звук через Oscillator
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  }
}