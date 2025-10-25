/**
 * /utils/confetti.js
 * Простая анимация конфетти для PWA.
 * Используется при разблокировке новых достижений.
 * Не требует внешних библиотек, удаляется после завершения.
 */

/**
 * Запускает анимацию конфетти на странице
 * @param {Object} options - настройки анимации
 * @param {number} [options.particleCount=150] - количество частиц
 * @param {number} [options.spread=70] - угол разлёта (в градусах)
 * @param {Object} [options.origin={x:0.5, y:0.6}] - точка запуска (0..1)
 */
function confetti(options = {}) {
  // Защита от запуска вне браузера
  if (typeof window === 'undefined') return;

  // Настройки по умолчанию
  const defaults = { 
    particleCount: 150, 
    spread: 70, 
    origin: { x: 0.5, y: 0.6 } 
  };
  const opts = { ...defaults, ...options };

  // Создаём холст поверх всего
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none'; // не мешает кликам
  canvas.style.zIndex = '10000';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Генерация частиц
  const particles = [];
  const colors = ['#fbbf24', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6'];
  for (let i = 0; i < opts.particleCount; i++) {
    particles.push({
      x: opts.origin.x * canvas.width,
      y: opts.origin.y * canvas.height,
      angle: (Math.random() * opts.spread - opts.spread / 2) * (Math.PI / 180),
      speed: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 4,
      life: 100 + Math.random() * 50 // кадры жизни
    });
  }

  /**
   * Рисует и обновляет частицы каждый кадр
   */
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.life--;
      if (p.life <= 0) return;

      alive = true;
      // Движение с гравитацией
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed + 0.1;

      // Рисуем круг
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Продолжаем анимацию, пока есть живые частицы
    if (alive) {
      requestAnimationFrame(draw);
    } else {
      // Удаляем холст из DOM
      document.body.removeChild(canvas);
    }
  }

  requestAnimationFrame(draw);
}

export default confetti;