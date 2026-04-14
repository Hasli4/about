// assets/js/visual-init.js
/* visual-init.js — enhanced mobile brightness boost (idempotent)
   Adjusted: stronger visible particles on capable mobile devices while preserving performance.
   Exposes window.__visual helpers (pause/resume/destroy).
*/
(function () {
  const prefersReduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;
  const hwConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = navigator.deviceMemory || 4;
  const ua = navigator.userAgent || '';
  const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(ua);

  // Decide whether to apply an extra mobile visual boost (more particles / larger size).
  function shouldBoostMobile() {
    // boost only on mid/high-end phones
    if (!isMobile) return false;
    return (hwConcurrency >= 4 && (!deviceMemory || deviceMemory >= 2));
  }

  function computeParticleCount() {
    const desktopBase = 40;
    const tabletBase = 20;
    const mobileBaseLow = 12; // fallback for low-power phones
    const mobileBaseHigh = 30; // boosted visibility on capable phones

    let base;
    if (isMobile) {
      base = shouldBoostMobile() ? mobileBaseHigh : mobileBaseLow;
    } else if (window.innerWidth < 1100) {
      base = tabletBase;
    } else {
      base = desktopBase;
    }

    // hardware-aware reductions
    if (hwConcurrency <= 2) base = Math.max(6, Math.round(base / 3));
    if (deviceMemory && deviceMemory < 2) base = Math.max(6, Math.round(base / 2));
    return base;
  }

  // Ensure visual container exists and is idempotent (no duplicates)
  function createVisualBg() {
    let wrap = document.getElementById('visual-animated-bg');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'visual-animated-bg';
      wrap.style.position = 'fixed';
      wrap.style.inset = '0';
      // ensure it is behind content; CSS sets negative z-index. Keep inline minimal to be safe.
      wrap.style.zIndex = '-9998';
      wrap.style.pointerEvents = 'none';
      wrap.style.overflow = 'visible';
      wrap.style.contain = 'paint';
      document.body.insertBefore(wrap, document.body.firstChild);
    }

    // ensure vparticles exists inside wrapper
    if (!document.getElementById('vparticles')) {
      const p = document.createElement('div');
      p.id = 'vparticles';
      p.style.position = 'absolute';
      p.style.inset = '0';
      p.style.zIndex = '1';
      p.style.pointerEvents = 'none';
      wrap.appendChild(p);
    }
  }

  // destroy existing tsParticles instances tied to #vparticles
  async function destroyExistingParticles() {
    if (typeof window.tsParticles === 'undefined') return;
    try {
      const list = window.tsParticles.dom();
      if (!list || !list.length) return;
      for (const inst of list) {
        // try to safely detect if instance corresponds to our container
        try {
          const canvasEl = inst && inst.canvas && inst.canvas.element;
          const parentId = canvasEl && canvasEl.parentNode && canvasEl.parentNode.id;
          if (parentId === 'vparticles') {
            await inst.destroy();
          }
        } catch (e) { /* ignore per-instance errors */ }
      }
    } catch (e) { /* ignore */ }
  }

  let particlesContainerRef = null;

  async function initParticles() {
    if (prefersReduced) return;
    if (typeof window.tsParticles === 'undefined') return;

    // recreate safely
    await destroyExistingParticles();

    const count = computeParticleCount();
    const enableLinks = (!isMobile && hwConcurrency > 2) || (isMobile && hwConcurrency >= 4 && deviceMemory >= 2);

    // brightness/sharpness tuning for mobile boost
    const mobileBoost = shouldBoostMobile();
    const sizeValue = isMobile ? (mobileBoost ? 3.2 : 2.2) : 2.2;
    const opacityMin = isMobile ? (mobileBoost ? 0.14 : 0.10) : 0.08;
    const opacityMax = isMobile ? (mobileBoost ? 0.28 : 0.18) : 0.16;

    const palette = ["#61d0ff", "#6ee7d5", "#9aa7ff"];

    const cfg = {
      fpsLimit: 30,
      detectRetina: false,
      particles: {
        number: { value: count, density: { enable: true, area: 900 } },
        color: { value: palette },
        shape: { type: 'circle' },
        opacity: {
          value: { min: opacityMin, max: opacityMax },
          animation: {
            enable: true,
            speed: 0.5,
            minimumValue: Math.max(0.04, opacityMin * 0.5),
            startValue: 'random',
            sync: false
          }
        },
        size: {
          value: sizeValue,
          random: { enable: true, minimumValue: Math.max(1.2, sizeValue * 0.5) }
        },
        move: {
          enable: true,
          speed: 0.45,
          direction: 'none',
          outModes: { default: 'out' }
        },
        links: {
          enable: enableLinks,
          distance: 140,
          color: '#67d6ff',
          opacity: enableLinks ? 0.10 : 0,
          width: enableLinks ? 1.0 : 0
        }
      },
      interactivity: { detectsOn: 'canvas', events: { onHover: { enable: false }, onClick: { enable: false } } },
      detectRetina: false,
      pauseOnBlur: true,
      background: { color: { value: 'transparent' } }
    };

    try {
      particlesContainerRef = await window.tsParticles.load('vparticles', cfg);
      // slight container-level glow (CSS injection safe)
      const vp = document.getElementById('vparticles');
      if (vp) {
        vp.style.opacity = '1';
        // stronger drop-shadow if mobile boost is applied
        if (mobileBoost) vp.style.filter = 'drop-shadow(0 10px 28px rgba(97,208,255,0.14)) saturate(1.18)';
        else vp.style.filter = 'drop-shadow(0 6px 14px rgba(97,208,255,0.07))';
      }

      // Toggle CSS class to boost mobile visuals if applicable
      if (mobileBoost) document.documentElement.classList.add('visuals-boost-mobile');
      else document.documentElement.classList.remove('visuals-boost-mobile');

      setupVisibilityHandler();
      setupScrollThrottle();
      setupResizeHandler();
    } catch (err) {
      console.warn('visual-init: tsParticles init failed', err);
    }
  }

  // Pause/resume when tab hidden/visible
  function setupVisibilityHandler() {
    function onVis() {
      try {
        if (!particlesContainerRef) return;
        if (document.visibilityState === 'hidden') particlesContainerRef.pause();
        else particlesContainerRef.play();
      } catch (e) { }
    }
    document.removeEventListener('visibilitychange', onVis);
    document.addEventListener('visibilitychange', onVis, { passive: true });
    onVis();
  }

  // Throttle scroll: pause particles during scroll to reduce jank
  let scrollTimer = null;
  function setupScrollThrottle() {
    function onScroll() {
      try { if (particlesContainerRef) particlesContainerRef.pause(); } catch (e) { }
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        try { if (particlesContainerRef) particlesContainerRef.play(); } catch (e) { }
      }, 220);
    }
    window.removeEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // On resize, re-evaluate counts/boost (debounced)
  let resizeDeb = null;
  function setupResizeHandler() {
    function onResize() {
      if (resizeDeb) clearTimeout(resizeDeb);
      resizeDeb = setTimeout(() => {
        // Recreate / adapt visuals on significant size change
        if (!prefersReduced && typeof window.tsParticles !== 'undefined') {
          createVisualBg();
          initParticles();
        }
      }, 300);
    }
    window.removeEventListener('resize', onResize);
    window.addEventListener('resize', onResize, { passive: true });
  }

  // Public helpers
  async function pauseVisuals() { try { particlesContainerRef && particlesContainerRef.pause(); document.documentElement.classList.add('visuals-muted'); } catch (e) { } }
  async function resumeVisuals() { try { particlesContainerRef && particlesContainerRef.play(); document.documentElement.classList.remove('visuals-muted'); } catch (e) { } }
  async function destroyVisuals() { try { particlesContainerRef && await particlesContainerRef.destroy(); particlesContainerRef = null; await destroyExistingParticles(); const wrap = document.getElementById('visual-animated-bg'); wrap && wrap.parentNode && wrap.parentNode.removeChild(wrap); document.documentElement.classList.remove('visuals-boost-mobile'); } catch (e) { } }

  // Entrypoint
  function initVisualBackground() {
    try {
      createVisualBg();
      // defer init slightly to avoid blocking first paint
      setTimeout(() => initParticles(), 120);
    } catch (e) {
      console.warn('visual-init: init failed', e);
    }
  }

  // Boot respecting reduced-motion
  if (!prefersReduced) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initVisualBackground);
    else initVisualBackground();
  } else {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createVisualBg);
    else createVisualBg();
  }

  // Expose debug API
  window.__visual = window.__visual || {};
  window.__visual.initVisualBackground = initVisualBackground;
  window.__visual.pauseVisuals = pauseVisuals;
  window.__visual.resumeVisuals = resumeVisuals;
  window.__visual.destroyVisuals = destroyVisuals;
  window.__visual._particlesRef = () => particlesContainerRef;

})();


