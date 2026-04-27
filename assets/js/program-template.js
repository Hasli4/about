const PROGRAMS_SOURCE = "assets/data/programs.json";

document.addEventListener("DOMContentLoaded", async () => {
  const data =
    window.programPageData || (await loadProgramPageData(PROGRAMS_SOURCE));

  if (!data) {
    initHeaderMenu();
    return;
  }

  renderProgramPage(data);
  initProgramTabs();
  initProgramNavArrows();
  initHeaderMenu();
});

async function loadProgramPageData(defaultSource) {
  const source = document.body.dataset.programsSource || defaultSource;
  const slug = getRequestedSlug();

  try {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const programs = Array.isArray(payload) ? payload : payload.programs || [];

    if (!slug) {
      renderProgramDirectory(programs);
      return null;
    }

    const program = programs.find((item) => item.slug === slug);
    if (!program) {
      renderProgramDirectory(programs, slug);
      return null;
    }

    return program;
  } catch (error) {
    renderProgramsLoadError(error, source);
    return null;
  }
}

function getRequestedSlug() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("slug") || "").trim();
}

function renderProgramPage(data) {
  const shell = document.querySelector(".program-shell");
  const sidebar = document.querySelector(".program-sidebar");

  if (shell) {
    shell.classList.remove("program-shell--single");
  }
  if (sidebar) {
    sidebar.style.display = "";
  }

  const fallbackTitle = "Страница направления";
  const title = data.title || fallbackTitle;
  const kicker = data.kicker || "Программа обучения";
  const lead = data.lead || "";
  const image = data.image || {};

  setText("#program-kicker", kicker);
  setText("#program-title", title);
  setText("#program-lead", lead);
  setDocumentTitle(title);

  const imageEl = document.querySelector("#program-main-image");
  if (imageEl) {
    imageEl.src = image.src || imageEl.src;
    imageEl.alt = image.alt || title;
  }

  renderChips("#program-chip-row", data.chips || []);
  renderSummary("#program-summary-list", data.summary || []);
  renderParagraphs("#program-description-list", data.description || []);
  renderFacts("#program-fact-grid", data.facts || []);
  renderBenefits("#program-benefits-grid", data.benefits || []);
  renderSkills("#program-skills-grid", data.skills || []);
  renderWorks("#program-works-grid", data.works || []);
  renderFaq("#program-faq-list", data.faq || []);
}

function initProgramTabs() {
  const buttons = Array.from(document.querySelectorAll("[data-program-tab]"));
  const panels = Array.from(document.querySelectorAll(".program-panel"));
  const validIds = new Set(panels.map((panel) => panel.id));

  if (!buttons.length || !panels.length) {
    return;
  }

  function activateTab(id, updateHash = true) {
    const nextId = validIds.has(id) ? id : "description";

    buttons.forEach((button) => {
      const isActive = button.dataset.programTab === nextId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.id === nextId;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    const activeButton = buttons.find(
      (button) => button.dataset.programTab === nextId,
    );
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }

    if (updateHash) {
      history.replaceState(null, "", `#${nextId}`);
    }
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.programTab);
    });

    button.addEventListener("keydown", (event) => {
      const currentIndex = buttons.indexOf(button);
      let nextIndex = currentIndex;

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % buttons.length;
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = buttons.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      buttons[nextIndex].focus();
      activateTab(buttons[nextIndex].dataset.programTab);
    });

    button.tabIndex = index === 0 ? 0 : -1;
  });

  const hashId = window.location.hash.replace("#", "");
  activateTab(hashId || "description", Boolean(hashId));

  window.addEventListener("hashchange", () => {
    activateTab(window.location.hash.replace("#", ""), false);
  });
}

function initHeaderMenu() {
  const header = document.querySelector("header");
  const nav = document.querySelector("nav");
  const toggle = document.querySelector(".menu-toggle");
  const navList = document.querySelector("#main-nav");

  if (!header || !nav || !toggle || !navList) {
    return;
  }

  const syncHeaderHeight = () => {
    const headerHeight = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty(
      "--header-height",
      `${headerHeight}px`,
    );
  };

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", (event) => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (window.innerWidth > 1100) {
      return;
    }

    if (!nav.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  navList.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  window.addEventListener("resize", () => {
    syncHeaderHeight();
    if (window.innerWidth > 1100) {
      closeMenu();
    }
  });

  syncHeaderHeight();
}

