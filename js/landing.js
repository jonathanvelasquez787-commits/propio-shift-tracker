import { ui, translateText, translateStoredText, translateDocument, setLanguage } from './i18n.js';
translateDocument();
window.addEventListener('propio-language-change', event => setLanguage(event.detail, { documentTranslation: true }));
// Entrada Google, sesión existente y recuperación de enlaces ya emitidos.

import {
  isConfigured,
  getSession,
  onAuthChange,
  signInWithGoogle,
  updatePassword,
  getProfile,
  signOut,
  authErrorMessage,
  AuthError,
} from './auth.js';

const $ = (id) => document.getElementById(id);

const forms = { reset: $('resetForm') };

const msgEl = $('authMsg');
const titleEl = $('authTitle');
const subEl = $('authSub');
const authForms = $('authForms');
const sessionCard = $('sessionCard');

// El enlace de Google sale de la página y vuelve: hay que recordar que el
// usuario estaba entrando para no dejarlo mirando la landing al regresar.
const PENDING_KEY = 'ps_auth_pending';
const hadAuthParams = /[?#].*(code=|access_token=|error=|error_code=)/.test(window.location.href);
const params = new URLSearchParams(window.location.search);
let recoveryMode = params.has('recuperar');
let recoveryUserId = null;

// Con la sesión abierta esta página no tiene nada que ofrecer: se entra
// directo. `?quedarse=1` la deja ver a propósito.
const stayOnLanding = params.has('quedarse');
const AUTO_ENTER_KEY = 'ps_auto_enter_at';
const AUTO_ENTER_GUARD_MS = 10000;

function bouncedBackFromApp() {
  const last = Number(sessionStorage.getItem(AUTO_ENTER_KEY) || 0);
  return Boolean(last) && Date.now() - last < AUTO_ENTER_GUARD_MS;
}

// La marca de tiempo es el freno: si la app devuelve acá enseguida (sesión que
// no pudo abrirse), la segunda vez ya no se redirige y se muestra la tarjeta,
// en vez de quedar rebotando entre las dos páginas.
function enterApp() {
  try {
    sessionStorage.setItem(AUTO_ENTER_KEY, String(Date.now()));
  } catch {
    /* sin sessionStorage se pierde el freno, no la entrada */
  }
  window.location.replace(nextUrl());
}

function nextUrl() {
  const next = params.get('next');
  if (!next) return '/app';
  try {
    const destination = new URL(next, window.location.origin);
    if (destination.origin !== window.location.origin) return '/app';
    if (destination.pathname === '/app.html') destination.pathname = '/app';
    return destination.href;
  } catch {
    return '/app';
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function showMessage(text, kind = 'error') {
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = ui`form-msg show ${kind}`;
}

function clearMessage() {
  if (!msgEl) return;
  msgEl.textContent = '';
  msgEl.className = 'form-msg';
}

function showView(name) {
  clearMessage();
  const resetting = name === 'reset';
  if (forms.reset) forms.reset.hidden = !resetting;
  if (titleEl) titleEl.textContent = resetting ? translateText('Contraseña nueva') : translateText('Entra con Google');
  if (subEl) subEl.textContent = resetting
    ? translateText('Escribe la contraseña que vas a usar de ahora en adelante.')
    : translateText('Entra o crea tu cuenta con Google. No necesitas una contraseña de esta app.');
  const googleBtn = $('googleBtn');
  if (googleBtn) googleBtn.style.display = resetting ? 'none' : '';
  if (resetting) setTimeout(() => forms.reset?.querySelector('input')?.focus(), 40);
}

function setBusy(button, busy, busyLabel) {
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle('is-busy', busy);
  const label = button.querySelector('span:not(.spinner)');
  if (!label) return;
  if (busy) {
    label.dataset.idle = label.dataset.idle || label.textContent;
    label.textContent = busyLabel || translateText('Un momento…');
  } else if (label.dataset.idle) {
    label.textContent = translateStoredText(label.dataset.idle);
  }
}

function showSessionCard(profile, user) {
  const name = (profile && (profile.display_name || profile.username)) || user.email || translateText('Tu cuenta');
  const handle = profile && profile.username ? `@${profile.username}` : user.email || '';
  $('sessionAvatar').textContent = String(name).trim().charAt(0).toUpperCase() || '?';
  $('sessionName').textContent = name;
  $('sessionHandle').textContent = handle;
  sessionCard.classList.add('show');
  authForms.style.display = 'none';
  // .auth-head queda visible: es el único lugar donde se puede explicar algo
  // con los formularios ocultos.
  if (titleEl) titleEl.textContent = translateText('Tu cuenta');
  if (subEl) {
    subEl.textContent = bouncedBackFromApp()
      ? translateText('La app no pudo abrirse con esta sesión. Prueba de nuevo, o cierra sesión y vuelve a entrar.')
      : translateText('Ya tienes la sesión abierta en este navegador.');
  }
  const topBtn = $('topEnterBtn');
  if (topBtn) {
    topBtn.textContent = translateText('Abrir la app');
    topBtn.setAttribute('href', '/app');
  }
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

async function init() {
  showView('login');

  if (!isConfigured()) {
    showMessage(
      translateText('La app todavía no está conectada a su base de datos. Si eres quien la administra: edita js/config.js con la URL y la anon key de Supabase.'),
      'info'
    );
    document.querySelectorAll('.submit-btn, .google-btn').forEach((b) => (b.disabled = true));
    return;
  }

  // Google puede volver con un error explícito en la URL.
  if (params.get('error') || params.get('error_code')) {
    showMessage(
      params.get('error_description') || translateText('No se pudo completar la entrada con Google. Intenta de nuevo.'),
      'error'
    );
  }

  onAuthChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      recoveryUserId = session?.user?.id || null;
      setBusy($('resetSubmit'), false);
      showView('reset');
      showMessage(translateText('Escribe tu contraseña nueva para terminar.'), 'info');
      return;
    }
    if (recoveryMode && recoveryUserId && session?.user?.id !== recoveryUserId) {
      recoveryMode = false;
      recoveryUserId = null;
      showView('login');
      showMessage(authErrorMessage(new AuthError('NOT_AUTHENTICATED')));
      return;
    }
    if (event === 'SIGNED_IN' && session && !recoveryMode) {
      if (sessionStorage.getItem(PENDING_KEY) || hadAuthParams) {
        sessionStorage.removeItem(PENDING_KEY);
        enterApp();
      }
    }
  });

  let session = null;
  try {
    session = await getSession();
  } catch (err) {
    showMessage(authErrorMessage(err), 'error');
    return;
  }

  if (!session) {
    sessionStorage.removeItem(PENDING_KEY);
    return;
  }

  if (recoveryMode) {
    recoveryUserId = session.user.id;
    showView('reset');
    return;
  }

  sessionStorage.removeItem(PENDING_KEY);

  if (!stayOnLanding && !bouncedBackFromApp()) {
    showMessage(translateText('Ya tienes la sesión abierta — entrando…'), 'info');
    enterApp();
    return;
  }

  let profile = null;
  try { profile = await getProfile(session.user.id); } catch {}
  let latestSession;
  try { latestSession = await getSession(); }
  catch (err) { showMessage(authErrorMessage(err), 'error'); return; }
  if (latestSession?.user?.id !== session.user.id) return;
  showSessionCard(profile, latestSession.user);
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

$('googleBtn')?.addEventListener('click', async () => {
  clearMessage();
  sessionStorage.setItem(PENDING_KEY, '1');
  try {
    await signInWithGoogle(`${window.location.origin}/${window.location.search}`);
  } catch (err) {
    sessionStorage.removeItem(PENDING_KEY);
    showMessage(authErrorMessage(err), 'error');
  }
});

forms.reset?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  const btn = $('resetSubmit');
  const userId = recoveryUserId;
  setBusy(btn, true, translateText('Guardando…'));
  try {
    if (!recoveryMode || !userId) throw new AuthError('NOT_AUTHENTICATED');
    await updatePassword($('resetPassword').value, userId);
    if (!recoveryMode || recoveryUserId !== userId) return;
    recoveryMode = false;
    recoveryUserId = null;
    showMessage(translateText('Listo, contraseña actualizada. Entrando…'), 'ok');
    setTimeout(enterApp, 900);
  } catch (err) {
    if (userId && recoveryUserId !== userId) return;
    showMessage(authErrorMessage(err), 'error');
    setBusy(btn, false);
  }
});

$('signOutBtn')?.addEventListener('click', async () => {
  await signOut();
  // Sin esto, volver de cerrar sesión con el freno todavía caliente mostraría
  // el texto de "no se pudo abrir la app" que no viene al caso.
  try {
    sessionStorage.removeItem(AUTO_ENTER_KEY);
  } catch {
    /* ignorar */
  }
  window.location.replace('/');
});

init();
