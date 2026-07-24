(() => {
  "use strict";

  const STORAGE_KEY = "speccompass-review:display-theme";
  const DARK = "dark";
  const LIGHT = "light";

  function storedTheme() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return value === DARK || value === LIGHT ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function systemTheme() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? DARK
        : LIGHT;
    } catch (_error) {
      return LIGHT;
    }
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === DARK ? DARK : LIGHT;
  }

  function updateControl(theme) {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    const dark = theme === DARK;
    const nextLabel = dark ? "切换到浅色模式" : "切换到深色模式";
    button.setAttribute("aria-label", nextLabel);
    button.setAttribute("title", nextLabel);
    button.setAttribute("aria-pressed", String(dark));
    const icon = button.querySelector(".theme-toggle-icon");
    if (icon) icon.textContent = dark ? "☀" : "☾";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    updateControl(theme);
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (_error) {
      // Display preference persistence is optional.
    }
  }

  function bindControl() {
    const button = document.getElementById("theme-toggle");
    updateControl(currentTheme());
    if (!button) return;
    button.addEventListener("click", () => {
      const next = currentTheme() === DARK ? LIGHT : DARK;
      applyTheme(next);
      saveTheme(next);
    });
  }

  applyTheme(storedTheme() || systemTheme());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindControl, { once: true });
  } else {
    bindControl();
  }
})();
