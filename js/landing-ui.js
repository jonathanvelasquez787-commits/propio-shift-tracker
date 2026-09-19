// Movimiento de la landing. Nada de esto toca la autenticación: si este módulo
// falla, la página se ve estática pero entra igual (ver la regla
// `html:not(.js-reveal) .reveal` en landing.css).

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Aparición al hacer scroll
// ---------------------------------------------------------------------------

if (!reduceMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js-reveal');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        // Una sola vez: volver a animar al subir y bajar marea más que ayuda.
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // El mock de la app anima sus barras cuando entra en pantalla.
  const preview = document.querySelector('.preview-frame');
  if (preview) observer.observe(preview);
} else {
  document.querySelectorAll('.reveal, .preview-frame').forEach((el) => el.classList.add('is-visible'));
}

// ---------------------------------------------------------------------------
// Sombra de la cabecera solo cuando ya se bajó
// ---------------------------------------------------------------------------

const header = document.querySelector('.site-header');
if (header) {
  const sync = () => header.classList.toggle('is-stuck', window.scrollY > 8);
  sync();
  window.addEventListener('scroll', sync, { passive: true });
}

// ---------------------------------------------------------------------------
// Reloj del mock: que el minutero corra da la sensación de app viva
// ---------------------------------------------------------------------------

const clock = document.getElementById('previewClock');
if (clock && !reduceMotion) {
  const tick = () => {
    const now = new Date();
    clock.textContent = new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now);
  };
  tick();
  setInterval(tick, 1000);
}