function renderProgramDirectory(programs, missingSlug = "") {
  const safePrograms = Array.isArray(programs) ? programs : [];
  const introCopy = document.querySelector(".program-intro-copy");
  const summaryCard = document.querySelector(".program-summary-card");
  const shell = document.querySelector(".program-shell");
  const sidebar = document.querySelector(".program-sidebar");
  const programContent = document.querySelector(".program-content");
  const footerText = document.querySelector(".program-footer-text");

  if (!introCopy || !summaryCard || !programContent) {
    return;
  }

  if (sidebar) {
    sidebar.style.display = "none";
  }
  if (shell) {
    shell.classList.add("program-shell--single");
  }

  setDocumentTitle("Программы обучения");

  introCopy.innerHTML = `
    <p class="program-kicker">Каталог программ</p>
    <h1 class="program-title">${
      missingSlug ? "Направление не найдено" : "Выберите направление"
    }</h1>
    <p class="program-lead">${
      missingSlug
        ? `Направление со slug "${escapeHtml(missingSlug)}" не найдено в базе данных. Выберите нужную программу из списка ниже или вернитесь на главную страницу.`
        : "Все страницы направлений теперь собираются из одного JSON-файла. Ниже можно открыть любую программу по готовой ссылке."
    }</p>
    <div class="program-chip-row">
      <span class="program-chip">${safePrograms.length} программ в базе</span>
      <span class="program-chip">Одна универсальная страница</span>
      <span class="program-chip">Редактирование через JSON</span>
    </div>
  `;

  summaryCard.innerHTML = `
    <div class="program-summary-title">Как открыть программу</div>
    <div class="program-summary-list">
      <div class="program-summary-item">
        <div class="program-summary-label">Ссылка</div>
        <div class="program-summary-value">program.html?slug=...</div>
      </div>
      <div class="program-summary-item">
        <div class="program-summary-label">Данные</div>
        <div class="program-summary-value">assets/data/programs.json</div>
      </div>
      <div class="program-summary-item">
        <div class="program-summary-label">Возврат</div>
        <div class="program-summary-value"><a class="program-directory-home" href="index.html#programs">На главную к курсам</a></div>
      </div>
    </div>
  `;

  programContent.innerHTML = `
    <section class="program-panel is-active program-directory-panel">
      <div class="program-panel-header">
        <span class="program-panel-badge">Список направлений</span>
        <h2 class="program-panel-title">Готовые ссылки на программы</h2>
        <p class="program-panel-description">Используйте эти ссылки на главной странице или открывайте их напрямую. Чтобы добавить новую программу, достаточно создать новый объект в JSON.</p>
      </div>
      <div class="program-directory-grid">
        ${safePrograms
          .map(
            (program) => `
              <a class="program-directory-card" href="program.html?slug=${encodeURIComponent(
                program.slug || "",
              )}">
                <div class="program-directory-meta">${
                  escapeHtml((program.chips || []).join(" · ")) || "Программа"
                }</div>
                <h3 class="program-directory-title">${escapeHtml(
                  program.title || "Без названия",
                )}</h3>
                <p class="program-directory-text">${escapeHtml(
                  program.lead || "",
                )}</p>
                <span class="program-directory-link">Открыть страницу →</span>
              </a>
            `,
          )
          .join("")}
      </div>
    </section>
  `;

  if (footerText) {
    footerText.textContent =
      "© Игорь Мизёв — универсальная система страниц программ обучения";
  }
}

function renderProgramsLoadError(error, source) {
  const introCopy = document.querySelector(".program-intro-copy");
  const summaryCard = document.querySelector(".program-summary-card");
  const shell = document.querySelector(".program-shell");
  const sidebar = document.querySelector(".program-sidebar");
  const programContent = document.querySelector(".program-content");
  const footerText = document.querySelector(".program-footer-text");
  const isFileProtocol = window.location.protocol === "file:";

  if (!introCopy || !summaryCard || !programContent) {
    return;
  }

  if (sidebar) {
    sidebar.style.display = "none";
  }
  if (shell) {
    shell.classList.add("program-shell--single");
  }

  setDocumentTitle("Ошибка загрузки программы");

  introCopy.innerHTML = `
    <p class="program-kicker">Система программ</p>
    <h1 class="program-title">Не удалось загрузить данные</h1>
    <p class="program-lead">${
      isFileProtocol
        ? "Страница открыта напрямую как файл, а браузер блокирует чтение JSON из соседней папки. Это не ошибка шаблона: для универсальной страницы нужен обычный локальный сервер или опубликованный сайт."
        : "Браузер не смог прочитать файл с данными программ. Проверьте путь к JSON и доступность файлов на хостинге."
    }</p>
    <div class="program-chip-row">
      <span class="program-chip">Источник: ${escapeHtml(source)}</span>
      <span class="program-chip">Протокол: ${escapeHtml(
        window.location.protocol,
      )}</span>
    </div>
  `;

  summaryCard.innerHTML = `
    <div class="program-summary-title">Что проверить</div>
    <div class="program-summary-list">
      <div class="program-summary-item">
        <div class="program-summary-label">Файл данных</div>
        <div class="program-summary-value">assets/data/programs.json</div>
      </div>
      <div class="program-summary-item">
        <div class="program-summary-label">Ссылка</div>
        <div class="program-summary-value">program.html?slug=web-development</div>
      </div>
      <div class="program-summary-item">
        <div class="program-summary-label">Возврат</div>
        <div class="program-summary-value"><a class="program-directory-home" href="index.html#programs">На главную к курсам</a></div>
      </div>
    </div>
  `;

  programContent.innerHTML = `
    <section class="program-panel is-active program-directory-panel">
      <div class="program-panel-header">
        <span class="program-panel-badge">Ошибка загрузки</span>
        <h2 class="program-panel-title">Подсказка по запуску</h2>
        <p class="program-panel-description">Если вы открываете сайт локально, используйте простой статический сервер в папке проекта. После этого открывайте сайт через адрес вроде http://localhost:8000.</p>
      </div>
      <div class="program-copy-card">
        <div class="program-richtext">
          <p><strong>Техническая причина:</strong> ${escapeHtml(
            error && error.message ? error.message : String(error),
          )}</p>
          <p><strong>Самый простой вариант локального просмотра:</strong> запустить в папке проекта <code>python -m http.server 8000</code> или любой другой статический сервер и открыть страницу через браузер по адресу <code>http://localhost:8000/program.html?slug=web-development</code>.</p>
        </div>
      </div>
    </section>
  `;

  if (footerText) {
    footerText.textContent =
      "© Игорь Мизёв — универсальная система страниц программ обучения";
  }
}

