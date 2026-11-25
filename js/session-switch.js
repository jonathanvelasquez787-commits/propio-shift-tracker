// Traspaso de sesion (parte 2b de "una sola sesion a la vez"): el aviso y la pausa.
// Une las piezas de session-handoff.js con la pantalla de arranque:
//  - Al abrir, si hay otra sesion abierta en otro lugar, pregunta antes de abrir.
//  - "Abrir aqui" pide el traspaso, espera unos segundos a que la otra suba su ultimo estado y abre.
//  - La sesion que ya estaba abierta mira cada pocos segundos; al ver el pedido sube lo que tenia,
//    avisa que ya puede abrir la otra y se recarga en una pantalla de pausa (sin la app montada).
// Reglas que no se rompen:
//  - Si la nube falla o tarda, se abre normal: nunca se bloquea a la persona por esto.
//  - NUNCA se cierra la sesion de la cuenta (podria tumbar al worker de la extension).
//  - Una sesion en pausa no sube nada, no contesta "lista" a la extension y no tiene la app corriendo.
//  - Lo que la sesion pausada no alcanzo a subir queda en copias recuperables, nunca se pierde ni pisa la nube.
import { translateText } from './i18n.js';
import { findOtherSessions, announcePresence, requestTakeover, ackTakeover, waitForTakeoverAck, createTakeoverWatcher, createTakeoverNudge } from './session-handoff.js';
import { settleForTakeover, yieldToCloud, deviceId, deviceLabel } from './sync.js';

export const PAUSE_MARK_KEY = 'propio_session_paused_v1';

export function currentSessionKind() {
  return typeof location !== 'undefined' && location.protocol === 'chrome-extension:' ? 'extension' : 'web';
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

// Marca de "esta pagina quedo en pausa". Vive en el almacenamiento del navegador para que
// sobreviva a recargas y a cerrar/abrir la ventanita.
export function readPauseMark(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(PAUSE_MARK_KEY) || 'null');
    return value && typeof value === 'object' ? { saved: value.saved !== false, resume: value.resume === true } : null;
  } catch { return null; }
}
export function writePauseMark(mark, storage = globalThis.localStorage) {
  try { storage.setItem(PAUSE_MARK_KEY, JSON.stringify({ saved: mark.saved !== false, resume: mark.resume === true })); return true; }
  catch { return false; }
}
export function clearPauseMark(storage = globalThis.localStorage) {
  try { storage.removeItem(PAUSE_MARK_KEY); } catch { /* sin almacenamiento: no hay marca que borrar */ }
}

// Pantallas (se dibujan dentro del gate de arranque, antes de montar la app).
export function createGateScreens({ body = () => document.getElementById('bootGateBody') } = {}) {
  const put = (html) => { const el = body(); if (el) el.innerHTML = html; return el; };
  const listen = (id, handler) => { const el = document.getElementById(id); if (el) el.addEventListener('click', handler); };
  function prompt({ otherKind, onHere, onCancel, cancelled = false }) {
    const text = cancelled
      ? translateText('Propio sigue abierto en la otra sesión. Aquí no se abrirá hasta que toques Abrir aquí.')
      : otherKind === 'web'
        ? translateText('Tienes Propio abierto en la web. Si abres aquí, la web subirá su último estado y se pausará. Esperaremos unos segundos a que termine.')
        : translateText('Tienes Propio abierto en la herramienta. Si abres aquí, la herramienta subirá su último estado y se pausará. Esperaremos unos segundos a que termine.');
    const title = cancelled ? translateText('Propio no se abrió aquí') : translateText('Ya hay una sesión abierta');
    put(`
    <div class="boot-card" id="sessionSwitchCard" data-state="${cancelled ? 'cancelled' : 'prompt'}">
      <div class="boot-card-title">${escapeHtml(title)}</div>
      <p class="boot-card-text">${escapeHtml(text)}</p>
      <div class="boot-card-actions">
        <button class="mc-btn-primary cyan" id="sessionSwitchHere" type="button">${escapeHtml(translateText('Abrir aquí'))}</button>
        ${cancelled ? '' : `<button class="boot-btn-quiet" id="sessionSwitchCancel" type="button">${escapeHtml(translateText('Cancelar'))}</button>`}
      </div>
    </div>`);
    listen('sessionSwitchHere', onHere);
    listen('sessionSwitchCancel', onCancel);
  }
  function waiting() {
    put(`
    <span class="boot-spinner" aria-hidden="true"></span>
    <span class="boot-text" id="bootGateText">${escapeHtml(translateText('Esperando a que la otra sesión guarde…'))}</span>`);
  }
  function paused({ saved, onBack }) {
    const text = saved
      ? translateText('Esta sesión quedó en pausa. Tus datos ya están guardados. Si vuelves aquí, la otra sesión se pausará.')
      : translateText('Esta sesión quedó en pausa. Lo que no alcanzó a subirse quedó en copias recuperables. Si vuelves aquí, la otra sesión se pausará.');
    put(`
    <div class="boot-card" id="sessionSwitchCard" data-state="paused">
      <div class="boot-card-title">${escapeHtml(translateText('Abriste Propio en otro lugar'))}</div>
      <p class="boot-card-text">${escapeHtml(text)}</p>
      <p class="boot-card-hint">${escapeHtml(translateText('Las llamadas esperan en la cola hasta que una sesión las reciba.'))}</p>
      <div class="boot-card-actions">
        <button class="mc-btn-primary cyan" id="sessionSwitchBack" type="button">${escapeHtml(translateText('Volver aquí'))}</button>
      </div>
    </div>`);
    listen('sessionSwitchBack', onBack);
  }
  return { prompt, waiting, paused };
}

