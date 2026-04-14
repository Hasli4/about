(function () {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const overlay = document.getElementById('galleryModalOverlay');
  const modal = overlay.querySelector('.gallery-modal');
  const modalContainer = document.getElementById('galleryModalImage');
  const imgTag = document.getElementById('galleryModalImgTag');
  const spinner = document.getElementById('galleryModalSpinner');
  const caption = document.getElementById('galleryModalCaption');
  const closeBtn = document.getElementById('galleryModalClose');
  const focusStart = document.getElementById('modalFocusStart');
  const focusEnd = document.getElementById('modalFocusEnd');

  const prevBtn = document.getElementById('galleryModalPrev');
const nextBtn = document.getElementById('galleryModalNext');

let currentIndex = -1;
let modalLoadToken = 0;

  let lastActiveAnchor = null;
  let closeTimer = null;

  let captionFadeTimer = null;
  let captionInactivityTimer = null;

  function clearCaptionTimers() {
    if (captionFadeTimer) {
      clearTimeout(captionFadeTimer);
      captionFadeTimer = null;
    }
    if (captionInactivityTimer) {
      clearTimeout(captionInactivityTimer);
      captionInactivityTimer = null;
    }
  }

  function hideCaption() {
    caption.classList.add('is-faded');
  }

  function showCaption() {
    caption.classList.remove('is-faded');
  }

  function startInitialCaptionTimer() {
    clearCaptionTimers();
    showCaption();

    captionFadeTimer = setTimeout(() => {
      if (overlay.classList.contains('open')) {
        hideCaption();
      }
    }, 1500);
  }

  function startInactivityTimer() {
    if (!overlay.classList.contains('open')) return;

    if (captionInactivityTimer) {
      clearTimeout(captionInactivityTimer);
    }

    captionInactivityTimer = setTimeout(() => {
      if (overlay.classList.contains('open')) {
        hideCaption();
      }
    }, 1000);
  }

  function extractUrlFromCssVar(cssVal) {
    const m = cssVal.match(/url\((?:['"])?(.*?)(?:['"])?\)/);
    return m ? m[1] : cssVal.trim();
  }

  // preload + decode image; resolves when image is decoded (or loaded), rejects on error
  function preloadAndDecode(src) {
    return new Promise((resolve, reject) => {
      try {
        const pre = new Image();
        pre.src = src;

        if (pre.complete && pre.naturalWidth) {
          if (pre.decode) {
            pre.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
          return;
        }

        if (pre.decode) {
          pre.decode().then(() => resolve()).catch(() => {
            pre.onload = () => resolve();
            pre.onerror = (e) => reject(e);
          });
        } else {
          pre.onload = () => resolve();
          pre.onerror = (e) => reject(e);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  function timeout(ms) { return new Promise(res => setTimeout(res, ms)); }

  async function openModalForAnchor(a, keepOverlayOpen = false) {
    
  lastActiveAnchor = a;
  currentIndex = anchors.indexOf(a);
  const loadToken = ++modalLoadToken;

  const style = getComputedStyle(a);
  let imgVar = style.getPropertyValue('--img') || '';
  imgVar = imgVar.trim();
  const maybeThumbUrl = extractUrlFromCssVar(imgVar);
  const dataFull = a.getAttribute('data-full');
  const fullUrl = dataFull ? dataFull : maybeThumbUrl;

  const ariaLabel = a.querySelector('.img')?.getAttribute('aria-label') || a.getAttribute('aria-label') || a.querySelector('.caption')?.textContent || '';
  modalContainer.setAttribute('aria-label', ariaLabel || '');

  if (ariaLabel) {
    caption.style.display = 'block';
    caption.textContent = ariaLabel;
  } else {
    caption.style.display = 'none';
  }

  clearCaptionTimers();
  caption.classList.remove('is-faded');

  imgTag.src = '';
  imgTag.style.opacity = '0';
  spinner.classList.remove('show');

  let decodedQuick = false;
  try {
    decodedQuick = await Promise.race([preloadAndDecode(fullUrl), timeout(300).then(() => false)]);
  } catch (e) {
    decodedQuick = false;
  }

  if (decodedQuick) {
    if (loadToken !== modalLoadToken) return;
    imgTag.src = fullUrl;
    imgTag.alt = ariaLabel || '';
    imgTag.style.opacity = '1';

    if (!keepOverlayOpen) showOverlay();
    startInitialCaptionTimer();
  } else {
    if (!keepOverlayOpen) showOverlay();

    spinner.classList.add('show');
    imgTag.alt = ariaLabel || '';

    imgTag.onload = () => {
      if (loadToken !== modalLoadToken) return;
      spinner.classList.remove('show');
      imgTag.style.opacity = '1';
      imgTag.onload = null;
      startInitialCaptionTimer();
    };

    imgTag.onerror = () => {
      if (loadToken !== modalLoadToken) return;
      spinner.classList.remove('show');
      caption.style.display = 'block';
    };

    imgTag.src = fullUrl;
  }
}

  function showOverlay() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  overlay.classList.remove('closing');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  nav.setAttribute('aria-hidden', 'true');
  nav.style.pointerEvents = 'none';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
  document.addEventListener('keydown', onKeyDown);
  startInitialCaptionTimer();
}

function navigateModal(step) {
  if (!anchors.length) return;
  if (currentIndex < 0) currentIndex = anchors.indexOf(lastActiveAnchor);

  const nextIndex = (currentIndex + step + anchors.length) % anchors.length;
  if (nextIndex === currentIndex) return;

  openModalForAnchor(anchors[nextIndex], true);
}

  function closeModal() {
  if (closeTimer) clearTimeout(closeTimer);

  overlay.classList.remove('open');
  overlay.classList.add('closing');
  overlay.setAttribute('aria-hidden', 'true');

  clearCaptionTimers();
  caption.classList.remove('is-faded');

  nav.removeAttribute('aria-hidden');
  nav.style.pointerEvents = '';
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';

  document.removeEventListener('keydown', onKeyDown);

  closeTimer = setTimeout(() => {
    imgTag.src = '';
    imgTag.style.opacity = '0';
    spinner.classList.remove('show');
    caption.style.display = 'none';
    caption.textContent = '';

    overlay.classList.remove('closing');

    if (lastActiveAnchor) {
      lastActiveAnchor.focus();
      lastActiveAnchor = null;
    }

    closeTimer = null;
  }, 360);
}

  function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateModal(-1);
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    navigateModal(1);
    return;
  }
}

  const anchors = Array.from(nav.querySelectorAll('a'));
  anchors.forEach(a => {
    a.addEventListener('click', (ev) => { ev.preventDefault(); openModalForAnchor(a); });
    a.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openModalForAnchor(a); } });
  });

  closeBtn.addEventListener('click', (ev) => { ev.preventDefault(); closeModal(); });
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeModal(); });
  modal.addEventListener('mouseenter', () => {
    showCaption();
    startInactivityTimer();
  });
  prevBtn.addEventListener('click', (ev) => {
  ev.preventDefault();
  navigateModal(-1);
});

nextBtn.addEventListener('click', (ev) => {
  ev.preventDefault();
  navigateModal(1);
});
  modal.addEventListener('mousemove', () => {
    showCaption();
    startInactivityTimer();
  });

  modal.addEventListener('mouseleave', () => {
    clearCaptionTimers();
    hideCaption();
  });

  modal.addEventListener('mouseenter', () => {
    clearCaptionFadeTimer();
    caption.classList.remove('is-faded');
  });

  modal.addEventListener('mouseleave', () => {
    if (overlay.classList.contains('open')) {
      startCaptionFadeTimer();
    }
  });
  focusStart.addEventListener('focus', () => closeBtn.focus());
  focusEnd.addEventListener('focus', () => closeBtn.focus());
})();