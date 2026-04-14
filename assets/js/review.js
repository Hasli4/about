
(function(){
  function debounce(fn, ms){ let t; return function(...a){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), ms); }; }

  function initReviewsCarousel(){
    const wrap = document.querySelector('.reviews-wrap');
    const track = document.querySelector('.reviews-track');
    if(!wrap || !track) return;

    if(track.dataset.duplicated === '1') {
      setDuration();
      return;
    }

    track.innerHTML = track.innerHTML + track.innerHTML;
    track.dataset.duplicated = '1';

    function setDuration(){
      // увеличенная мобильная скорость (px/s) — автоскролл заметно быстрее на телефонах
      const speed = (window.innerWidth < 600 ? 200 : 150); // px/s, мобильный быстрее
      const totalWidth = track.scrollWidth; // doubled
      const duration = Math.max(5, Math.round(totalWidth / speed)); // seconds, снизил min до 5
      track.style.animationDuration = duration + 's';
      track.style.animationTimingFunction = 'linear';
      track.style.animationName = 'reviews-scroll';
      track.style.animationIterationCount = 'infinite';
      track.style.animationPlayState = 'running';
    }

    function handleVisibility(){
      if(document.visibilityState === 'hidden'){
        track.style.animationPlayState = 'paused';
      } else {
        if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
          track.style.animationPlayState = 'paused';
        } else {
          track.style.animationPlayState = 'running';
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility, {passive:true});

    const resizeHandler = debounce(setDuration, 150);
    window.addEventListener('resize', resizeHandler, {passive:true});

    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      track.style.animation = 'none';
    } else {
      setDuration();
    }

    let scrolling = false;
    let scrollTimer;
    window.addEventListener('scroll', function(){
      if(scrollTimer) clearTimeout(scrollTimer);
      if(!scrolling){
        scrolling = true;
        track.style.animationPlayState = 'paused';
      }
      scrollTimer = setTimeout(()=>{
        scrolling = false;
        handleVisibility();
      }, 180);
    }, {passive:true});
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initReviewsCarousel);
  } else {
    initReviewsCarousel();
  }
})();

(function(){
  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function(){
    const wrap = document.querySelector('.reviews-wrap');
    const track = document.querySelector('.reviews-track');
    if (!wrap || !track) return;
    if (wrap.dataset.reviewsArrowsInit === '1') return;
    wrap.dataset.reviewsArrowsInit = '1';

    let arrowsContainer = document.getElementById('reviews-arrows-root');
    if (!arrowsContainer) {
      arrowsContainer = document.createElement('div');
      arrowsContainer.id = 'reviews-arrows-root';
      document.body.appendChild(arrowsContainer);
      arrowsContainer.style.position = 'fixed';
      arrowsContainer.style.left = '0';
      arrowsContainer.style.top = '0';
      arrowsContainer.style.width = '0';
      arrowsContainer.style.height = '0';
      arrowsContainer.style.pointerEvents = 'none';
      arrowsContainer.style.zIndex = '9999';
    }

    function createBtn(side){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reviews-arrow reviews-arrow-' + (side === 'left' ? 'left' : 'right');
      btn.setAttribute('aria-label', side === 'left' ? 'Предыдущие отзывы' : 'Следующие отзывы');
      btn.innerHTML = '<span class="chev">'+ (side === 'left' ? '◀' : '▶') +'</span>';
      btn.style.pointerEvents = 'auto';
      btn.style.position = 'fixed';
      btn.style.top = '0px';
      btn.style.height = '48px';
      btn.style.width = '46px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.background = 'linear-gradient(90deg, rgba(6,10,14,0.14), rgba(6,10,14,0.06))';
      btn.style.backdropFilter = 'blur(4px)';
      btn.style.webkitBackdropFilter = 'blur(4px)';
      btn.style.border = '0';
      btn.style.borderRadius = '8px';
      btn.style.opacity = '0.58';
      btn.style.transition = 'opacity 160ms ease, transform 160ms ease';
      btn.style.cursor = 'pointer';
      btn.style.boxShadow = '0 8px 20px rgba(2,6,12,0.45)';
      btn.style.color = 'rgba(255,255,255,0.95)';
      btn.style.fontSize = '20px';
      btn.style.lineHeight = '1';
      btn.style.zIndex = '9999';
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }});
      return btn;
    }

    let leftBtn = document.querySelector('.reviews-arrow.reviews-arrow-left');
    let rightBtn = document.querySelector('.reviews-arrow.reviews-arrow-right');
    if (!leftBtn) { leftBtn = createBtn('left'); arrowsContainer.appendChild(leftBtn); }
    if (!rightBtn) { rightBtn = createBtn('right'); arrowsContainer.appendChild(rightBtn); }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      leftBtn.style.display = 'none';
      rightBtn.style.display = 'none';
    }

    function computeStep(){
      const firstCard = track.querySelector('.review-card') || track.firstElementChild;
      const gap = parseInt(getComputedStyle(track).gap || 18, 10) || 18;
      if (firstCard) {
        const w = firstCard.getBoundingClientRect().width;
        return Math.max(1, Math.round(w + gap));
      }
      return Math.round(wrap.clientWidth * 0.9);
    }

    function animateScroll(container, to, duration){
      const start = container.scrollLeft;
      const change = to - start;
      const startTime = performance.now();
      function ease(t){ return t<.5 ? 2*t*t : -1 + (4 - 2*t)*t; }
      function step(now){
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        container.scrollLeft = Math.round(start + change * ease(t));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    let autoPausedByUser = false;
    function stopAutoAndSyncToScroll(){
      if (autoPausedByUser) return;
      const st = window.getComputedStyle(track).transform || window.getComputedStyle(track).webkitTransform;
      if (st && st !== 'none'){
        const m = st.match(/matrix.*\((.+)\)/);
        if (m){
          const vals = m[1].split(',').map(s=>parseFloat(s.trim()));
          const tx = vals.length >= 5 ? vals[4] : 0;
          const pos = Math.max(0, -Math.round(tx));
          track.style.animationPlayState = 'paused';
          track.style.animation = 'none';
          track.style.transform = 'none';
          wrap.scrollLeft = pos;
        } else {
          track.style.animationPlayState = 'paused';
          track.style.animation = 'none';
        }
      } else {
        track.style.animationPlayState = 'paused';
        track.style.animation = 'none';
      }
      autoPausedByUser = true;
    }

    function onArrowClick(dir){
      stopAutoAndSyncToScroll();
      const step = computeStep();
      const delta = dir === 'left' ? -step : step;
      const target = wrap.scrollLeft + delta;
      const duration = (window.innerWidth < 600) ? 200 : 480; // мобильный — ещё чуть быстрее (200ms)
      animateScroll(wrap, target, duration);
    }
    leftBtn.addEventListener('click', ()=> onArrowClick('left'));
    rightBtn.addEventListener('click', ()=> onArrowClick('right'));

    let userScrollTimeout = null;
    wrap.addEventListener('scroll', () => {
      if (autoPausedByUser) return;
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        stopAutoAndSyncToScroll();
      }, 80);
    }, { passive: true });

    // тап по карточке -> прокрутка к следующей карточке (только на мобильных)
    track.addEventListener('click', function(e){
      if (e.target.closest('a')) return;
      const card = e.target.closest('.review-card');
      if (!card) return;
      if (window.innerWidth >= 600) return;
      e.preventDefault();
      stopAutoAndSyncToScroll();

      const gap = parseInt(getComputedStyle(track).gap || 18, 10) || 18;
      const cardLeft = card.offsetLeft;
      const cardWidth = Math.round(card.getBoundingClientRect().width);
      const nextLeft = cardLeft + cardWidth + gap;
      const minAdvance = Math.max(1, Math.round(cardWidth * 0.6));
      const target = (nextLeft > wrap.scrollLeft + 2) ? nextLeft : (wrap.scrollLeft + minAdvance);
      const duration = 180; // мобильный — чуть короче для snappier ощущения
      animateScroll(wrap, target, duration);
    }, { passive: false });

    // Позиционирование стрелок: на мобильных — под блоком (ниже), на десктопе — по центру
    // Замените текущую функцию updateArrowsPosition() на эту версию