export function createSessionSwitch({
  getClient, getDeviceId = deviceId, getLabel = deviceLabel, kind = currentSessionKind(),
  readMark = readPauseMark, writeMark = writePauseMark, clearMark = clearPauseMark,
  screens = createGateScreens(), settle = settleForTakeover, yieldCloud = yieldToCloud, announce = announcePresence,
  reload = () => window.location.reload(), closeWindow = () => { try { window.close(); } catch { /* nada */ } },
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  setTimer, clearTimer,
}) {
  // Antes de montar la app. Devuelve 'open' (seguir con el arranque) o 'stay' (se queda la pantalla).
  async function gate(userId) {
    const mark = readMark();
    const peek = await findOtherSessions({ getClient, deviceId: getDeviceId(), kind });
    const others = peek.ok ? peek.others : [];

    if (mark && !mark.resume && others.length) {
      screens.paused({ saved: mark.saved, onBack: () => { writeMark({ saved: mark.saved, resume: true }); reload(); } });
      return 'stay';
    }

    async function finish() {
      // Esta pagina tenia datos viejos de cuando se pauso: se baja lo de la nube (lo sin subir queda en copias).
      if (mark) { if (await yieldCloud(userId)) clearMark(); }
      return 'open';
    }

    if (!others.length) return finish();

    async function takeOver() {
      screens.waiting();
      // Primero la nota de "estoy aqui", para que la otra sesion me vea al recargarse en pausa.
      await announce({ getClient, deviceId: getDeviceId(), label: getLabel(), kind });
      const asked = await requestTakeover({ getClient, deviceId: getDeviceId(), label: getLabel(), kind });
      if (asked) await waitForTakeoverAck({ getClient, deviceId: getDeviceId(), kind, sleep, now });
      return finish();
    }

    if (mark && mark.resume) return takeOver();

    const otherKind = others.some(row => row.kind === 'web') ? 'web' : 'extension';
    return new Promise((resolve) => {
      let busy = false;
      const here = () => { if (busy) return; busy = true; resolve(takeOver()); };
      const cancel = () => {
        screens.prompt({ otherKind, onHere: here, cancelled: true });
        if (kind === 'extension') closeWindow();
      };
      screens.prompt({ otherKind, onHere: here, onCancel: cancel });
    });
  }

  // Ya con la app abierta: mira si alguien pidio el traspaso. `onBeforePause` apaga lo de la extension.
  // Con `userId`, ademas escucha el aviso de Realtime: solo adelanta la revision (poke); el pedido
  // real se sigue leyendo de la nube, y la revision cada 5 s queda como respaldo si Realtime falla.
  function watch({ startedAt, onBeforePause = () => {}, userId = null }) {
    let nudge = null;
    const watcher = createTakeoverWatcher({
      getClient, deviceId: getDeviceId(), kind, startedAt, now,
      ...(setTimer ? { setTimer, clearTimer } : {}),
      onTakeover: ({ late }) => { if (nudge) nudge.stop(); void pause({ late, onBeforePause }); },
    });
    if (userId) nudge = createTakeoverNudge({ getClient, userId, onNudge: () => watcher.poke() });
    watcher.start();
    if (nudge) {
      nudge.start();
      try { if (typeof window !== 'undefined') window.addEventListener('pagehide', () => nudge.stop(), { once: true }); } catch { /* nada */ }
    }
    return { start: watcher.start, isRunning: watcher.isRunning, poke: watcher.poke,
      stop() { watcher.stop(); if (nudge) nudge.stop(); } };
  }

  async function pause({ late, onBeforePause }) {
    try { onBeforePause(); } catch { /* seguir pausando aunque falle */ }
    let saved = false;
    try {
      // Pedido viejo (la pagina estuvo dormida): no se sube nada, solo se pausa.
      const result = await settle({ push: !late });
      saved = result.saved === true;
      if (!late && saved) await ackTakeover({ getClient });
    } catch { saved = false; }
    writeMark({ saved, resume: false });
    reload();
  }

  return { gate, watch, pause };
}

let singleton = null;
function instance(getClient) { return singleton || (singleton = createSessionSwitch({ getClient })); }

export function resolveSessionGate({ getClient, userId }) { return instance(getClient).gate(userId); }
export function startSessionPause({ getClient, startedAt, onBeforePause, userId }) { return instance(getClient).watch({ startedAt, onBeforePause, userId }); }
