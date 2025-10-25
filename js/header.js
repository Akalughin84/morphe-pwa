// /js/header.js
// v2.3.2 — Надёжное управление мобильным меню

(function () {
  'use strict';

  // Ждём полной загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('mainNav');
    const body = document.body;

    // Если элементов нет — выходим
    if (!menuToggle || !navMenu) {
      console.warn('Header menu elements not found. Skipping menu script.');
      return;
    }

    // Функции открытия/закрытия
    function openMenu() {
      menuToggle.setAttribute('aria-expanded', 'true');
      navMenu.setAttribute('aria-hidden', 'false');
      body.classList.add('menu-open');
    }

    function closeMenu() {
      menuToggle.setAttribute('aria-expanded', 'false');
      navMenu.setAttribute('aria-hidden', 'true');
      body.classList.remove('menu-open');
    }

    // Переключение по кнопке
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation(); // предотвращаем всплытие
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
      }
    });

    // Закрытие по клику ВНЕ меню
    document.addEventListener('click', (e) => {
      const isMenuOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      const isClickInsideMenu = navMenu.contains(e.target);
      const isClickOnToggle = e.target === menuToggle || menuToggle.contains(e.target);

      if (isMenuOpen && !isClickInsideMenu && !isClickOnToggle) {
        closeMenu();
      }
    });

    // Закрытие при клике по ссылке в меню
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        // Опционально: если переход внутренний (SPA), закрываем
        // Если внешний — браузер и так перезагрузит
        closeMenu();
      });
    });
  }
})();