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
// Tope de cada pregunta a la nube mientras se espera el traspaso: si no contesta, se sigue sin ella.
export const CALL_LIMIT_MS = 4000;
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

// Deja una nota de "estoy aqui" ANTES de pedir el traspaso. La pagina que va a abrir todavia no
// tiene la app montada (su nota normal sale despues), y sin esto la otra sesion, al recargarse en
// pausa, no ve a nadie y se abre sola. Nunca lanza error: si falla, el traspaso sigue igual.
export async function announcePresence({ getClient, deviceId, label, kind, randomId = () => globalThis.crypto.randomUUID(),
  timeoutMs = PEEK_TIMEOUT_MS, setTimer = setTimeout, clearTimer = clearTimeout }) {
  try {
    const { error } = await limited(getClient().rpc('session_heartbeat',
      { p_instance: randomId(), p_device_id: deviceId, p_label: label, p_kind: kind }), timeoutMs, setTimer, clearTimer);
    return !error;
  } catch { return false; }
}

// Borra notas de sesiones que ya no contestan (mejor esfuerzo, nunca lanza error). Solo se usa cuando
// nadie confirmo el traspaso: esas notas eran de paginas que ya no estan. Si una de verdad seguia
// viva, vuelve a dejar su nota en su siguiente latido.
export async function dropNotes({ getClient, instances, timeoutMs = PEEK_TIMEOUT_MS, setTimer = setTimeout, clearTimer = clearTimeout }) {
  // En paralelo: con varias notas muertas que no contestan, el total sigue siendo UN tope, no uno por nota.
  const results = await Promise.all(instances.map(async (instance) => {
    try {
      const { error } = await limited(getClient().rpc('session_leave', { p_instance: instance }), timeoutMs, setTimer, clearTimer);
      return !error;
    } catch { return false; }
  }));
  return results.filter(Boolean).length;
}

export async function requestTakeover({ getClient, deviceId, label, kind, timeoutMs = CALL_LIMIT_MS,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  try {
    const { error } = await limited(getClient().rpc('session_takeover_request',
      { p_device_id: deviceId, p_label: label, p_kind: kind }), timeoutMs, setTimer, clearTimer);
    return !error;
  } catch { return false; }
}

export async function ackTakeover({ getClient }) {
  try {
    const { error } = await getClient().rpc('session_takeover_ack');
    return !error;
  } catch { return false; }
}

// Con tope de tiempo: si la nube no contesta se devuelve null (como si no hubiera pedido) y quien llama sigue.
// Sin tope, una sola llamada colgada dejaba a la ventanita esperando para siempre y al revisor de la sesion abierta ocupado.
async function readTakeover(getClient, { timeoutMs = CALL_LIMIT_MS, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  try {
    const { data, error } = await limited(getClient().rpc('session_takeover_get'), timeoutMs, setTimer, clearTimer);
    if (error || !Array.isArray(data) || !data[0]) return null;
    const row = data[0];
    return { byDeviceId: String(row.by_device_id), byLabel: String(row.by_label), byKind: String(row.by_kind),
      ageSeconds: Number(row.age_seconds) || 0, acked: row.acked === true };
  } catch { return null; }
}

// La sesion nueva espera a que la vieja confirme que ya subio su ultimo estado.
// Devuelve 'acked' o, pasado el limite, 'timeout' (entonces abre con lo que haya en la nube).
export async function waitForTakeoverAck({ getClient, deviceId, kind, sleep, now = Date.now,
  limitMs = WAIT_LIMIT_MS, pollMs = WAIT_POLL_MS, callLimitMs = CALL_LIMIT_MS }) {
  const startedAt = now();
  for (;;) {
    const row = await readTakeover(getClient, { timeoutMs: callLimitMs });
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
    // "Mira ya": adelanta la proxima revision (por ejemplo cuando llega el aviso de Realtime).
    // Sigue leyendo el pedido real en la nube y aplicando las mismas reglas; no es una orden.
    poke() { if (!running || busy) return; if (timer) clearTimer(timer); timer = null; poll(); },
    isRunning: () => running,
  };
}

// Aviso por la red (Realtime de Supabase): la nube manda un mensaje privado a esta cuenta cuando
// alguien pide el traspaso. El mensaje no trae datos y no se obedece: solo hace llamar a `onNudge`
// (que debe mirar el pedido real). Si Realtime falla o no esta, no pasa nada: la revision cada 5 s
// sigue sola. Nunca lanza error ni muestra nada.
export const NUDGE_TOPIC_PREFIX = 'session-handoff:';
export const NUDGE_EVENT = 'takeover';
export function createTakeoverNudge({ getClient, userId, onNudge }) {
  let client = null, channel = null, active = false;
  async function open() {
    try {
      client = getClient();
      await client.realtime.setAuth();
      if (!active) return;
      channel = client.channel(`${NUDGE_TOPIC_PREFIX}${userId}`, { config: { private: true } })
        .on('broadcast', { event: NUDGE_EVENT }, () => {
          try { onNudge(); } catch { /* el aviso nunca debe romper la app */ }
        });
      channel.subscribe(() => { /* si se cae, el cliente reintenta solo; el sondeo cubre mientras tanto */ });
    } catch { /* sin Realtime: solo la revision normal */ }
  }
  function close() {
    const ch = channel; channel = null;
    if (!ch) return;
    try { Promise.resolve(client.removeChannel(ch)).catch(() => {}); } catch { /* nada */ }
  }
  return {
    start() { if (active || !userId) return; active = true; open(); },
    stop() { active = false; close(); },
    isRunning: () => active,
  };
}
