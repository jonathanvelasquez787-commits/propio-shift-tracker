export function validateImportPayload(payload, translateText, validFinanceSettings) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { ok: false, error: translateText('El archivo no contiene un objeto JSON válido.') };
      }
      if (!payload.state || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
        return { ok: false, error: translateText('Falta el campo "state" (o no es válido) en el archivo.') };
      }
      const validRecord = value => value && typeof value === 'object' && !Array.isArray(value);
      const validTimestamp = value => (typeof value === 'string' || typeof value === 'number')
        && Number.isFinite(new Date(value).getTime());
      for (const [key, timestamps] of [['events', ['ts']], ['pauseHistory', ['startedAt', 'endedAt']]]) {
        if (!(key in payload.state)) continue;
        const records = payload.state[key];
        if (!Array.isArray(records) || records.some(record => !validRecord(record)
          || timestamps.some(field => !validTimestamp(record[field])))) {
          return { ok: false, error: translateText('El respaldo contiene un historial de actividad inválido. Tus datos actuales no se cambiaron.') };
        }
      }
      for (const key of ['activeCall', 'activePause', 'pendingLiveCallBackup']) {
        if (payload.state[key] != null && !validRecord(payload.state[key])) {
          return { ok: false, error: translateText('El respaldo contiene un historial de actividad inválido. Tus datos actuales no se cambiaron.') };
        }
      }
      if (!Array.isArray(payload.calls)) {
        return { ok: false, error: translateText('Falta el campo "calls" (o no es una lista) en el archivo.') };
      }
      if (payload.calls.some(call => !call || typeof call !== 'object' || Array.isArray(call))) {
        return { ok: false, error: translateText('El respaldo contiene llamadas inválidas. Tus datos actuales no se cambiaron.') };
      }
      if ('settings' in payload && (!payload.settings || typeof payload.settings !== 'object' || Array.isArray(payload.settings))) {
        return { ok: false, error: translateText('El campo "settings" del respaldo no es válido.') };
      }
      if (payload.settings && !validFinanceSettings(payload.settings)) {
        return { ok: false, error: translateText('El respaldo contiene datos de Finanzas inválidos o duplicados. Tus datos actuales no se cambiaron.') };
      }
      return { ok: true };
    }

const clone = value => JSON.parse(JSON.stringify(value));
export function replacementSignature(snapshot) {
  return JSON.stringify([snapshot.calls, snapshot.settings, { ...snapshot.state, game: null, activeDayKey: null, lastCalendarDay: null }]);
}

export function snapshotCounts(snapshot) {
  return [snapshot.calls?.length || 0, snapshot.state?.events?.length || 0, snapshot.state?.pauseHistory?.length || 0];
}

function comparisonHtml(context, incoming) {
  const { ui, translateText, escapeHtml } = context;
  const current = snapshotCounts(context.data());
  const labels = [translateText('Llamadas'), translateText('Acciones'), translateText('Pausas terminadas')];
  const next = incoming ? snapshotCounts(incoming) : null;
  const caption = incoming ? translateText('Actual → respaldo') : translateText('Copia completa actual');
  return `<div class="recovery-card snapshot-comparison"><strong class="note">${escapeHtml(caption)}</strong>${labels.map((label, i) => ui`<div class="fin-preview-row"><span>${escapeHtml(label)}</span><strong>${current[i]}${next ? ` → ${next[i]}` : ''}</strong></div>`).join('')}</div>`;
}

