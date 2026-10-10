import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
// Sincronización localStorage <-> Supabase.
//
// Premisa: la app NO se toca. Sigue guardando en localStorage en cada acción,
// así que sigue funcionando sin internet. Esta capa se limita a:
//   1. hidratar localStorage desde la nube ANTES de que la app arranque, y
//   2. subir estado/ajustes y solo los cambios de llamadas cuando deja de haber
//      actividad por unos segundos.
//
// La app sigue usando snapshots locales para mantener el modo sin conexión. En
// la nube las llamadas se normalizan y se envían como altas, cambios y bajas.

import { getSupabase } from './supabase-client.js';
import { applySavedColors } from './appearance-colors.js';
import { DATA_SCHEMA_VERSION, SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { normalizeLanguage, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage } from './language-preference.js';

export const APP_KEYS = {
  state: 'propio_shift_tracker_state_es_v4',
  calls: 'propio_shift_tracker_calls_es_v4',
  settings: 'propio_shift_tracker_settings_es_v1',
};
const META_KEY = 'propio_sync_meta_v1';
const RECOVERY_KEY = 'propio_recovery_copies_v1';
const DEBOUNCE_MS = 6000;
const MAX_WAIT_MS = 45000; // aunque siga escribiendo sin parar, sube igual cada 45 s

let hydrating = false;
let pushTimer = null;
let maxWaitTimer = null;
let pushing = false;
let listeners = [];
let cloudCallHashes = new Map();
let cloudCallOwner = null;
let cloudCallRevision = null;
let authenticatedUserId;
let syncEpoch = 0;

function canSync(userId) {
  return authenticatedUserId === undefined || Boolean(cachedToken && authenticatedUserId === userId);
}

function sameSyncContext(userId, epoch, base) {
  const meta = readMeta();
  return syncEpoch === epoch && meta.userId === userId && meta.lastSyncedUpdatedAt === base && canSync(userId);
}

function hasCallBaseline(meta) {
  return cloudCallOwner === meta.userId && cloudCallRevision === meta.lastSyncedUpdatedAt;
}

export function activeAppKeys() {
  return APP_KEYS;
}

// Retira el namespace de pruebas anterior sin modificar snapshots reales.
export function retireLegacyQaStorage() {
  let cleaned = true;
  for (const key of ['propio_qa_session_v1', 'propio_qa_state_v1', 'propio_qa_calls_v1', 'propio_qa_settings_v1']) {
    try {
      if (window.localStorage.getItem(key) !== null) window.localStorage.removeItem(key);
    } catch { cleaned = false; }
  }
  return cleaned;
}

function restoreRawKey(key, value) {
  if (value === null || value === undefined) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
}

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

function writeMeta(patch, { required = false } = {}) {
  const next = { ...readMeta(), ...patch };
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch (error) {
    if (required) throw error;
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
  return `${os}${mobile ? translateText(' (móvil)') : ''}`;
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

// Private local copies are shown only to their owner after sign-in. If there
// is no room for a backup, never destroy the source to make room for it.
function recoveryCopies() {
  const value = parseKey(RECOVERY_KEY, []);
  return (Array.isArray(value) ? value : []).filter(copy => copy?.userId && copy?.snapshot);
}

export function preserveRecoveryCopy(userId, snapshot = readLocalSnapshot(), reason = 'conflict-local', meta = readMeta()) {
  if (!userId) throw new Error('RECOVERY_OWNER_REQUIRED');
  const copies = recoveryCopies();
  const duplicate = copies.find(copy => copy.userId === userId && copy.reason === reason && sameSnapshot(copy.snapshot, snapshot));
  if (duplicate) return duplicate.id;
  const copy = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, userId,
    createdAt: new Date().toISOString(), reason, snapshot, meta: { ...meta, userId } };
  try { window.localStorage.setItem(RECOVERY_KEY, JSON.stringify([...copies, copy])); }
  catch (cause) {
    const error = new Error(translateText('No hay espacio para conservar la copia anterior. Exporta tu JSON antes de reemplazar datos o cambiar de cuenta.'));
    error.cause = cause;
    throw error;
  }
  return copy.id;
}

export function listRecoveryCopies(userId) {
  if (authenticatedUserId !== undefined && authenticatedUserId !== userId) return [];
  return recoveryCopies().filter(copy => copy.userId === userId);
}

export function forgetRecoveryCopies(userId) {
  window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryCopies().filter(copy => copy.userId !== userId)));
}

