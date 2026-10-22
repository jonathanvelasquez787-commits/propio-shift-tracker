export function presentationPreferences(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return { enabled: source.enabled === true, earnings: source.earnings !== false,
    schedule: source.schedule !== false, game: source.game === true };
}

export function applyPresentation(settings, doc = document) {
  const preferences = presentationPreferences(settings.essentialView);
  for (const key of ['earnings', 'schedule', 'game']) {
    doc.documentElement.classList.toggle(`essential-hide-${key}`, preferences.enabled && !preferences[key]);
  }
  for (const input of doc.querySelectorAll('[data-essential-option]')) {
    input.checked = preferences[input.dataset.essentialOption];
    input.disabled = input.dataset.essentialOption !== 'enabled' && !preferences.enabled;
  }
}

export function wirePresentation({ getSettings, save, apply }, doc = document) {
  let activeHelp = null;
  const positionHelp = button => {
    const host = doc.defaultView;
    const tooltip = button?.closest('.sched-help-wrap')?.querySelector('[role="tooltip"]');
    if (!host || !tooltip || !button.getBoundingClientRect) return;
    const anchor = button.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(anchor.left, host.innerWidth - bounds.width - 8))}px`;
    tooltip.style.top = `${anchor.bottom + bounds.height + 12 < host.innerHeight ? anchor.bottom + 8 : Math.max(8, anchor.top - bounds.height - 8)}px`;
  };
  for (const type of ['focusin', 'pointerover']) doc.addEventListener(type, event => {
    const button = event.target.closest?.('.sched-help-wrap button[aria-describedby]');
    if (!button || button.closest('.game-help-wrap') || !button.closest('.sched-help-wrap')?.querySelector('[role="tooltip"]')) return;
    activeHelp = button; positionHelp(button);
  });
  doc.defaultView?.addEventListener('resize', () => positionHelp(activeHelp));
  doc.defaultView?.addEventListener('scroll', () => positionHelp(activeHelp), { passive:true, capture:true });
  doc.querySelector('.skip-link')?.addEventListener('click', event => {
    const page = doc.querySelector('.app-page:not([hidden])');
    if (!page) return;
    event.preventDefault();
    page.setAttribute('tabindex', '-1'); page.focus();
    page.scrollIntoView({ block: 'start' });
  });
  for (const input of doc.querySelectorAll('[data-essential-option]')) {
    input.addEventListener('change', () => {
      const owner = getSettings(), previous = owner.essentialView;
      owner.essentialView = { ...presentationPreferences(previous), [input.dataset.essentialOption]: input.checked };
      if (save() === false && owner === getSettings()) owner.essentialView = previous;
      apply();
    });
  }
  doc.addEventListener('click', event => {
    const button = event.target.closest?.('.sched-help-wrap button[aria-describedby]');
    if (button?.closest('.game-help-wrap')) return;
    if (button && !button.closest('.sched-help-wrap')?.querySelector('[role="tooltip"]')) return;
    const open = doc.querySelector('.sched-help-wrap.is-help-open');
    const wrap = button?.closest('.sched-help-wrap');
    if (open && open !== wrap) { open.classList.remove('is-help-open'); open.classList.add('is-help-dismissed'); open.querySelector('button')?.setAttribute('aria-expanded', 'false'); }
    if (wrap) {
      activeHelp = button; positionHelp(button);
      wrap.classList.remove('is-help-dismissed');
      const expanded = wrap.classList.toggle('is-help-open');
      wrap.classList.toggle('is-help-dismissed', !expanded);
      button.setAttribute('aria-expanded', String(expanded));
    }
  }, true);
  doc.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = doc.querySelector('.sched-help-wrap.is-help-open') || doc.querySelector('.sched-help-wrap:focus-within:not(.game-help-wrap):not(.is-help-dismissed)');
    if (!open?.querySelector('[role="tooltip"]')) return;
    open.classList.remove('is-help-open');
    open.classList.add('is-help-dismissed');
    open.querySelector('button')?.setAttribute('aria-expanded', 'false');
    event.preventDefault(); event.stopPropagation();
  }, true);
  doc.addEventListener('focusout', event => {
    event.target.closest?.('.sched-help-wrap')?.classList.remove('is-help-dismissed');
  });
}
