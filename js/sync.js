// Sincronización localStorage <-> Supabase.
//
// Premisa: la app NO se toca. Sigue guardando en localStorage en cada acción,
// así que sigue funcionando sin internet. Esta capa se limita a:
//   1. hidratar localStorage desde la nube ANTES de que la app arranque, y
//   2. subir un snapshot completo cuando deja de haber cambios por unos segundos.
//
// Por qué snapshot completo y no diffs: las 3 claves de localStorage son el
// modelo entero de la app y pesan pocos MB al año. Un diff obligaría a
// reescribir cómo guarda la app — justo lo que esta fase evita.

import { getSupabase } from './supabase-client.js';
import { DATA_SCHEMA_VERSION, SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const APP_KEYS = {
  state: 'propio_shift_tracker_state_es_v4',
  calls: 'propio_shift_tracker_calls_es_v4',
  settings: 'propio_shift_tracker_settings_es_v1',
};

const META_KEY = 'propio_sync_meta_v1';
const DEBOUNCE_MS = 6000;
const MAX_WAIT_MS = 45000; // aunque siga escribiendo sin parar, sube igual cada 45 s

let hydrating = false;
let pushTimer = null;
let maxWaitTimer = null;
let pushing = false;
let listeners = [];

// ---------------------------------------------------------------------------
// Metadata local de sincronización
// ---------------------------------------------------------------------------

export function readMeta() {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return emptyMeta();
    return { ...emptyMeta(), ...parsed };
  } catch {
    return emptyMeta();
  }
}

function emptyMeta() {
  return {
    userId: null,
    // updated_at que devolvió la nube la última vez que este dispositivo
    // sincronizó. Es la base contra la que se detecta "alguien más escribió".
    lastSyncedUpdatedAt: null,
    // Hay cambios locales sin subir.
    dirty: false,
    deviceId: null,
    lastPushAt: null,
  };
}

function writeMeta(patch) {
  const next = { ...readMeta(), ...patch };
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch {
    /* cuota llena: la app ya avisa por su cuenta */
  }
  return next;
}

