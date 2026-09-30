export function wireAchievementHelp(root = document) {
  let active = null;
  const position = button => {
    const tooltip = button?.closest('.game-help-wrap')?.querySelector('[role="tooltip"]');
    if (!tooltip?.isConnected) return;
    const anchor = button.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - bounds.width - 8))}px`;
    tooltip.style.top = `${anchor.bottom + bounds.height + 12 < window.innerHeight ? anchor.bottom + 8 : Math.max(8, anchor.top - bounds.height - 8)}px`;
  };
  const open = event => {
    const button = event.target.closest?.('.game-help-wrap button');
    if (!button) return;
    active = button;
    position(button);
    if (event.type === 'click') button.focus();
  };
  for (const type of ['pointerover', 'focusin', 'click']) root.addEventListener(type, open);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && event.target.closest?.('.game-help-wrap')) {
      event.target.blur();
      active = null;
    }
  });
  window.addEventListener('resize', () => position(active));
  window.addEventListener('scroll', () => position(active), { passive: true });
}