export function restoreRecoveryCopy(id, userId) {
  const copy = listRecoveryCopies(userId).find(item => item.id === id);
  if (!copy || readMeta().userId !== userId) throw new Error('RECOVERY_NOT_AVAILABLE');
  preserveRecoveryCopy(userId, readLocalSnapshot(), 'before-restore');
  const before = window.localStorage.getItem(META_KEY);
  writeMeta({ dirty: true }, { required: true });
  try { writeLocalSnapshot(copy.snapshot); }
  catch (error) { restoreRawKey(META_KEY, before); throw error; }
}

// JSONB's text encoding adds a space after structural commas and colons.
// Count UTF-8 and those spaces so client admission agrees with SQL limits.
export function jsonbBytes(value) {
  const text = JSON.stringify(value);
  let quoted = false, escaped = false, spaces = 0;
  for (const char of text) {
    if (escaped) { escaped = false; continue; }
    if (quoted && char === '\\') { escaped = true; continue; }
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === ',' || char === ':')) spaces++;
  }
  return encodeURIComponent(text).replace(/%[0-9A-F]{2}|./g, 'x').length + spaces;
}

export function settingsWithinBudget(settings) { return jsonbBytes(settings) <= 1048576; }

function callBatches(upserts, deletes) {
  const batches = []; let batch = { upserts: [], deletes: [] }, bytes = 2;
  for (const call of upserts) {
    const size = jsonbBytes(call) + 2;
    if (size > 4 * 1024 * 1024) throw new Error('CALL_TOO_LARGE');
    if (bytes + size > 4 * 1024 * 1024) { batches.push(batch); batch = { upserts: [], deletes: [] }; bytes = 2; }
    batch.upserts.push(call); bytes += size;
  }
  for (const id of deletes) {
    const size = jsonbBytes(id) + 2;
    if (bytes + size > 4 * 1024 * 1024) { batches.push(batch); batch = { upserts: [], deletes: [] }; bytes = 2; }
    batch.deletes.push(id); bytes += size;
  }
  if (batch.upserts.length || batch.deletes.length || !batches.length) batches.push(batch);
  return batches;
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
  const parts = [ui`${calls} llamada${calls === 1 ? '' : 's'}`];
  if (events) parts.push(events === 1 ? ui`${events} acción registrada` : ui`${events} acciones registradas`);
  return parts.join(' · ');
}