function initProgramNavArrows() {
  const nav = document.querySelector(".program-nav");
  const sidebarCard = document.querySelector(".program-sidebar-card");
  const leftButton = document.querySelector(".program-nav-arrow-left");
  const rightButton = document.querySelector(".program-nav-arrow-right");

  if (!nav || !sidebarCard || !leftButton || !rightButton) {
    return;
  }

  const getStep = () => {
    const button = nav.querySelector(".program-nav-btn");
    const gap = parseInt(getComputedStyle(nav).gap || "0", 10);
    if (!button) {
      return Math.round(nav.clientWidth * 0.8);
    }
    return Math.round(button.getBoundingClientRect().width + gap);
  };

  const updateControls = () => {
    const isCompactMode = window.innerWidth <= 1100;
    const hasOverflow = nav.scrollWidth > nav.clientWidth + 4;
    const shouldShow = isCompactMode && hasOverflow;

    sidebarCard.classList.toggle("is-scrollable", shouldShow);

    if (!shouldShow) {
      leftButton.disabled = true;
      rightButton.disabled = true;
      return;
    }

    leftButton.disabled = nav.scrollLeft <= 4;
    rightButton.disabled =
      nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4;
  };

  leftButton.addEventListener("click", () => {
    nav.scrollBy({ left: -getStep(), behavior: "smooth" });
  });

  rightButton.addEventListener("click", () => {
    nav.scrollBy({ left: getStep(), behavior: "smooth" });
  });

  nav.addEventListener("scroll", updateControls, { passive: true });
  window.addEventListener("resize", updateControls, { passive: true });

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => updateControls());
    observer.observe(nav);
  }

  updateControls();
}

function renderChips(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map((item) => `<span class="program-chip">${escapeHtml(item)}</span>`)
    .join("");
}

function renderSummary(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <div class="program-summary-item">
          <div class="program-summary-label">${escapeHtml(item.label || "")}</div>
          <div class="program-summary-value">${escapeHtml(item.value || "")}</div>
        </div>
      `,
    )
    .join("");
}

function renderParagraphs(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join("");
}

function renderFacts(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <div class="program-fact-card">
          <div class="program-fact-label">${escapeHtml(item.label || "")}</div>
          <div class="program-fact-value">${escapeHtml(item.value || "")}</div>
        </div>
      `,
    )
    .join("");
}

function renderBenefits(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="program-info-card">
          <h3>${escapeHtml(item.title || "")}</h3>
          <p>${escapeHtml(item.text || "")}</p>
        </article>
      `,
    )
    .join("");
}

function renderSkills(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item, index) => `
        <article class="program-skill-card">
          <div class="program-skill-icon">${String(index + 1).padStart(2, "0")}</div>
          <p>${escapeHtml(item)}</p>
        </article>
      `,
    )
    .join("");
}

function renderWorks(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="program-work-card">
          <figure class="program-work-media">
            <img
              src="${escapeAttribute(item.image || "")}"
              alt="${escapeAttribute(item.alt || item.title || "")}"
              loading="lazy"
            />
          </figure>
          <div class="program-work-body">
            <h3 class="program-work-title">${escapeHtml(item.title || "")}</h3>
            <p class="program-work-text">${escapeHtml(item.text || "")}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderFaq(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item, index) => `
        <details class="program-faq-item"${index === 0 ? " open" : ""}>
          <summary>${escapeHtml(item.question || "")}</summary>
          <div class="program-faq-answer">${escapeHtml(item.answer || "")}</div>
        </details>
      `,
    )
    .join("");
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value || "";
  }
}

function setDocumentTitle(title) {
  document.title = `${title} | Игорь Мизёв`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
