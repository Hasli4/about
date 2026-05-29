(function () {
  const storageKey = "site-theme";
  const lightTheme = "light";

  function getSavedTheme() {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      if (theme === lightTheme) {
        localStorage.setItem(storageKey, lightTheme);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {}
  }

  function setTheme(theme) {
    const isLight = theme === lightTheme;
    document.documentElement.toggleAttribute("data-theme", isLight);
    if (isLight) {
      document.documentElement.setAttribute("data-theme", lightTheme);
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute("content", isLight ? "#e7eef4" : "#0b121d");
    }

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(isLight));
      button.setAttribute(
        "aria-label",
        isLight ? "Включить тёмную тему" : "Включить светлую тему",
      );
      button.setAttribute(
        "title",
        isLight ? "Включить тёмную тему" : "Включить светлую тему",
      );
    });
  }

  function animateThemeChange(callback) {
    document.documentElement.classList.add("theme-transitioning");
    callback();
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 520);
  }

  function syncHeaderHeight() {
    const header = document.querySelector("header");
    if (!header) return;

    const update = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--header-height", `${height}px`);
    };

    update();
    window.addEventListener("resize", update, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(update).observe(header);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    syncHeaderHeight();
    setTheme(getSavedTheme());

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", function () {
        const nextTheme =
          document.documentElement.getAttribute("data-theme") === lightTheme
            ? "dark"
            : lightTheme;

        saveTheme(nextTheme);
        animateThemeChange(() => setTheme(nextTheme));
        button.classList.add("theme-toggle-touched");
      });
    });
  });
})();
