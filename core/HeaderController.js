// /core/HeaderController.js
// v1.3.0 — Защита от NoModificationAllowedError при повторной загрузке

const CACHE = new Map();

export class HeaderController {
  /**
   * Загружает шапку и инициализирует глобальные компоненты
   */
  static async loadHeader() {
    const placeholder = document.getElementById('header-placeholder');
    // ✅ Защита: элемент должен существовать И иметь родителя
    if (!placeholder || !placeholder.parentNode) {
      console.warn('⚠️ #header-placeholder отсутствует или не в DOM — пропускаем загрузку шапки');
      return;
    }

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
      await this.initGlobalUI();
    } catch (err) {
      console.error('❌ Ошибка загрузки шапки:', err);
      // ✅ Только если placeholder ещё в DOM
      if (placeholder.parentNode) {
        placeholder.outerHTML = '<header class="header-error">Шапка недоступна</header>';
      }
    }
  }

  /**
   * Инициализирует глобальные UI-компоненты
   */
  static async initGlobalUI() {
    try {
      const { ScrollToTop } = await import('/modules/scrollToTop.js');
      new ScrollToTop();
    } catch (e) {
      console.warn('Не удалось загрузить кнопку "Вверх":', e);
    }
  }

  /**
   * Загружает подвал
   */
  static async loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder || !placeholder.parentNode) {
      console.warn('⚠️ #footer-placeholder отсутствует или не в DOM — пропускаем загрузку подвала');
      return;
    }

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
      if (placeholder.parentNode) {
        placeholder.outerHTML = '<footer class="footer-error">Подвал недоступен</footer>';
      }
    }
  }

  /**
   * Инициализация мобильного меню
   */
  static initMenu() {
    const header = document.getElementById('main-header');
    if (!header) return;

    const menuToggle = header.querySelector('#menuToggle');
    const mainNav = header.querySelector('#mainNav');
    const closeBtn = mainNav?.querySelector('.nav-close-btn');

    if (!menuToggle || !mainNav) {
      console.warn('❌ Не найдены элементы меню');
      return;
    }

    const closeMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      mainNav.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('menu-open');
    };

    const toggleMenu = () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeMenu();
      } else {
        menuToggle.setAttribute('aria-expanded', 'true');
        mainNav.setAttribute('aria-hidden', 'false');
        document.body.classList.add('menu-open');
      }
    };

    // Очистка старых слушателей
    menuToggle.removeEventListener('click', toggleMenu);
    if (closeBtn) closeBtn.removeEventListener('click', closeMenu);
    if (this._outsideClickListener) {
      document.removeEventListener('click', this._outsideClickListener);
    }

    // Новые слушатели
    menuToggle.addEventListener('click', toggleMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    this._outsideClickListener = (e) => {
      if (
        mainNav.getAttribute('aria-hidden') === 'false' &&
        !mainNav.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('click', this._outsideClickListener);

    const escapeHandler = (e) => {
      if (e.key === 'Escape' && mainNav.getAttribute('aria-hidden') === 'false') {
        closeMenu();
      }
    };
    document.removeEventListener('keydown', escapeHandler);
    document.addEventListener('keydown', escapeHandler);
    this._escapeHandler = escapeHandler;
  }
}