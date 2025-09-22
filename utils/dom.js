// /utils/dom.js
// Вспомогательные функции для работы с DOM

export const Dom = {
  /**
   * querySelector сокращённо
   */
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  },

  /**
   * Создание элемента
   */
  createElement(tag, classes = [], attrs = {}, text = '') {
    const el = document.createElement(tag);
    if (classes.length) el.classList.add(...classes);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text) el.textContent = text;
    return el;
  },

  /**
   * Добавление класса
   */
  addClass(el, className) {
    if (el) el.classList.add(className);
  },

  removeClass(el, className) {
    if (el) el.classList.remove(className);
  },

  toggleClass(el, className) {
    if (el) el.classList.toggle(className);
  },

  /**
   * Показ/скрытие
   */
  show(el) {
    if (el) el.style.display = '';
  },

  hide(el) {
    if (el) el.style.display = 'none';
  }
};