// /modules/scrollToTop.js
// v1.0.0 — Глобальная кнопка "Вверх" для всего приложения

export class ScrollToTop {
  constructor() {
    this.init();
  }

  init() {
    // Создаём кнопку один раз
    if (document.getElementById('scrollToTop')) return;

    const button = document.createElement('button');
    button.id = 'scrollToTop';
    button.className = 'scroll-top';
    button.setAttribute('aria-label', 'Вернуться наверх');
    button.innerHTML = '↑';
    document.body.appendChild(button);

    // Показ/скрытие
    window.addEventListener('scroll', () => {
      button.classList.toggle('show', window.scrollY > 300);
    });

    // Прокрутка наверх
    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}