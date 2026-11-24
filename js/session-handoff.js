// Traspaso de sesion (parte 2a de "una sola sesion a la vez"): las piezas para hablar con la nube.
// Todavia no se conecta a la app: aqui solo estan las llamadas y sus reglas, probadas aparte.
// Reglas que no se rompen:
//  - Ninguna llamada lanza error hacia fuera: si la nube falla, se contesta "no se pudo" y la
//    app sigue como si no hubiera otra sesion (nunca se bloquea a la persona por esto).
//  - NUNCA cierra sesion de la cuenta (cerrar sesion global podria tumbar al worker).
//  - No guarda nada en el navegador y el worker de la extension NO usa este modulo.
export const TAKEOVER_POLL_MS = 5000;
export const WAIT_POLL_MS = 2000;
export const WAIT_LIMIT_MS = 15000;
export const LATE_SECONDS = 40;
export const PEEK_TIMEOUT_MS = 3000;
const CLOCK_SLACK_MS = 2000;

function limited(promise, ms, setTimer, clearTimer) {
  return new Promise((resolve, reject) => {
    const id = setTimer(() => reject(new Error('timeout')), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimer(id); resolve(value); },
      (error) => { clearTimer(id); reject(error); },
    );
  });
}

// Sesiones de OTRO navegador o de OTRO tipo vistas en los ultimos 2 minutos. No deja nota.
export async function findOtherSessions({ getClient, instance = null, deviceId, kind, timeoutMs = PEEK_TIMEOUT_MS,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  try {
    const { data, error } = await limited(getClient().rpc('session_others',
      { p_instance: instance, p_device_id: deviceId, p_kind: kind }), timeoutMs, setTimer, clearTimer);
    if (error || !Array.isArray(data)) return { ok: false, others: [] };
    return { ok: true, others: data.map(row => ({ instance: String(row.instance), deviceId: String(row.device_id),
      label: String(row.label), kind: String(row.kind), ageSeconds: Number(row.age_seconds) || 0 })) };
  } catch { return { ok: false, others: [] }; }
}

export async function requestTakeover({ getClient, deviceId, label, kind }) {
  try {
    const { error } = await getClient().rpc('session_takeover_request', { p_device_id: deviceId, p_label: label, p_kind: kind });
    return !error;
  } catch { return false; }
}

export async function ackTakeover({ getClient }) {
  try {
    const { error } = await getClient().rpc('session_takeover_ack');
    return !error;
  } catch { return false; }
}

async function readTakeover(getClient) {
  try {
    const { data, error } = await getClient().rpc('session_takeover_get');
    if (error || !Array.isArray(data) || !data[0]) return null;
    const row = data[0];
    return { byDeviceId: String(row.by_device_id), byLabel: String(row.by_label), byKind: String(row.by_kind),
      ageSeconds: Number(row.age_seconds) || 0, acked: row.acked === true };
  } catch { return null; }
}

// La sesion nueva espera a que la vieja confirme que ya subio su ultimo estado.
// Devuelve 'acked' o, pasado el limite, 'timeout' (entonces abre con lo que haya en la nube).
export async function waitForTakeoverAck({ getClient, deviceId, kind, sleep, now = Date.now,
  limitMs = WAIT_LIMIT_MS, pollMs = WAIT_POLL_MS }) {
  const startedAt = now();
  for (;;) {
    const row = await readTakeover(getClient);
    if (row && row.acked && row.byDeviceId === deviceId && row.byKind === kind) return 'acked';
    if (now() - startedAt + pollMs > limitMs) return 'timeout';
    await sleep(pollMs);
  }
}

// La sesion que ya estaba abierta mira cada pocos segundos si alguien pidio el traspaso.
// Solo cuenta una peticion hecha DESPUES de que esta pagina se abrio y por OTRO navegador/tipo.
// `late` = la peticion es vieja (la pagina estuvo dormida): no debe subir nada, solo guardar copia.
export function createTakeoverWatcher({ getClient, deviceId, kind, startedAt, onTakeover,
  setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now, pollMs = TAKEOVER_POLL_MS }) {
  let timer = null, running = false, busy = false;
  function schedule() { if (running) timer = setTimer(poll, pollMs); }
  async function poll() {
    timer = null;
    if (!running || busy) return;
    busy = true;
    let found = null;
    try {
      const row = await readTakeover(getClient);
      const mine = row && row.byDeviceId === deviceId && row.byKind === kind;
      if (row && !mine && row.ageSeconds * 1000 <= now() - startedAt + CLOCK_SLACK_MS) found = row;
    } finally { busy = false; }
    if (!running) return;
    if (found) {
      running = false;
      try { onTakeover({ byLabel: found.byLabel, byKind: found.byKind, ageSeconds: found.ageSeconds, late: found.ageSeconds > LATE_SECONDS }); }
      catch { /* el aviso nunca debe romper la app */ }
      return;
    }
    schedule();
  }
  return {
    start() { if (running) return; running = true; schedule(); },
    stop() { running = false; if (timer) clearTimer(timer); timer = null; },
    isRunning: () => running,
  };
}
