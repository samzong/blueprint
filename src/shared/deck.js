(function () {
  const root = document.documentElement;
  const selector = root.dataset.deckSelector || "section";
  const offsetSelector = root.dataset.deckOffset;
  const progressHostSelector = root.dataset.deckProgressHost;
  const nextLabel = root.dataset.deckNextLabel || "Next";
  const slides = () => Array.from(document.querySelectorAll(selector));
  const currentIndex = () => {
    const list = slides();
    if (!list.length) return 0;
    const offset = offsetSelector ? document.querySelector(offsetSelector)?.offsetHeight || 0 : 0;
    const scrollPadding = Number.parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const y = window.scrollY + Math.max(offset, scrollPadding) + 1;
    let index = 0;
    for (let current = 0; current < list.length; current += 1) {
      if (list[current].offsetTop <= y) index = current;
      else break;
    }
    return index;
  };
  const goTo = (index) => {
    const list = slides();
    if (!list.length) return;
    const next = Math.max(0, Math.min(list.length - 1, index));
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    list[next].scrollIntoView({ behavior, block: "start" });
  };
  const go = (delta) => goTo(currentIndex() + delta);
  const slideTitle = (element, index) => {
    const title = element.getAttribute("data-rail-title");
    if (title && title.trim()) return title.trim();
    const eyebrow = element.querySelector(".eyebrow");
    if (eyebrow) {
      const copy = eyebrow.cloneNode(true);
      copy.querySelector(".num")?.remove();
      const text = copy.textContent.replace(/\s+/g, " ").trim();
      if (text) return text;
    }
    const tag = element.querySelector(".slide-tag, .meta-tag");
    if (tag) {
      const text = tag.textContent.replace(/\s+/g, " ").trim();
      if (text) return text;
    }
    const heading = element.querySelector("h2, h1");
    if (heading) return heading.textContent.replace(/\s+/g, " ").trim();
    return element.id || `Section ${index + 1}`;
  };

  const rail = document.createElement("div");
  rail.className = "deck-rail";
  rail.setAttribute("aria-label", "Section navigation");
  const iconFullscreen = '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>';
  const iconExitFullscreen = '<path d="M6 2v4H2M14 6V2h-4M10 14v-4h4M2 10h4v4"/>';
  const iconPlay = '<path d="M6 4l6 4-6 4z" fill="currentColor" stroke="none"/>';
  const iconPause = '<path d="M5 4v8M11 4v8"/>';
  rail.innerHTML = [
    '<button type="button" data-rail="fs" aria-label="Fullscreen">',
    '<span class="deck-rail-tip">Fullscreen</span>',
    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${iconFullscreen}</svg>`,
    "</button>",
    '<button type="button" data-rail="autoplay" aria-label="Autoplay">',
    '<span class="deck-rail-tip">Autoplay</span>',
    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${iconPlay}</svg>`,
    "</button>",
    '<button type="button" data-rail="top" aria-label="Top">',
    '<span class="deck-rail-tip">Top</span>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l5-5 5 5"/></svg>',
    "</button>",
    '<div class="deck-rail-track" data-rail-track></div>',
    '<button type="button" data-rail="last" aria-label="Last section">',
    '<span class="deck-rail-tip">Last</span>',
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l5 5 5-5"/></svg>',
    "</button>",
  ].join("");
  document.body.appendChild(rail);

  const mobileNav = document.createElement("nav");
  mobileNav.className = "mobile-deck-nav";
  mobileNav.setAttribute("aria-label", "移动端章节导航");
  mobileNav.innerHTML =
    '<span class="mobile-deck-count" aria-live="polite"></span><span class="mobile-deck-title"></span><button class="mobile-deck-next" type="button"></button>';
  document.body.appendChild(mobileNav);

  let autoplayRunning = new URLSearchParams(window.location.search).get("autoplay") === "1";
  const autoplayProgress = document.createElement("progress");
  autoplayProgress.className = "autoplay-progress";
  autoplayProgress.max = 1;
  autoplayProgress.value = 0;
  autoplayProgress.setAttribute("aria-label", "Current playback progress");
  const progressHost = progressHostSelector ? document.querySelector(progressHostSelector) : document.body;
  (progressHost || document.body).appendChild(autoplayProgress);

  const track = rail.querySelector("[data-rail-track]");
  const topButton = rail.querySelector('[data-rail="top"]');
  const lastButton = rail.querySelector('[data-rail="last"]');
  const fullscreenButton = rail.querySelector('[data-rail="fs"]');
  const autoplayButton = rail.querySelector('[data-rail="autoplay"]');
  const mobileCount = mobileNav.querySelector(".mobile-deck-count");
  const mobileTitle = mobileNav.querySelector(".mobile-deck-title");
  const mobileNextButton = mobileNav.querySelector(".mobile-deck-next");

  const syncAutoplayButton = () => {
    autoplayButton.setAttribute("aria-label", autoplayRunning ? "Pause autoplay" : "Autoplay");
    autoplayButton.setAttribute("aria-pressed", String(autoplayRunning));
    autoplayButton.querySelector(".deck-rail-tip").textContent = autoplayRunning ? "Pause" : "Autoplay";
    autoplayButton.querySelector("svg").innerHTML = autoplayRunning ? iconPause : iconPlay;
  };
  syncAutoplayButton();

  const tickShort = 8;
  const tickNear = 16;
  const tickLong = 28;
  const magnificationRadius = 36;
  let trackHot = false;
  const tickButtons = () => Array.from(track.querySelectorAll(".deck-rail-tick"));

  const paintRestTicks = () => {
    const index = currentIndex();
    tickButtons().forEach((tick, current) => {
      const distance = Math.abs(current - index);
      const width = distance === 0 ? tickLong : distance === 1 ? tickNear : tickShort;
      tick.style.setProperty("--tick-w", `${width}px`);
      tick.style.setProperty("--tick-h", distance === 0 ? "2px" : "1.5px");
      tick.classList.toggle("active", distance === 0);
      tick.classList.remove("is-hot");
    });
  };

  const magnifyTicks = (clientY) => {
    const list = tickButtons();
    let closest = 0;
    let best = Infinity;
    list.forEach((tick, index) => {
      const rect = tick.getBoundingClientRect();
      const distance = Math.abs(clientY - (rect.top + rect.height / 2));
      if (distance < best) {
        best = distance;
        closest = index;
      }
    });
    list.forEach((tick, index) => {
      const rect = tick.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.max(0, 1 - Math.abs(clientY - center) / magnificationRadius);
      const easing = distance * distance;
      tick.style.setProperty("--tick-w", `${(tickShort + (tickLong - tickShort) * easing).toFixed(2)}px`);
      tick.style.setProperty("--tick-h", `${(1.5 + 0.7 * easing).toFixed(2)}px`);
      tick.classList.toggle("is-hot", index === closest);
      tick.classList.toggle("active", index === closest);
    });
  };

  const syncMobileNav = () => {
    const list = slides();
    const index = currentIndex();
    const last = index >= list.length - 1;
    mobileCount.textContent = `${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
    mobileTitle.textContent = slideTitle(list[index], index);
    mobileNextButton.innerHTML = last
      ? '回到顶部 <span aria-hidden="true">↑</span>'
      : `${nextLabel} <span aria-hidden="true">↓</span>`;
    mobileNextButton.setAttribute(
      "aria-label",
      last ? "回到顶部" : `${nextLabel}：${slideTitle(list[index + 1], index + 1)}`,
    );
  };

  const syncRail = () => {
    if (!trackHot) paintRestTicks();
    const list = slides();
    const index = currentIndex();
    topButton.disabled = index <= 0 && window.scrollY < 8;
    lastButton.disabled = index >= list.length - 1;
    syncMobileNav();
  };

  const rebuildTicks = () => {
    track.innerHTML = "";
    slides().forEach((element, index) => {
      const title = slideTitle(element, index);
      const tick = document.createElement("button");
      tick.type = "button";
      tick.className = "deck-rail-tick";
      tick.setAttribute("aria-label", title);
      const tip = document.createElement("span");
      tip.className = "deck-rail-tip";
      tip.textContent = title;
      tick.appendChild(tip);
      tick.addEventListener("click", () => goTo(index));
      track.appendChild(tick);
    });
    syncRail();
  };

  const syncFullscreen = () => {
    const active = Boolean(document.fullscreenElement);
    fullscreenButton.setAttribute("aria-label", active ? "Exit fullscreen" : "Fullscreen");
    fullscreenButton.querySelector(".deck-rail-tip").textContent = active ? "Exit" : "Fullscreen";
    fullscreenButton.querySelector("svg").innerHTML = active ? iconExitFullscreen : iconFullscreen;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  rail.addEventListener("mousemove", (event) => {
    const rect = track.getBoundingClientRect();
    const inTrack =
      event.clientY >= rect.top - 4 &&
      event.clientY <= rect.bottom + 4 &&
      event.clientX >= rect.left - 8 &&
      event.clientX <= rect.right + 8;
    if (inTrack) {
      trackHot = true;
      magnifyTicks(event.clientY);
      return;
    }
    if (trackHot) {
      trackHot = false;
      paintRestTicks();
    }
  });
  rail.addEventListener("mouseleave", () => {
    trackHot = false;
    paintRestTicks();
  });

  topButton.addEventListener("click", () => goTo(0));
  lastButton.addEventListener("click", () => goTo(slides().length - 1));
  fullscreenButton.addEventListener("click", toggleFullscreen);
  mobileNextButton.addEventListener("click", () => {
    const index = currentIndex();
    goTo(index >= slides().length - 1 ? 0 : index + 1);
  });
  document.addEventListener("fullscreenchange", syncFullscreen);
  window.addEventListener("scroll", syncRail, { passive: true });
  window.addEventListener("resize", rebuildTicks);
  rebuildTicks();
  syncFullscreen();

  const slideDuration = 7000;
  const lastSlideDuration = 12000;
  let autoplayIndex = currentIndex();
  let elapsed = 0;
  let previous = performance.now();
  const tick = (now) => {
    const index = currentIndex();
    if (index !== autoplayIndex) {
      autoplayIndex = index;
      elapsed = 0;
      autoplayProgress.value = 0;
    }
    if (autoplayRunning && !document.hidden) {
      const duration = index === slides().length - 1 ? lastSlideDuration : slideDuration;
      elapsed += Math.min(now - previous, 100);
      autoplayProgress.value = Math.min(1, elapsed / duration);
      if (elapsed >= duration) {
        elapsed = 0;
        autoplayProgress.value = 0;
        goTo(index >= slides().length - 1 ? 0 : index + 1);
      }
    }
    previous = now;
    window.requestAnimationFrame(tick);
  };

  autoplayButton.addEventListener("click", () => {
    autoplayRunning = !autoplayRunning;
    previous = performance.now();
    syncAutoplayButton();
  });
  document.addEventListener("visibilitychange", () => {
    previous = performance.now();
  });
  window.requestAnimationFrame(tick);

  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    const tag = target?.tagName || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || target?.isContentEditable) return;
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(slides().length - 1);
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      toggleFullscreen();
    }
  });
})();
