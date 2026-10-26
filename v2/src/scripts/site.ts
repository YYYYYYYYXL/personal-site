let disposePage: (() => void) | undefined;
function initializePage() {
  disposePage?.();
  const controller = new AbortController();
  const { signal } = controller;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('has-js');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const navigation = document.querySelector<HTMLElement>('[data-navigation]');

  function closeMenu() {
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', '打开导航菜单');
    navigation?.classList.remove('is-open');
  }

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    navigation?.classList.toggle('is-open', open);
  }, { signal });
  navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu, { signal }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  }, { signal });
  document.addEventListener('click', event => {
    if (event.target instanceof Node && !navigation?.contains(event.target) && !toggle?.contains(event.target)) closeMenu();
  }, { signal });
  window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); }, { signal });

  const library = document.querySelector<HTMLElement>('[data-project-library]');
  if (library) {
    const controls = library.querySelector<HTMLElement>('[data-filter-controls]');
    const search = library.querySelector<HTMLInputElement>('[data-project-search]');
    const projects = [...library.querySelectorAll<HTMLElement>('[data-project]')];
    const counter = library.querySelector<HTMLElement>('[data-result-count]');
    const empty = library.querySelector<HTMLElement>('[data-empty-state]');

    function syncFromUrl() {
      const params = new URLSearchParams(location.search);
      if (search) search.value = params.get('q') ?? '';
    }

    function applyFilters(updateUrl = true) {
      const query = (search?.value ?? '').trim().toLocaleLowerCase('zh-CN');
      let visible = 0;
      for (const project of projects) {
        const matches = (project.dataset.search ?? '').toLocaleLowerCase('zh-CN').includes(query);
        project.hidden = !matches;
        if (matches) visible++;
      }
      if (counter) counter.textContent = `共 ${visible} 个项目`;
      if (empty) empty.hidden = visible !== 0;
      if (updateUrl) {
        const url = new URL(location.href);
        url.searchParams.delete('category');
        if (query) url.searchParams.set('q', search?.value.trim() ?? ''); else url.searchParams.delete('q');
        history.replaceState(history.state, '', url);
      }
    }

    if (controls) controls.hidden = false;
    search?.addEventListener('input', () => applyFilters(), { signal });
    library.querySelector('[data-reset-filters]')?.addEventListener('click', () => { if (search) search.value = ''; applyFilters(); search?.focus(); }, { signal });
    window.addEventListener('popstate', () => { syncFromUrl(); applyFilters(false); }, { signal });
    syncFromUrl();
    applyFilters(false);
  }

  const layers = [...document.querySelectorAll<HTMLElement>('[data-parallax]')]
    .filter(element => element.querySelector('img'));
  const heroSection = document.querySelector<HTMLElement>('.hero');
  const heroArtwork = document.querySelector<HTMLElement>('.hero-image');
  const capabilityBackdrop = document.querySelector<HTMLElement>('.capability-backdrop');
  const focusSection = document.querySelector<HTMLElement>('.focus-section');
  const focusBackdrop = document.querySelector<HTMLElement>('.focus-backdrop');
  const citySection = document.querySelector<HTMLElement>('.about-strip-section');
  const cityBackdrop = document.querySelector<HTMLElement>('.city-backdrop');
  let animationFrame = 0;

  function updateParallax() {
    animationFrame = 0;
    if (reducedMotion.matches || document.hidden) return;
    const viewportHeight = window.innerHeight;
    const mobile = window.innerWidth <= 760;
    // Start the new scene only after the hero has scrolled above mid-screen.
    // The reveal follows scroll position in both directions, with no timed autoplay.
    const revealStart = viewportHeight * 0.5;
    const revealEnd = (document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 82) + 24;
    const heroBottom = heroSection?.getBoundingClientRect().bottom ?? revealEnd;
    const progress = Math.max(0, Math.min(1, (revealStart - heroBottom) / Math.max(1, revealStart - revealEnd)));
    const reveal = progress * progress * (3 - 2 * progress);
    const focusTop = focusSection?.getBoundingClientRect().top ?? viewportHeight;
    const focusProgress = Math.max(0, Math.min(1, (revealStart - focusTop) / Math.max(1, revealStart - revealEnd)));
    const focusReveal = focusProgress * focusProgress * (3 - 2 * focusProgress);
    const cityTop = citySection?.getBoundingClientRect().top ?? viewportHeight;
    const remainingScroll = Math.max(0, document.documentElement.scrollHeight - window.scrollY - viewportHeight);
    // The final section must finish revealing before the document's scroll limit.
    const cityRevealEnd = Math.max(revealEnd, cityTop - remainingScroll + 24);
    const cityRevealStart = Math.max(viewportHeight * 0.65, cityRevealEnd + viewportHeight * 0.25);
    const cityProgress = Math.max(0, Math.min(1, (cityRevealStart - cityTop) / Math.max(1, cityRevealStart - cityRevealEnd)));
    const cityReveal = cityProgress * cityProgress * (3 - 2 * cityProgress);
    // Read every frame's geometry before writing transforms. Only artwork moves.
    const positions = layers.map(element => {
      const rect = element.getBoundingClientRect();
      if (element.closest('[hidden]') || rect.bottom < 0 || rect.top > viewportHeight) return null;
      const hero = element.dataset.parallax === 'hero';
      const scene = element.dataset.parallax === 'scene';
      const range = hero ? Math.min(110, rect.height * 0.18) : scene ? Math.min(140, rect.height * 0.3) : Math.min(30, rect.height * 0.15);
      const distance = hero ? Math.max(0, -rect.top) : viewportHeight / 2 - rect.top - rect.height / 2;
      const speed = hero ? (mobile ? 0.12 : 0.24) : scene ? (mobile ? 0.15 : 0.28) : (mobile ? 0.05 : 0.09);
      return { element, offset: Math.max(-range, Math.min(range, distance * speed)) };
    });
    positions.forEach(position => {
      if (position) position.element.style.setProperty('--parallax-y', `${position.offset.toFixed(2)}px`);
    });
    capabilityBackdrop?.style.setProperty('--scene-opacity', (reveal * (1 - focusReveal)).toFixed(3));
    if (capabilityBackdrop) heroArtwork?.style.setProperty('--hero-opacity', (1 - reveal).toFixed(3));
    cityBackdrop?.style.setProperty('--scene-opacity', cityReveal.toFixed(3));
    focusBackdrop?.style.setProperty('--scene-opacity', (focusReveal * (1 - cityReveal)).toFixed(3));
  }

  function scheduleParallax() {
    if (!animationFrame && !reducedMotion.matches && !document.hidden && layers.length) {
      animationFrame = requestAnimationFrame(updateParallax);
    }
  }

  function configureParallax() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    const ranges = layers.map(element => ({
      element,
      range: element.dataset.parallax === 'hero'
        ? Math.min(110, element.clientHeight * 0.18)
        : element.dataset.parallax === 'scene'
          ? Math.min(140, element.clientHeight * 0.3)
          : Math.min(30, element.clientHeight * 0.15),
    }));
    ranges.forEach(({ element, range }) => {
      element.classList.toggle('parallax-active', !reducedMotion.matches);
      element.style.removeProperty('--parallax-y');
      if (reducedMotion.matches) element.style.removeProperty('--parallax-range');
      else element.style.setProperty('--parallax-range', `${range}px`);
    });
    if (reducedMotion.matches) {
      capabilityBackdrop?.style.setProperty('--scene-opacity', '1');
      heroArtwork?.style.setProperty('--hero-opacity', '1');
      cityBackdrop?.style.setProperty('--scene-opacity', '1');
      focusBackdrop?.style.setProperty('--scene-opacity', '1');
    }
    scheduleParallax();
  }

  window.addEventListener('scroll', scheduleParallax, { passive: true, signal });
  window.addEventListener('resize', configureParallax, { passive: true, signal });
  window.addEventListener('load', scheduleParallax, { once: true, signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(animationFrame); animationFrame = 0; }
    else scheduleParallax();
  }, { signal });
  reducedMotion.addEventListener('change', configureParallax, { signal });
  configureParallax();
  disposePage = () => { controller.abort(); cancelAnimationFrame(animationFrame); };
}

window.addEventListener('pagehide', () => disposePage?.());
window.addEventListener('pageshow', event => { if (event.persisted) initializePage(); });
initializePage();
