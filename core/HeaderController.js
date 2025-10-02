// /core/HeaderController.js
// v1.1.0 — Кэширование, защита от дублирования, улучшенная надёжность

const CACHE = new Map();

export class HeaderController {
  /**
   * Загружает шапку
   */
  static async loadHeader() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    // Избегаем повторной загрузки
    if (document.getElementById('main-header')) {
      this.initMenu();
      return;
    }

    try {
      let html = CACHE.get('/partials/header.html');
      if (!html) {
        const response = await fetch('/partials/header.html');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        html = await response.text();
        CACHE.set('/partials/header.html', html);
      }

      placeholder.outerHTML = `<header id="main-header">${html}</header>`;
      this.initMenu();
    } catch (err) {
      console.error('❌ Ошибка загрузки шапки:', err);
      placeholder.outerHTML = '<header class="header-error">Шапка недоступна</header>';
    }
  }

  /**
   * Загружает подвал
   */
  static async loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    // Избегаем повторной загрузки
    if (document.querySelector('footer.footer')) return;

    try {
      let html = CACHE.get('/partials/footer.html');
      if (!html) {
        const response = await fetch('/partials/footer.html');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        html = await response.text();
        CACHE.set('/partials/footer.html', html);
      }

      placeholder.outerHTML = `<footer class="footer">${html}</footer>`;
    } catch (err) {
      console.error('❌ Ошибка загрузки подвала:', err);
      placeholder.outerHTML = '<footer class="footer-error">Подвал недоступен</footer>';
    }
  }

  /**
   * Инициализация мобильного меню (с защитой от дублирования)
   */
  static initMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');

    if (!menuToggle || !mainNav) return;

    // Удаляем старые слушатели, если есть
    menuToggle.removeEventListener('click', this._menuClickListener);
    document.removeEventListener('click', this._outsideClickListener);

    // Новые слушатели
    this._menuClickListener = () => {
      mainNav.classList.toggle('active');
      menuToggle.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', mainNav.classList.contains('active'));
    };

    this._outsideClickListener = (e) => {
      if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    };

    menuToggle.addEventListener('click', this._menuClickListener);
    document.addEventListener('click', this._outsideClickListener);
  }
}