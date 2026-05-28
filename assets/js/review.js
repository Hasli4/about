(function () {
  const WRAP_SELECTOR = ".reviews-wrap";
  const TRACK_SELECTOR = ".reviews-track";
  const CARD_SELECTOR = ".review-card";
  const INIT_ATTR = "reviewsLoopReady";

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function getGap(track) {
    const styles = getComputedStyle(track);
    return (
      parseFloat(styles.columnGap) ||
      parseFloat(styles.gap) ||
      18
    );
  }

  function getStepFor(card, track) {
    if (!card) {
      return 0;
    }

    return card.getBoundingClientRect().width + getGap(track);
  }

  function createArrow(direction) {
    const button = document.createElement("button");
    const isPrevious = direction === "previous";

    button.type = "button";
    button.className = `reviews-arrow reviews-arrow-${
      isPrevious ? "left" : "right"
    }`;
    button.setAttribute(
      "aria-label",
      isPrevious ? "Предыдущий отзыв" : "Следующий отзыв",
    );
    button.innerHTML = `<span class="chev" aria-hidden="true">${
      isPrevious ? "&#9664;" : "&#9654;"
    }</span>`;

    return button;
  }

  function initReviewsCarousel() {
    const wrap = document.querySelector(WRAP_SELECTOR);
    const track = document.querySelector(TRACK_SELECTOR);

    if (!wrap || !track || wrap.dataset[INIT_ATTR] === "1") {
      return;
    }

    const cards = Array.from(track.querySelectorAll(CARD_SELECTOR));
    if (cards.length < 2) {
      return;
    }

    wrap.dataset[INIT_ATTR] = "1";
    wrap.classList.add("reviews-loop");
    track.style.animation = "none";

    document
      .querySelectorAll(".reviews-arrow")
      .forEach((arrow) => {
        if (!wrap.contains(arrow)) {
          arrow.remove();
        }
      });

    const leftArrow = createArrow("previous");
    const rightArrow = createArrow("next");
    wrap.append(leftArrow, rightArrow);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let offset = 0;
    let lastFrame = 0;
    let rafId = 0;
    let isPausedByHover = false;
    let pauseAutoUntil = 0;
    let manual = null;

    function getSpeed() {
      return window.innerWidth <= 600 ? 14 : 18;
    }

    function setTransform() {
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }

    function normalizeForward() {
      let first = track.querySelector(CARD_SELECTOR);
      let step = getStepFor(first, track);

      while (first && step > 0 && offset >= step) {
        offset -= step;
        track.appendChild(first);
        first = track.querySelector(CARD_SELECTOR);
        step = getStepFor(first, track);
      }
    }

    function normalizeBackward() {
      while (offset < 0) {
        const last = track.querySelector(`${CARD_SELECTOR}:last-child`);
        if (!last) {
          offset = 0;
          return;
        }

        track.insertBefore(last, track.firstElementChild);
        offset += getStepFor(last, track);
      }
    }

    function startManualMove(targetOffset) {
      const startOffset = offset;
      const distance = Math.abs(targetOffset - startOffset);
      const duration = Math.min(
        620,
        Math.max(260, distance * (window.innerWidth <= 600 ? 1.1 : 1.35)),
      );

      manual = {
        startOffset,
        targetOffset,
        startTime: performance.now(),
        duration,
      };
    }

    function easeOutCubic(value) {
      return 1 - Math.pow(1 - value, 3);
    }

    function moveNext() {
      const first = track.querySelector(CARD_SELECTOR);
      const step = getStepFor(first, track);

      if (!step) {
        return;
      }

      startManualMove(step);
    }

    function movePrevious() {
      if (offset > 2) {
        startManualMove(0);
        return;
      }

      const last = track.querySelector(`${CARD_SELECTOR}:last-child`);
      if (!last) {
        return;
      }

      track.insertBefore(last, track.firstElementChild);
      offset += getStepFor(last, track);
      setTransform();
      startManualMove(0);
    }

    function tick(now) {
      if (!lastFrame) {
        lastFrame = now;
      }

      const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;

      if (manual) {
        const elapsed = now - manual.startTime;
        const progress = Math.min(elapsed / manual.duration, 1);
        const eased = easeOutCubic(progress);
        offset =
          manual.startOffset +
          (manual.targetOffset - manual.startOffset) * eased;

        if (progress >= 1) {
          offset = manual.targetOffset;
          normalizeForward();
          normalizeBackward();
          setTransform();
          manual = null;
          pauseAutoUntil = now + 900;
        } else {
          setTransform();
        }
      } else if (
        !isPausedByHover &&
        !reduceMotion.matches &&
        now >= pauseAutoUntil
      ) {
        offset += getSpeed() * deltaSeconds;
        normalizeForward();
        setTransform();
      }

      rafId = window.requestAnimationFrame(tick);
    }

    leftArrow.addEventListener("click", movePrevious);
    rightArrow.addEventListener("click", moveNext);

    wrap.addEventListener("mouseenter", () => {
      isPausedByHover = true;
    });

    wrap.addEventListener("mouseleave", () => {
      isPausedByHover = false;
    });

    wrap.addEventListener("focusin", () => {
      isPausedByHover = true;
    });

    wrap.addEventListener("focusout", () => {
      isPausedByHover = false;
    });

    document.addEventListener("visibilitychange", () => {
      lastFrame = 0;
    });

    window.addEventListener(
      "resize",
      () => {
        offset = Math.min(offset, getStepFor(track.querySelector(CARD_SELECTOR), track));
        setTransform();
      },
      { passive: true },
    );

    setTransform();
    rafId = window.requestAnimationFrame(tick);

    window.addEventListener(
      "pagehide",
      () => {
        window.cancelAnimationFrame(rafId);
      },
      { once: true },
    );
  }

  onReady(initReviewsCarousel);
})();