// Postgres guarda jsonb con las claves reordenadas, así que un JSON.stringify
// directo nunca coincide con el del navegador aunque el dato sea el mismo.
function stableJson(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function sameSnapshot(a, b) {
  try {
    return (
      stableJson((a && a.state) ?? {}) === stableJson((b && b.state) ?? {}) &&
      stableJson((a && a.calls) ?? []) === stableJson((b && b.calls) ?? []) &&
      stableJson((a && a.settings) ?? {}) === stableJson((b && b.settings) ?? {})
    );
  } catch {
    return false;
  }
}

// Escribe sin marcar "sucio": lo usa la hidratación desde la nube, que por
// definición ya está sincronizada.
export function writeLocalSnapshot(snapshot) {
  const next = {
    [APP_KEYS.state]: JSON.stringify(snapshot.state ?? {}),
    [APP_KEYS.calls]: JSON.stringify(snapshot.calls ?? []),
    [APP_KEYS.settings]: JSON.stringify(snapshot.settings ?? {}),
  };
  const previous = {};
  Object.values(APP_KEYS).forEach((key) => {
    previous[key] = window.localStorage.getItem(key);
  });

  hydrating = true;
  const written = [];
  try {
    Object.entries(next).forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
      written.push(key);
    });
  } catch (err) {
    // No borres claves intactas si el navegador también rechaza su restauración.
    written.forEach((key) => {
      try {
        if (previous[key] === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, previous[key]);
      } catch {}
    });
    const error = new Error(translateText('No hay espacio local suficiente para descargar tus datos de la nube.'));
    error.cause = err;
    throw error;
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
  const settingsKey = activeAppKeys().settings;
  let settings;
  try {
    const raw = window.localStorage.getItem(settingsKey);
    settings = raw ? JSON.parse(raw) : {};
  } catch {
    return;
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) settings = {};
  if (settings.theme === 'light' || settings.theme === 'dark') return;

  settings.theme = 'light';
  hydrating = true;
  try {
    window.localStorage.setItem(settingsKey, JSON.stringify(settings));
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
  let appearance = {};
  try {
    const raw = window.localStorage.getItem(activeAppKeys().settings);
    const parsed = raw ? JSON.parse(raw) : null;
    appearance = parsed || {};
    if (parsed && typeof parsed === 'object' && parsed.theme === 'dark') theme = 'dark';
  } catch {
    /* sin settings legibles, claro */
  }
  const root = document.documentElement;
  root.classList.toggle('theme-dark', theme === 'dark');
  root.classList.toggle('theme-light', theme !== 'dark');
  applySavedColors({ ...appearance, theme }, root);
}

export function applyLoginLanguagePreference() {
  const snapshot = readLocalSnapshot();
  let session;
  try { session = window.sessionStorage; } catch {}
  const pending = readPendingLoginLanguage(session);
  if (pending && snapshot.settings.language !== pending) {
    hydrating = true;
    try {
      window.localStorage.setItem(APP_KEYS.settings, JSON.stringify({ ...snapshot.settings, language: pending }));
    } finally { hydrating = false; }
    snapshot.settings.language = pending;
    writeMeta({ dirty: true });
  }
  saveLanguagePreference(normalizeLanguage(snapshot.settings.language), { storage: window.localStorage });
  if (pending) clearPendingLoginLanguage(session);
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
    .select('state, calls, settings, updated_at, device_id, device_label, schema_version')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    cloudCallHashes = new Map();
    cloudCallOwner = userId;
    cloudCallRevision = new Date(0).toISOString();
    return null;
  }

  const callRows = [];
  const pageSize = 1000;
  for (;;) {
    const { data: page, error: callsError, count } = await getSupabase()
      .from('calls')
      .select('call_id, payload', { count: 'exact' })
      .eq('user_id', userId)
      .order('call_id')
      .range(callRows.length, callRows.length + pageSize - 1);
    if (callsError) {
      // Solo una tabla ausente en la primera página permite el snapshot antiguo.
      if (callRows.length || !['42P01', 'PGRST205'].includes(callsError.code)) throw callsError;
      cloudCallHashes = hashesForCalls(data.calls || []);
      cloudCallOwner = userId;
      cloudCallRevision = data.updated_at;
      return data;
    }
    if (!page?.length) {
      if (Number.isFinite(count) && callRows.length < count) throw new Error('Incomplete cloud call history');
      break;
    }
    callRows.push(...page);
    if (Number.isFinite(count) && callRows.length >= count) break;
  }

  const { data: latest, error: latestError } = await getSupabase()
    .from('user_data').select('updated_at').eq('user_id', userId).maybeSingle();
  if (latestError) throw latestError;
  if (!latest || latest.updated_at !== data.updated_at) throw new Error('Cloud snapshot changed while loading calls');

  const normalizedCalls = (callRows || []).map((row) => row.payload).filter(Boolean);
  cloudCallHashes = hashesForCalls(normalizedCalls);
  cloudCallOwner = userId;
  cloudCallRevision = data.updated_at;
  return { ...data, calls: normalizedCalls };
}

function hashesForCalls(callList) {
  const hashes = new Map();
  (Array.isArray(callList) ? callList : []).forEach((call) => {
    if (call && call.id !== undefined && call.id !== null) hashes.set(String(call.id), stableJson(call));
  });
  return hashes;
}

function callDelta(callList) {
  const current = new Map();
  const upserts = [];
  (Array.isArray(callList) ? callList : []).forEach((call) => {
    if (!call || call.id === undefined || call.id === null) return;
    const id = String(call.id);
    const hash = stableJson(call);
    current.set(id, hash);
    if (cloudCallHashes.get(id) !== hash) upserts.push(call);
  });
  const deletes = [...cloudCallHashes.keys()].filter((id) => !current.has(id));
  return { current, upserts, deletes };
}