/* Binary hover particles for links — лёгкая, throttled реализация. */

(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // если пользователь просит уменьшить анимацию — не создаём частицы
    return;
  }

  const MAX_PARTICLES = 10;     // максимальное количество частиц за одно hover-событие
  const PARTICLE_INTERVAL = 60; // ms между рождением частиц
  const TAU = Math.PI * 2;

  // создать частицу
  function spawnParticle(x, y, dx, dy, rot, char) {
    const el = document.createElement('span');
    el.className = 'binary-particle';
    el.textContent = char;
    // устанавливаем начальную позицию и направления через CSS-переменные
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--dx', dx + 'px');
    el.style.setProperty('--dy', dy + 'px');
    el.style.setProperty('--rot', rot + 'deg');
    document.body.appendChild(el);

    // небольшой таймаут чтобы дать браузеру применить начальное состояние
    requestAnimationFrame(() => {
      el.classList.add('animate');
    });

    // удаляем после окончания анимации
    el.addEventListener('animationend', () => {
      el.remove();
    }, { once: true });
  }

  // генерируем "шлейф" из нулей/единиц вокруг позиции мыши
  function emitBinaryAt(x, y) {
    // спауним несколько частиц с рандомными offset'ами
    const count = Math.floor(4 + Math.random() * (MAX_PARTICLES - 4));
    for (let i = 0; i < count; i++) {
      // небольшой ступенчатый delay для "вылетающего" эффекта
      setTimeout(() => {
        const angle = (Math.random() * Math.PI) - Math.PI / 2; // разброс вверх/в стороны
        const spread = 40 + Math.random() * 80; // расстояние
        const dx = Math.cos(angle) * spread * (Math.random() * 0.9 + 0.6);
        const dy = (Math.sin(angle) * spread * 0.6) - (40 + Math.random() * 20); // вверх доминирует
        const rot = (Math.random() - 0.5) * 120;
        const char = Math.random() > 0.5 ? '1' : '0';
        spawnParticle(x, y, dx, dy, rot, char);
      }, i * PARTICLE_INTERVAL * (0.6 + Math.random() * 0.9));
    }
  }

  // throttle для частого mousemove — не перегружать
  function makeHoverEmitter(el) {
    let last = 0;
    let hovering = false;
    let timer = null;

    function start(e) {
      hovering = true;
      // с первого enter делаем небольшой burst
      const rect = el.getBoundingClientRect();
      const x = (e && e.clientX) ? e.clientX : rect.left + rect.width / 2;
      const y = (e && e.clientY) ? e.clientY : rect.top + rect.height - 12;
      emitBinaryAt(x, y);
    }

    function move(e) {
      const now = performance.now();
      if (now - last < 90) return; // throttle
      last = now;
      const x = e.clientX;
      const y = e.clientY;
      emitBinaryAt(x, y);
    }

    function stop() {
      hovering = false;
      if (timer) { clearTimeout(timer); timer = null; }
    }

    el.addEventListener('mouseenter', start);
    el.addEventListener('focus', (e) => {
      // при фокусе по клавиатуре эмитим в центр элемента
      const rect = el.getBoundingClientRect();
      emitBinaryAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', stop);
    el.addEventListener('blur', stop);
  }

  // применим ко всем ссылкам на странице (лёгкая фильтрация)
  function init() {
    // внутри init()
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    anchors.forEach(a => {
      // 1) если явно помечено — пропускаем
      if (a.dataset.noBinary !== undefined || a.dataset.noBinary === "true") return;

      // 2) если ссылка находится внутри .cta-buttons — пропускаем
      if (a.closest('.cta-buttons')) return;

      // 3) (опционально) если внутри .no-binary-container — пропускаем
      if (a.closest('[data-no-binary-container]')) return;

      makeHoverEmitter(a);
    });
  }

  // запуск после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