export function deviceId() {
  const meta = readMeta();
  if (meta.deviceId) return meta.deviceId;
  const id = `dev_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  writeMeta({ deviceId: id });
  return id;
}

export function deviceLabel() {
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  let os = 'Dispositivo';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iPhone/iPad';
  else if (/Mac OS X/i.test(ua)) os = 'Mac';
  else if (/Linux/i.test(ua)) os = 'Linux';
  return `${os}${mobile ? ' (móvil)' : ''}`;
}

// ---------------------------------------------------------------------------
// Snapshot local
// ---------------------------------------------------------------------------

function parseKey(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function readLocalSnapshot() {
  return {
    state: parseKey(APP_KEYS.state, {}),
    calls: parseKey(APP_KEYS.calls, []),
    settings: parseKey(APP_KEYS.settings, {}),
  };
}

export function localHasData() {
  const snap = readLocalSnapshot();
  const hasCalls = Array.isArray(snap.calls) && snap.calls.length > 0;
  const hasState = snap.state && Object.keys(snap.state).length > 0;
  const hasSettings = snap.settings && Object.keys(snap.settings).length > 0;
  return Boolean(hasCalls || hasState || hasSettings);
}

export function describeSnapshot(snap) {
  const calls = Array.isArray(snap && snap.calls) ? snap.calls.length : 0;
  const events = Array.isArray(snap && snap.state && snap.state.events)
    ? snap.state.events.length
    : 0;
  const parts = [`${calls} llamada${calls === 1 ? '' : 's'}`];
  if (events) parts.push(`${events} acción${events === 1 ? '' : 'es'} registrada${events === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

// Escribe sin marcar "sucio": lo usa la hidratación desde la nube, que por
// definición ya está sincronizada.
export function writeLocalSnapshot(snapshot) {
  hydrating = true;
  try {
    window.localStorage.setItem(APP_KEYS.state, JSON.stringify(snapshot.state ?? {}));
    window.localStorage.setItem(APP_KEYS.calls, JSON.stringify(snapshot.calls ?? []));
    window.localStorage.setItem(APP_KEYS.settings, JSON.stringify(snapshot.settings ?? {}));
  } finally {
    hydrating = false;
  }
}

// El tema por defecto de la app es 'auto' (sigue al sistema operativo), así que
// en una computadora configurada en oscuro la app abre oscura aunque el usuario
// nunca haya elegido eso. El producto abre en claro.
//
// Es seguro pisar 'auto' sin preguntar: el único control de tema que existe en
// la interfaz es el switch del sidebar, y ese solo produce 'light' o 'dark'.
// O sea, 'auto' nunca es una elección del usuario — solo es el valor de fábrica.
// Una vez que toque el switch, esta función ya no vuelve a intervenir.
export function applyLightThemeDefault() {
  let settings;
  try {
    const raw = window.localStorage.getItem(APP_KEYS.settings);
    settings = raw ? JSON.parse(raw) : {};
  } catch {
    return;
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) settings = {};
  if (settings.theme === 'light' || settings.theme === 'dark') return;

  settings.theme = 'light';
  hydrating = true;
  try {
    window.localStorage.setItem(APP_KEYS.settings, JSON.stringify(settings));
  } catch {
    /* si no se puede escribir, la app abre en 'auto' — molesto, no roto */
  } finally {
    hydrating = false;
  }
  syncThemeClass();
}

// El gate de arranque se dibuja ANTES de que la app corra su applyTheme(), así
// que sin esto se vería navy por medio segundo y después saltaría a claro. Lee
// el mismo settings.theme y pone la clase que la app usaría.
export function syncThemeClass() {
  let theme = 'light';
  try {
    const raw = window.localStorage.getItem(APP_KEYS.settings);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && parsed.theme === 'dark') theme = 'dark';
  } catch {
    /* sin settings legibles, claro */
  }
  const root = document.documentElement;
  root.classList.toggle('theme-dark', theme === 'dark');
  root.classList.toggle('theme-light', theme !== 'dark');
}

export function clearLocalAppData() {
  hydrating = true;
  try {
    Object.values(APP_KEYS).forEach((k) => window.localStorage.removeItem(k));
  } finally {
    hydrating = false;
  }
}

// ---------------------------------------------------------------------------
// Nube
// ---------------------------------------------------------------------------

export async function fetchCloud(userId) {
  const { data, error } = await getSupabase()
    .from('user_data')
    .select('state, calls, settings, updated_at, device_label, schema_version')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function pushSnapshot({ force = false } = {}) {
  if (pushing) return { skipped: true };
  const meta = readMeta();
  const snapshot = readLocalSnapshot();
  pushing = true;
  try {
    const { data, error } = await getSupabase().rpc('push_user_data', {
      p_state: snapshot.state,
      p_calls: snapshot.calls,
      p_settings: snapshot.settings,
      p_expected_updated_at: force ? null : meta.lastSyncedUpdatedAt,
      p_device_id: deviceId(),
      p_device_label: deviceLabel(),
    });
    if (error) throw error;

    if (data && data.conflict) {
      emit('conflict', { cloudUpdatedAt: data.updated_at });
      return { conflict: true, updatedAt: data.updated_at };
    }

    writeMeta({
      lastSyncedUpdatedAt: data ? data.updated_at : null,
      dirty: false,
      lastPushAt: new Date().toISOString(),
    });
    emit('pushed', { updatedAt: data ? data.updated_at : null });
    return { ok: true, updatedAt: data ? data.updated_at : null };
  } catch (err) {
    emit('error', { error: err });
    return { error: err };
  } finally {
    pushing = false;
  }
}

// Último intento al cerrar la pestaña. `keepalive` permite que el navegador
// termine la petición aunque la página ya se esté yendo; sendBeacon no sirve
// acá porque no deja mandar la cabecera Authorization.
function flushOnExit() {
  const meta = readMeta();
  if (!meta.dirty) return;
  const token = currentAccessToken();
  if (!token) return;
  const snapshot = readLocalSnapshot();
  try {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/push_user_data`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        p_state: snapshot.state,
        p_calls: snapshot.calls,
        p_settings: snapshot.settings,
        p_expected_updated_at: meta.lastSyncedUpdatedAt,
        p_device_id: deviceId(),
        p_device_label: deviceLabel(),
      }),
    }).catch(() => {});
  } catch {
    /* la pestaña se está cerrando: no hay a quién avisarle */
  }
}

let cachedToken = null;
export function setAccessToken(token) {
  cachedToken = token || null;
}
function currentAccessToken() {
  return cachedToken;
}

// ---------------------------------------------------------------------------
// Detección de cambios locales
// ---------------------------------------------------------------------------

const WATCHED = new Set(Object.values(APP_KEYS));
let patched = false;

function patchLocalStorage() {
  if (patched) return;
  patched = true;
  const original = Storage.prototype.setItem;
  // Interceptar setItem evita tener que tocar una sola línea de las ~400
  // llamadas a saveAll/saveStateOnly/saveSettingsOnly que ya existen.
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    original.call(this, key, value);
    if (hydrating) return;
    if (this !== window.localStorage) return;
    if (!WATCHED.has(key)) return;
    markDirty();
  };
}

function markDirty() {
  writeMeta({ dirty: true });
  emit('dirty', {});
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    if (maxWaitTimer) {
      clearTimeout(maxWaitTimer);
      maxWaitTimer = null;
    }
    pushSnapshot();
  }, DEBOUNCE_MS);

  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(() => {
      maxWaitTimer = null;
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      pushSnapshot();
    }, MAX_WAIT_MS);
  }
}

export function startAutoSync() {
  patchLocalStorage();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && readMeta().dirty) {
      pushSnapshot();
    }
  });
  window.addEventListener('pagehide', flushOnExit);

  // Al volver de estar sin internet, subir lo que haya quedado pendiente.
  window.addEventListener('online', () => {
    if (readMeta().dirty) pushSnapshot();
  });
}

// ---------------------------------------------------------------------------
// Decisión de arranque
//
// Devuelve QUÉ hacer, no lo hace: quien llama (boot.js) decide si necesita
// preguntarle algo al usuario antes de montar la app.
// ---------------------------------------------------------------------------

export const BOOT = {
  FRESH: 'fresh', // ni local ni nube: arranca vacío
  USE_LOCAL: 'use-local', // solo hay local: se sube tal cual
  USE_CLOUD: 'use-cloud', // solo hay nube, o local está limpio: se baja
  OTHER_ACCOUNT: 'other-account', // el local es de otra cuenta: se descarta sin preguntar
  CONFLICT: 'conflict', // hay dos versiones divergentes: decide el usuario
};

export async function resolveBoot(userId) {
  const meta = readMeta();
  const cloud = await fetchCloud(userId);
  const local = localHasData();
  const belongsToSomeoneElse = Boolean(meta.userId && meta.userId !== userId);

  if (belongsToSomeoneElse) {
    return { action: BOOT.OTHER_ACCOUNT, cloud };
  }

  if (!cloud || isEmptyCloud(cloud)) {
    return local ? { action: BOOT.USE_LOCAL, cloud } : { action: BOOT.FRESH, cloud };
  }

  if (!local) {
    return { action: BOOT.USE_CLOUD, cloud };
  }

  const sameBase = meta.lastSyncedUpdatedAt && meta.lastSyncedUpdatedAt === cloud.updated_at;

  if (sameBase) {
    // La nube no cambió desde la última vez que este dispositivo la vio:
    // lo local es la versión más nueva aunque tenga cambios sin subir.
    return { action: BOOT.USE_LOCAL, cloud };
  }

  if (!meta.dirty) {
    // La nube cambió en otro lado y acá no hay nada sin subir: bajar es
    // seguro, no se pierde nada.
    return { action: BOOT.USE_CLOUD, cloud };
  }

  return {
    action: BOOT.CONFLICT,
    cloud,
    localSummary: describeSnapshot(readLocalSnapshot()),
    cloudSummary: describeSnapshot(cloud),
  };
}

function isEmptyCloud(cloud) {
  const calls = Array.isArray(cloud.calls) ? cloud.calls.length : 0;
  const stateKeys = cloud.state && typeof cloud.state === 'object' ? Object.keys(cloud.state).length : 0;
  const settingsKeys =
    cloud.settings && typeof cloud.settings === 'object' ? Object.keys(cloud.settings).length : 0;
  return calls === 0 && stateKeys === 0 && settingsKeys === 0;
}

export function adoptCloud(cloud, userId) {
  writeLocalSnapshot({
    state: cloud.state ?? {},
    calls: cloud.calls ?? [],
    settings: cloud.settings ?? {},
  });
  writeMeta({ userId, lastSyncedUpdatedAt: cloud.updated_at, dirty: false });
}

export function adoptLocal(userId) {
  writeMeta({ userId, dirty: true });
}

export function resetForUser(userId) {
  clearLocalAppData();
  try {
    window.localStorage.removeItem(META_KEY);
  } catch {
    /* ignorar */
  }
  writeMeta({ userId, lastSyncedUpdatedAt: null, dirty: false });
}

export { DATA_SCHEMA_VERSION };

// ---------------------------------------------------------------------------
// Eventos (para que boot.js pinte el estado sin acoplarse a esta lógica)
// ---------------------------------------------------------------------------

export function onSync(handler) {
  listeners.push(handler);
  return () => {
    listeners = listeners.filter((h) => h !== handler);
  };
}

function emit(type, payload) {
  listeners.forEach((h) => {
    try {
      h(type, payload);
    } catch {
      /* un listener roto no debe frenar la sincronización */
    }
  });
}
