export function restoreAutomaticGameChanges(current, before, after) {
  const absent = Symbol('absent'), clone = value => value === absent ? absent : JSON.parse(JSON.stringify(value));
  const equal = (a, b) => a === absent || b === absent ? a === b : JSON.stringify(a) === JSON.stringify(b);
  function undo(value, previous, started) {
    if (equal(previous, started)) return clone(value);
    if (equal(value, started)) return clone(previous);
    if (typeof value === 'number' && Number.isFinite(value) && typeof started === 'number'
      && (previous === absent || typeof previous === 'number')) return value + (previous === absent ? 0 : previous) - started;
    if (Array.isArray(value) && Array.isArray(started) && (previous === absent || Array.isArray(previous))) {
      const old = previous === absent ? [] : previous, next = clone(value);
      for (const item of started) if (!old.some(prior => equal(prior, item))) {
        const index = next.findIndex(candidate => equal(candidate, item)); if (index >= 0) next.splice(index, 1);
      }
      for (const item of old) if (!started.some(prior => equal(prior, item)) && !next.some(candidate => equal(candidate, item))) next.push(clone(item));
      return next;
    }
    const record = item => item !== absent && item && typeof item === 'object' && !Array.isArray(item);
    if (record(value) && (record(previous) || previous === absent) && (record(started) || started === absent)) {
      const old = previous === absent ? {} : previous, initial = started === absent ? {} : started, result = {};
      for (const key of new Set([...Object.keys(value), ...Object.keys(old), ...Object.keys(initial)])) {
        const item = undo(Object.hasOwn(value, key) ? value[key] : absent, Object.hasOwn(old, key) ? old[key] : absent,
          Object.hasOwn(initial, key) ? initial[key] : absent);
        if (item !== absent) Object.defineProperty(result, key, { value: item, enumerable: true, writable: true, configurable: true });
      }
      return result;
    }
    return clone(value);
  }
  return after ? undo(current, before, after) : clone(before);
}

export function activityEffects(kind, active, translateText) {
  if (kind === 'call') return [
    translateText('La llamada activa se descarta sin crear un registro ni ganancias.'),
    active.interruptedPauseRollback?.pause ? translateText('Se retoma la pausa que esta llamada interrumpió, conservando su inicio.') : '',
    active.autoStartedShift ? translateText('Se revierte el turno abierto por esta llamada y su progreso automático.') : translateText('Tu turno existente se conserva.'),
    translateText('El ACW previo y las llamadas guardadas se conservan.'),
  ].filter(Boolean);
  return [
    active.continuationClosedPause ? translateText('Se descarta esta continuación y vuelve el tramo de pausa que ya estaba terminado.')
      : translateText('Se descarta la pausa activa completa; no se suma a tu historial ni a Adherencia.'),
    translateText('Tu turno y las llamadas guardadas se conservan.'),
  ];
}

export function confirmActivityChange(context, kind, active, expected, change, done) {
  const { ui, translateText } = context;
  const owner = context.data(), title = kind === 'call' ? translateText('Descartar llamada')
    : active.type === 'lunch' ? translateText('Descartar Lunch') : translateText('Descartar Break');
  let settled = false;
  context.appConfirm(translateText('Revisá lo que cambiará antes de confirmar.'), () => {
    if (settled) return false;
    settled = true;
    const current = context.data();
    if (current.state !== owner.state || current.settings !== owner.settings || context.signature() !== expected || !context.canPersistLocalChanges()) {
      context.toast(translateText('La actividad cambió. Revisá de nuevo antes de descartarla.')); return false;
    }
    const before = JSON.parse(JSON.stringify(current.state));
    try {
      change();
      if (context.saveStateOnly() === false) throw Error('SAVE_REJECTED');
    } catch {
      context.setState(before); context.render();
      context.toast(translateText('No se guardó el descarte. Tu actividad anterior se conservó.')); return false;
    }
    done(active); context.render(); return true;
  });
  const heading = document.getElementById('confirmModalTitle');
  if (heading) heading.textContent = title;
  const details = document.getElementById('confirmModalDetails');
  if (details) details.innerHTML = ui`<ul class="confirmation-effects">${activityEffects(kind, active, translateText).map(line => ui`<li>${context.escapeHtml(line)}</li>`).join('')}</ul>`;
}
