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