export function confirmReplacement(context, kind, change, options = {}) {
  const { ui, translateText, escapeHtml } = context;
  const owner = context.data(), account = context.account(), expected = replacementSignature(owner);
  const incoming = options.incoming;
  const effects = kind === 'day' ? [
    ui`Día que se reinicia: ${options.dayLabel}.`,
    translateText('Se eliminan sus llamadas, pausas, huecos, nota, acciones y progreso diario. Otros días, horario y metas se conservan.'),
  ] : kind === 'reset' ? [
    translateText('Se reinician todos los días, llamadas, turnos, pausas, Logros, Finanzas, horario, metas y perfil de la tool.'),
    translateText('Tu cuenta y los ajustes propios de la extensión se conservan.'),
  ] : [
    translateText('Las llamadas, turnos, pausas, notas y Logros actuales se reemplazan por los del respaldo.'),
    incoming?.settings ? translateText('Se reemplazan también horario, metas, Finanzas, Higher Rate y perfil con los ajustes del respaldo.')
      : translateText('El respaldo no incluye ajustes: tu configuración actual se conserva.'),
    incoming?.state?.activeCall || incoming?.state?.activePause ? translateText('El respaldo contiene una actividad abierta; se restaurará con su hora de inicio original.') : '',
  ];
  effects.push(translateText('El cambio se sincroniza con tu cuenta al reconectar. Antes se guarda una copia privada en este navegador, accesible desde Reiniciar → Copias recuperables.'));
  if (kind !== 'import') effects.push(translateText('El historial oficial de Propio no se borra; una sincronización posterior puede volver a incorporarlo.'));
  let settled = false;
  context.appConfirm(translateText('Revisá el alcance. Podés cancelar sin cambiar nada.'), () => {
    if (settled) return false;
    settled = true;
    const current = context.data();
    if (!account || context.account() !== account || current.state !== owner.state || current.settings !== owner.settings
      || replacementSignature(current) !== expected || !context.canPersistLocalChanges()) {
      context.toast(translateText('Los datos cambiaron. Abrí de nuevo esta acción antes de confirmar.')); return false;
    }
    if (current.state.activeCall || current.state.activePause || current.state.pendingLiveCallBackup) {
      context.toast(translateText('Terminá o descartá la actividad pendiente antes de reemplazar datos.')); return false;
    }
    const before = clone(current);
    try { context.preserve(before, kind); }
    catch (error) { context.toast(error.message || translateText('No se pudo conservar la copia anterior. No se cambiaron tus datos.')); return false; }
    try {
      if (change() === false) throw Error('SAVE_REJECTED');
    } catch {
      context.restore(before);
      context.toast(translateText('No se guardó el cambio. Tus datos anteriores se conservaron.')); return false;
    }
    return true;
  });
  const heading = document.getElementById('confirmModalTitle');
  if (heading) heading.textContent = kind === 'day' ? translateText('Reiniciar día') : kind === 'reset' ? translateText('Reiniciar todos los datos') : translateText('Restaurar respaldo');
  const details = document.getElementById('confirmModalDetails');
  if (details) details.innerHTML = comparisonHtml(context, incoming) + ui`<ul class="confirmation-effects">${effects.filter(Boolean).map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
}

export function importBackupFile(context, file, maxBytes) {
  const { translateText } = context;
  if (file.size > maxBytes) return context.toast(translateText('El respaldo excede el tamaño permitido. Elegí un JSON exportado por la tool.'));
  const owner = context.data(), account = context.account(), expected = replacementSignature(owner);
  const reader = new FileReader();
  reader.onload = () => {
    if (context.data().state !== owner.state || context.account() !== account || replacementSignature(context.data()) !== expected) {
      context.toast(translateText('Los datos cambiaron mientras se leía el archivo. Elegilo de nuevo.')); return;
    }
    let payload;
    try { payload = JSON.parse(String(reader.result || '')); }
    catch { context.toast(translateText('Ese archivo no es JSON válido.')); return; }
    const checked = validateImportPayload(payload, translateText, context.validFinanceSettings);
    if (!checked.ok) { context.toast(checked.error); return; }
    confirmReplacement(context, 'import', () => {
      if (context.applyImportedPayload(payload) === false) return false;
      context.toast(translateText('Respaldo restaurado. La copia anterior sigue disponible.')); return true;
    }, { incoming: payload });
  };
  reader.onerror = () => context.toast(translateText('No se pudo leer el archivo.'));
  reader.readAsText(file);
}

export function openSnapshotRecovery(context) {
  const { ui, translateText, escapeHtml } = context;
  const account = context.account(), copies = context.copies().slice().reverse();
  if (!copies.length) return context.toast(translateText('Todavía no hay copias recuperables para tu cuenta en este navegador.'));
  context.appConfirm(translateText('Elegí una copia para revisar antes de restaurar. Se reemplazará el conjunto completo, no solo el día borrado.'), () => {
    if (context.account() !== account || !context.canPersistLocalChanges()) return false;
    const id = document.getElementById('snapshotRecoverySelect')?.value;
    const copy = context.copies().find(item => item.id === id);
    if (!copy || !validateImportPayload(copy.snapshot, translateText, context.validFinanceSettings).ok) return false;
    confirmReplacement(context, 'import', () => {
      if (context.applyImportedPayload(clone(copy.snapshot)) === false) return false;
      context.toast(translateText('Copia recuperada. También se conservó lo que tenías antes de restaurar.')); return true;
    }, { incoming: copy.snapshot });
    return true;
  });
  const heading = document.getElementById('confirmModalTitle');
  if (heading) heading.textContent = translateText('Copias recuperables');
  const details = document.getElementById('confirmModalDetails');
  if (details) details.innerHTML = ui`<label class="note" for="snapshotRecoverySelect">Copia guardada en este navegador</label><select id="snapshotRecoverySelect" style="width:100%;max-width:100%;margin:8px 0 14px;">${copies.map(copy => {
    const date = new Date(copy.createdAt);
    return `<option value="${escapeHtml(copy.id)}">${escapeHtml(`${context.fmtDate(date)} ${context.fmtTime(date)} · ${snapshotCounts(copy.snapshot)[0]}`)} ${escapeHtml(translateText('llamadas'))}</option>`;
  }).join('')}</select><p class="alert-hint">Estas copias son locales, privadas de tu cuenta y no sustituyen un respaldo JSON descargado. Borrar los datos del navegador también las elimina.</p>`;
}
