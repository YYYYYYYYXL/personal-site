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

    function applyFilters(updateUrl = true, animate = true) {
      const query = (search?.value ?? '').trim().toLocaleLowerCase('zh-CN');
      let visible = 0;
      for (const project of projects) {
        const matches = (project.dataset.search ?? '').toLocaleLowerCase('zh-CN').includes(query);
        project.hidden = !matches;
        if (matches) {
          visible++;
          project.classList.remove('is-pending');
          if (animate && !reducedMotion.matches) {
            project.getAnimations().forEach(animation => animation.cancel());
            project.animate([
              { opacity: 0, transform: 'translateY(8px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ], { duration: 240, delay: Math.min(visible - 1, 3) * 35, easing: 'ease-out', fill: 'backwards' });
          }
        }
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
    window.addEventListener('popstate', () => { syncFromUrl(); applyFilters(false, false); }, { signal });
    syncFromUrl();
    applyFilters(false, false);
  }

  const revealElements = [...document.querySelectorAll<HTMLElement>(
    '.section-heading, .project-card, .capability-card, .focus-item, .about-strip, .about-story, .practice-list > article, .interests > article, .contact-methods > article',
  )];
  let observer: IntersectionObserver | undefined;
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('is-pending');
          observer?.unobserve(entry.target);
        }
      }
    }, { threshold: 0.06, rootMargin: '0px 0px -16px 0px' });
    revealElements.forEach((element, index) => {
      element.classList.add('motion-reveal');
      element.style.setProperty('--reveal-delay', `${index % 3 * 45}ms`);
      if (!element.hidden && element.getBoundingClientRect().top >= window.innerHeight - 16) {
        element.classList.add('is-pending');
        observer?.observe(element);
      } else element.classList.remove('is-pending');
    });
  }
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      observer?.disconnect();
      revealElements.forEach(element => element.classList.remove('is-pending'));
    }
  }, { signal });
  disposePage = () => { controller.abort(); observer?.disconnect(); };
}

document.addEventListener('astro:before-swap', () => disposePage?.());
document.addEventListener('astro:after-swap', () => document.documentElement.classList.add('has-js'));
document.addEventListener('astro:page-load', initializePage);
initializePage();