export async function pushSnapshot({ force = false } = {}) {
  if (pushing) return { skipped: true };
  const meta = readMeta();
  if (!canSync(meta.userId)) return { skipped: true };
  const epoch = syncEpoch;
  pushing = true;
  try {
    // Tras reabrir sin red no quedan los hashes en memoria; recupéralos antes
    // de calcular bajas, conservando la revisión local para detectar conflictos.
    if (!hasCallBaseline(meta) && meta.lastSyncedUpdatedAt) await fetchCloud(meta.userId);
    if (!sameSyncContext(meta.userId, epoch, meta.lastSyncedUpdatedAt)) return { skipped: true };
    const snapshot = readLocalSnapshot();
    if (!settingsWithinBudget(snapshot.settings)) throw new Error('SETTINGS_TOO_LARGE');
    if (jsonbBytes(snapshot.state) > 2097152) throw new Error('STATE_TOO_LARGE');
    const delta = callDelta(snapshot.calls);
    const batches = callBatches(delta.upserts, delta.deletes);
    let expected = meta.lastSyncedUpdatedAt;
    let data, error, legacy = false;
    for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    if (!sameSyncContext(meta.userId, epoch, expected)) return { skipped: true };
    ({ data, error } = await getSupabase().rpc('push_user_data_v2', {
      p_state: snapshot.state,
      p_settings: snapshot.settings,
      p_call_upserts: batch.upserts,
      p_call_deletes: batch.deletes,
      p_expected_updated_at: force && index === 0 ? null : expected,
      p_device_id: deviceId(),
      p_device_label: deviceLabel(),
    }));
    if (!sameSyncContext(meta.userId, epoch, expected)) return { skipped: true };
    if (error && ['42883', 'PGRST202'].includes(error.code)) {
      legacy = true;
      ({ data, error } = await getSupabase().rpc('push_user_data', {
        p_state: snapshot.state,
        p_calls: snapshot.calls,
        p_settings: snapshot.settings,
        p_expected_updated_at: force ? null : meta.lastSyncedUpdatedAt,
        p_device_id: deviceId(),
        p_device_label: deviceLabel(),
      }));
    }
    if (!sameSyncContext(meta.userId, epoch, expected)) return { skipped: true };
    if (error) throw error;

    if (data && data.conflict) {
      emit('conflict', { cloudUpdatedAt: data.updated_at });
      return { conflict: true, updatedAt: data.updated_at };
    }

    if (!data?.updated_at) throw new Error('INVALID_SYNC_RESPONSE');
    expected = data.updated_at;
    writeMeta({ lastSyncedUpdatedAt: expected, dirty: true }, { required: true });
    batch.upserts.forEach(call => cloudCallHashes.set(String(call.id), stableJson(call)));
    batch.deletes.forEach(id => cloudCallHashes.delete(id));
    cloudCallOwner = meta.userId;
    cloudCallRevision = expected;
    if (legacy) break;
    }

    const pending = !sameSnapshot(snapshot, readLocalSnapshot());
    writeMeta({
      lastSyncedUpdatedAt: data ? data.updated_at : null,
      dirty: pending,
      lastPushAt: new Date().toISOString(),
    }, { required: true });
    cloudCallHashes = delta.current;
    cloudCallOwner = meta.userId;
    cloudCallRevision = data ? data.updated_at : null;
    emit('pushed', { updatedAt: data ? data.updated_at : null });
    if (pending) markDirty();
    return { ok: true, pending, updatedAt: data ? data.updated_at : null };
  } catch (err) {
    if (syncEpoch !== epoch || readMeta().userId !== meta.userId || !canSync(meta.userId)) return { skipped: true };
    emit('error', { error: err });
    return { error: err };
  } finally {
    pushing = false;
  }
}

