let pending, attempts = 0, failed = false;

export async function loadDetailViews({ retry = false } = {}) {
  if (failed && !retry) return null;
  try {
    if (!pending) {
      const url = new URL('./detail-views.js', import.meta.url);
      url.search = new URL(import.meta.url).search;
      // Chrome conserva imports fallidos. El fragmento renueva su identidad sin cambiar el asset offline.
      url.hash = `retry-${attempts}`;
      pending = attempts++ ? import(url.href) : import('./detail-views.js');
    }
    const view = await pending;
    failed = false;
    return view;
  } catch {
    pending = null;
    failed = true;
    return null;
  }
}