function updateArrowsPosition(){
  const rect = wrap.getBoundingClientRect();
  const viewportH = window.innerHeight || document.documentElement.clientHeight;

  // Если блок совсем вне экрана — скрываем кнопки
  if (rect.bottom < 0 || rect.top > viewportH) {
    leftBtn.style.display = 'none';
    rightBtn.style.display = 'none';
    return;
  } else {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      leftBtn.style.display = 'none';
      rightBtn.style.display = 'none';
    } else {
      leftBtn.style.display = '';
      rightBtn.style.display = '';
    }
  }

  // Высота половины стрелки (для выравнивания)
  const arrowHalfH = Math.round(leftBtn.getBoundingClientRect().height / 2) || 22;

  // Для мобильных: размещаем кнопки ВНУТРИ блока, у его нижнего края,
  // с небольшим отступом (inset) чтобы не налезали на внешний контент.
  // Для десктопа оставляем вертикальный центр блока.
  let topPos;
  if (window.innerWidth < 600) {
    // rect.bottom — координата нижнего края блока относительно viewport.
    // Ставим центр кнопки на 12px выше нижнего края блока (т.е. внутри блока).
    const inset = 12; // при желании можно увеличить/уменьшить
    topPos = Math.round(rect.bottom - arrowHalfH - inset);
  } else {
    topPos = Math.round(rect.top + rect.height / 2 - arrowHalfH);
  }

  // Ограничим, чтобы кнопки не ушли за пределы viewport
  const clampedTop = Math.min(Math.max(8, topPos), viewportH - arrowHalfH - 8);

  // По горизонтали — внутри блока, с небольшим отступом от краёв
  const horizInset = 8; // отступ от краёв блока
  const leftX = Math.round(Math.max(6, rect.left + horizInset));
  const rightX = Math.round(Math.max(6, rect.right - horizInset - (rightBtn.getBoundingClientRect().width || 46)));

  leftBtn.style.top = clampedTop + 'px';
  leftBtn.style.left = leftX + 'px';
  leftBtn.style.height = (Math.round(Math.min(rect.height - 16, 96)) || 48) + 'px';
  leftBtn.style.width = leftBtn.style.width || '46px';

  rightBtn.style.top = clampedTop + 'px';
  rightBtn.style.left = rightX + 'px';
  rightBtn.style.height = leftBtn.style.height;
  rightBtn.style.width = rightBtn.style.width || '46px';
}


    let ticking = false;
    function scheduleUpdate(){ if (ticking) return; ticking = true; requestAnimationFrame(()=>{ updateArrowsPosition(); ticking = false; }); }

    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    setTimeout(scheduleUpdate, 120);
    window.addEventListener('load', scheduleUpdate, { passive: true });

    scheduleUpdate();

    window.__reviews = window.__reviews || {};
    window.__reviews.resumeAuto = function(){
      if (!wrap || !track) return;
      if (!autoPausedByUser) return;
      track.style.animation = '';
      track.style.animationPlayState = '';
      wrap.scrollLeft = 0;
      autoPausedByUser = false;
    };
  });
})();