// Último intento al cerrar la pestaña. `keepalive` permite que el navegador
// termine la petición aunque la página ya se esté yendo; sendBeacon no sirve
// acá porque no deja mandar la cabecera Authorization.
//
// Ojo: si esta subida llega, la pestaña ya no vive para anotar el updated_at
// nuevo. Esa desincronización la resuelve resolveBoot(), no acá.
function flushOnExit() {
  const meta = readMeta();
  if (!meta.dirty) return;
  if (!canSync(meta.userId) || (meta.lastSyncedUpdatedAt && !hasCallBaseline(meta))) return;
  const token = currentAccessToken();
  if (!token) return;
  const snapshot = readLocalSnapshot();
  const delta = callDelta(snapshot.calls);
  const body = JSON.stringify({
    p_state: snapshot.state, p_settings: snapshot.settings,
    p_call_upserts: delta.upserts, p_call_deletes: delta.deletes,
    p_expected_updated_at: meta.lastSyncedUpdatedAt, p_device_id: deviceId(), p_device_label: deviceLabel(),
  });
  // Browsers reject keepalive bodies over their shared 64 KiB quota. Leave
  // larger work dirty for normal batched synchronization on the next visit.
  if (jsonbBytes(body) > 60000) return;
  try {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/push_user_data_v2`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body,
    }).catch(() => {});
  } catch {
    /* la pestaña se está cerrando: no hay a quién avisarle */
  }
}

let cachedToken = null;
export function setAccessToken(token, userId) {
  cachedToken = token || null;
  if (arguments.length > 1) {
    const nextUserId = token ? userId : null;
    if (authenticatedUserId !== nextUserId) syncEpoch++;
    authenticatedUserId = nextUserId;
    if (!canSync(readMeta().userId)) {
      if (pushTimer) clearTimeout(pushTimer);
      if (maxWaitTimer) clearTimeout(maxWaitTimer);
      pushTimer = maxWaitTimer = null;
    }
  }
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
  retireLegacyQaStorage();
  if (readMeta().userId !== userId || !localHasData()) {
    const pending = listRecoveryCopies(userId).filter(copy => copy.reason === 'account-switch').at(-1);
    if (pending) {
      const current = readMeta();
      if (current.userId && current.userId !== userId && current.dirty && localHasData())
        preserveRecoveryCopy(current.userId, readLocalSnapshot(), 'account-switch', current);
      const previousMeta = window.localStorage.getItem(META_KEY);
      writeMeta({ ...pending.meta, userId, dirty: true }, { required: true });
      try { writeLocalSnapshot(pending.snapshot); }
      catch (error) { restoreRawKey(META_KEY, previousMeta); throw error; }
      syncEpoch++;
      window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryCopies().map(copy =>
        copy.userId === userId && copy.reason === 'account-switch' ? { ...copy, reason: 'recovered-account' } : copy)));
    }
  }
  const meta = readMeta();
  if (navigator.onLine === false && meta.userId === userId && localHasData()) {
    return { action: BOOT.USE_LOCAL, offline: true };
  }
  let cloud;
  try {
    cloud = await fetchCloud(userId);
  } catch (error) {
    const networkFailure = !error?.code && /^(?:TypeError: )?(?:Failed to fetch|NetworkError when attempting to fetch resource\.?|Load failed)$/i.test(error?.message || '');
    // Sin red solo se abre una copia cuyo propietario está identificado.
    // Conservamos su base: desconocer la nube no equivale a una fila vacía.
    if (networkFailure && meta.userId === userId && localHasData()) {
      return { action: BOOT.USE_LOCAL, offline: true };
    }
    throw error;
  }
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

  // Desde acá hay divergencia APARENTE. Dos casos no son un conflicto real y
  // no deben preguntarle nada al usuario:

  // 1. Los dos lados tienen exactamente el mismo dato. Pasa cada vez que la
  //    subida de cierre de pestaña llega al servidor: la marca local queda
  //    vieja aunque el contenido sea idéntico.
  if (sameSnapshot(readLocalSnapshot(), cloud)) {
    return { action: BOOT.USE_CLOUD, cloud };
  }

  // 2. La versión de la nube la subió ESTE mismo navegador. Lo local es esa
  //    misma versión más lo que se haya editado después, nunca menos.
  if (cloud.device_id && cloud.device_id === deviceId()) {
    return { action: BOOT.USE_LOCAL, cloud };
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
  const meta = readMeta();
  if (meta.dirty && meta.userId === userId && !sameSnapshot(readLocalSnapshot(), cloud)) {
    preserveRecoveryCopy(userId);
  }
  const previousMeta = window.localStorage.getItem(META_KEY);
  writeMeta({ userId, lastSyncedUpdatedAt: cloud.updated_at, dirty: false }, { required: true });
  try {
    writeLocalSnapshot({
      state: cloud.state ?? {},
      calls: cloud.calls ?? [],
      settings: cloud.settings ?? {},
    });
  } catch (error) {
    try { restoreRawKey(META_KEY, previousMeta); } catch {}
    throw error;
  }
  syncEpoch++;
  cloudCallHashes = hashesForCalls(cloud.calls ?? []);
  cloudCallOwner = userId;
  cloudCallRevision = cloud.updated_at;
}

export function adoptLocal(userId, cloud) {
  const patch = { userId, dirty: true };
  // La copia elegida reemplaza solo la revisión observada, nunca una posterior.
  // Una base imposible protege también el caso de una fila aún inexistente.
  if (arguments.length > 1) patch.lastSyncedUpdatedAt = cloud?.updated_at || new Date(0).toISOString();
  writeMeta(patch, { required: true });
}

export function resetForUser(userId) {
  const meta = readMeta();
  if (userId && meta.userId && meta.userId !== userId && meta.dirty && localHasData()) {
    preserveRecoveryCopy(meta.userId, readLocalSnapshot(), 'account-switch', meta);
  }
  syncEpoch++;
  cloudCallHashes = new Map();
  cloudCallOwner = null;
  cloudCallRevision = null;
  clearLocalAppData();
  try {
    window.localStorage.removeItem(META_KEY);
    retireLegacyQaStorage();
  } catch {
    /* ignorar */
  }
  writeMeta({ userId, lastSyncedUpdatedAt: null, dirty: false }, { required: true });
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
