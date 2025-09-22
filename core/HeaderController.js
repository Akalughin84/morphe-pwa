// /core/HeaderController.js

export class HeaderController {
  /**
   * Загружает шапку
   */
  static async loadHeader() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    try {
      const response = await fetch('/partials/header.html');
      if (!response.ok) throw new Error('Не удалось загрузить шапку');
      const html = await response.text();
      placeholder.outerHTML = `<header id="main-header">${html}</header>`;
      this.initMenu();
    } catch (err) {
      console.error('❌ Ошибка загрузки шапки:', err);
      placeholder.innerHTML = '<header>Шапка недоступна</header>';
    }
  }

  /**
   * Загружает подвал
   */
  static async loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    try {
      const response = await fetch('/partials/footer.html');
      if (!response.ok) throw new Error('Не удалось загрузить подвал');
      const html = await response.text();
      placeholder.outerHTML = `<footer class="footer">${html}</footer>`;
    } catch (err) {
      console.error('❌ Ошибка загрузки подвала:', err);
      placeholder.innerHTML = '<footer>Подвал недоступен</footer>';
    }
  }

  /**
   * Инициализация мобильного меню
   */
  static initMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');

    if (!menuToggle || !mainNav) return;

    menuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      menuToggle.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', mainNav.classList.contains('active'));
    });

    // Закрытие при клике вне меню
    document.addEventListener('click', (e) => {
      if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}