// Nota de sesion (parte 1 de "una sola sesion a la vez").
// Cada pagina abierta de la app (la web o la herramienta de la extension) deja en la nube un
// "estoy abierta" y lo renueva cada pocos segundos, y asi sabe si hay OTRA sesion abierta.
// Esta parte solo escribe y lee la nota: no muestra nada, no pausa nada, no sube ni baja datos.
// Reglas que no se rompen:
//  - Ningun error de la nota llega a la persona ni cambia nada de la app (todo se traga).
//  - NUNCA cierra sesion de la cuenta (cerrar sesion global podria tumbar al worker).
//  - No guarda nada en el navegador: no cuenta como cambio y no dispara subidas.
//  - El worker de la extension NO usa este modulo (el modo todo cerrado no tiene app abierta).
export const HEARTBEAT_MS = 10000;
export const RETRY_MS = 60000;

export function createSessionNote({ getClient, kind, getDeviceId, getLabel, randomId, setTimer, clearTimer, now }) {
  let instance = null;
  let timer = null;
  let running = false;
  let inFlight = false;
  let others = [];
  let lastOkAt = null;

  function schedule(ms) {
    if (!running) return;
    if (timer) clearTimer(timer);
    timer = setTimer(beat, ms);
  }

  async function beat() {
    timer = null;
    if (!running || inFlight) return;
    inFlight = true;
    let ok = false;
    try {
      const { data, error } = await getClient().rpc('session_heartbeat', {
        p_instance: instance,
        p_device_id: getDeviceId(),
        p_label: getLabel(),
        p_kind: kind,
      });
      if (!running) return;
      if (!error && Array.isArray(data)) {
        ok = true;
        lastOkAt = now();
        others = data.filter(row => row && row.is_self !== true).map(row => ({
          instance: String(row.instance), deviceId: String(row.device_id), label: String(row.label),
          kind: String(row.kind), ageSeconds: Number(row.age_seconds) || 0,
        }));
      }
    } catch { /* la nota nunca rompe la app */ }
    finally {
      inFlight = false;
    }
    schedule(ok ? HEARTBEAT_MS : RETRY_MS);
  }

  function start() {
    if (running) return instance;
    running = true;
    instance = randomId();
    beat();
    return instance;
  }

  // Al cerrar: borra MI nota (mejor esfuerzo). Si no llega, la nota vence sola.
  function stop() {
    if (!running) return Promise.resolve();
    running = false;
    if (timer) clearTimer(timer);
    timer = null;
    const leaving = instance;
    others = [];
    // Devuelve la promesa para que quien se va a pausar pueda esperar a que la nota se borre.
    try {
      return Promise.resolve(getClient().rpc('session_leave', { p_instance: leaving })).then(() => {}, () => {});
    } catch { return Promise.resolve(); }
  }

  return {
    start,
    stop,
    getInstance: () => instance,
    getOthers: () => others.map(row => ({ ...row })),
    getLastOkAt: () => lastOkAt,
    isRunning: () => running,
  };
}

let singleton = null;

export function startSessionNote({ getClient, getDeviceId, getLabel }) {
  if (singleton && singleton.isRunning()) return singleton;
  const kind = typeof location !== 'undefined' && location.protocol === 'chrome-extension:' ? 'extension' : 'web';
  singleton = createSessionNote({
    getClient, kind, getDeviceId, getLabel,
    randomId: () => crypto.randomUUID(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (id) => clearTimeout(id),
    now: () => Date.now(),
  });
  singleton.start();
  window.addEventListener('pagehide', () => singleton && singleton.stop());
  return singleton;
}

export function getSessionNote() {
  return singleton;
}
