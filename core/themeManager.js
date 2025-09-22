// /core/themeManager.js
// v1.7.0 — Theme Manager с плавными переходами

export class ThemeManager {
  constructor() {
    this.storageKey = 'morphe-theme';
    this.currentTheme = this.getSavedTheme();
    
    // Добавляем класс анимации к body
    document.body.classList.add('theme-transition');
    
    this.applyTheme(this.currentTheme, false); // без анимации при загрузке
  }

  getSavedTheme() {
    return localStorage.getItem(this.storageKey) || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  /**
   * Применяет тему с опциональной анимацией
   * @param {string} theme 'light' | 'dark'
   * @param {boolean} animate нужно ли анимировать
   */
  applyTheme(theme, animate = true) {
    if (!animate) {
      // Отключаем анимацию на время применения
      document.body.style.transition = 'none';
      setTimeout(() => {
        document.body.style.transition = '';
      }, 50);
    }

    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
  }

  /**
   * Переключает тему с анимацией
   */
  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme, true);
    localStorage.setItem(this.storageKey, newTheme);
  }

  /**
   * Устанавливает тему напрямую
   */
  set(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn(`Неверная тема: ${theme}`);
      return;
    }
    const shouldAnimate = this.currentTheme !== null;
    this.applyTheme(theme, shouldAnimate);
    localStorage.setItem(this.storageKey, theme);
  }

  /**
   * Возвращает текущую тему
   */
  get() {
    return this.currentTheme;
  }
}