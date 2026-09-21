// Landing: decide qué mostrar (formularios, sesión ya abierta, o "pon una
// contraseña nueva") y ejecuta los 3 métodos de entrada.

import {
  isConfigured,
  getSession,
  onAuthChange,
  signInWithGoogle,
  signInWithIdentifier,
  signUp,
  requestPasswordReset,
  updatePassword,
  isUsernameAvailable,
  getProfile,
  signOut,
  authErrorMessage,
  USERNAME_RE,
} from './auth.js';

const $ = (id) => document.getElementById(id);

const forms = {
  login: $('loginForm'),
  signup: $('signupForm'),
  forgot: $('forgotForm'),
  reset: $('resetForm'),
};

const msgEl = $('authMsg');
const titleEl = $('authTitle');
const subEl = $('authSub');
const tabRow = document.querySelector('.tab-row');
const authForms = $('authForms');
const sessionCard = $('sessionCard');

// El enlace de Google sale de la página y vuelve: hay que recordar que el
// usuario estaba entrando para no dejarlo mirando la landing al regresar.
const PENDING_KEY = 'ps_auth_pending';
const hadAuthParams = /[?#].*(code=|access_token=|error=|error_code=)/.test(window.location.href);
const params = new URLSearchParams(window.location.search);
let recoveryMode = params.has('recuperar');

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
  // Solo rutas internas: un `next` con http(s) sería un redirect abierto.
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/app.html';
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function showMessage(text, kind = 'error') {
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = `form-msg show ${kind}`;
}

function clearMessage() {
  if (!msgEl) return;
  msgEl.textContent = '';
  msgEl.className = 'form-msg';
}

const VIEWS = {
  login: { title: 'Entrar', sub: 'Usa tu correo o tu nombre de usuario.', tabs: true },
  signup: {
    title: 'Crear cuenta',
    sub: 'Elige cómo te vas a llamar aquí dentro.',
    tabs: true,
  },
  forgot: {
    title: 'Recuperar contraseña',
    sub: 'Te mandamos un enlace al correo con el que te registraste.',
    tabs: false,
  },
  reset: {
    title: 'Contraseña nueva',
    sub: 'Escribe la contraseña que vas a usar de ahora en adelante.',
    tabs: false,
  },
};

function showView(name) {
  clearMessage();
  Object.entries(forms).forEach(([key, form]) => {
    if (form) form.hidden = key !== name;
  });
  const view = VIEWS[name] || VIEWS.login;
  if (titleEl) titleEl.textContent = view.title;
  if (subEl) subEl.textContent = view.sub;
  if (tabRow) tabRow.style.display = view.tabs ? '' : 'none';
  const googleBtn = $('googleBtn');
  const divider = document.querySelector('.divider-row');
  const showGoogle = name === 'login' || name === 'signup';
  if (googleBtn) googleBtn.style.display = showGoogle ? '' : 'none';
  if (divider) divider.style.display = showGoogle ? '' : 'none';

  $('tabLogin')?.setAttribute('aria-selected', String(name === 'login'));
  $('tabSignup')?.setAttribute('aria-selected', String(name === 'signup'));

  const firstInput = forms[name]?.querySelector('input');
  if (firstInput && name !== 'login') setTimeout(() => firstInput.focus(), 40);
}

function setBusy(button, busy, busyLabel) {
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle('is-busy', busy);
  const label = button.querySelector('span:not(.spinner)');
  if (!label) return;
  if (busy) {
    label.dataset.idle = label.dataset.idle || label.textContent;
    label.textContent = busyLabel || 'Un momento…';
  } else if (label.dataset.idle) {
    label.textContent = label.dataset.idle;
  }
}

function showSessionCard(profile, user) {
  const name = (profile && (profile.display_name || profile.username)) || user.email || 'Tu cuenta';
  const handle = profile && profile.username ? `@${profile.username}` : user.email || '';
  $('sessionAvatar').textContent = String(name).trim().charAt(0).toUpperCase() || '?';
  $('sessionName').textContent = name;
  $('sessionHandle').textContent = handle;
  sessionCard.classList.add('show');
  authForms.style.display = 'none';
  // .auth-head queda visible: es el único lugar donde se puede explicar algo
  // con los formularios ocultos.
  if (titleEl) titleEl.textContent = 'Tu cuenta';
  if (subEl) {
    subEl.textContent = bouncedBackFromApp()
      ? 'La app no pudo abrirse con esta sesión. Prueba de nuevo, o cierra sesión y vuelve a entrar.'
      : 'Ya tienes la sesión abierta en este navegador.';
  }
  const topBtn = $('topEnterBtn');
  if (topBtn) {
    topBtn.textContent = 'Abrir la app';
    topBtn.setAttribute('href', '/app.html');
  }
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

async function init() {
  showView('login');

  if (!isConfigured()) {
    showMessage(
      'La app todavía no está conectada a su base de datos. Si eres quien la administra: edita js/config.js con la URL y la anon key de Supabase.',
      'info'
    );
    document.querySelectorAll('.submit-btn, .google-btn').forEach((b) => (b.disabled = true));
    return;
  }

  // Google puede volver con un error explícito en la URL.
  if (params.get('error') || params.get('error_code')) {
    showMessage(
      params.get('error_description') || 'No se pudo completar la entrada con Google. Intenta de nuevo.',
      'error'
    );
  }

  onAuthChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      showView('reset');
      showMessage('Escribe tu contraseña nueva para terminar.', 'info');
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
    showView('reset');
    return;
  }

  sessionStorage.removeItem(PENDING_KEY);

  if (!stayOnLanding && !bouncedBackFromApp()) {
    showMessage('Ya tienes la sesión abierta — entrando…', 'info');
    enterApp();
    return;
  }

  try {
    const profile = await getProfile();
    showSessionCard(profile, session.user);
  } catch {
    showSessionCard(null, session.user);
  }
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

$('tabLogin')?.addEventListener('click', () => showView('login'));
$('tabSignup')?.addEventListener('click', () => showView('signup'));
$('forgotBtn')?.addEventListener('click', () => {
  const typed = $('loginIdentifier')?.value || '';
  if (typed.includes('@')) $('forgotEmail').value = typed.trim();
  showView('forgot');
});
$('backToLoginBtn')?.addEventListener('click', () => showView('login'));

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

forms.login?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  const identifier = $('loginIdentifier').value.trim();
  const password = $('loginPassword').value;
  if (!identifier || !password) {
    showMessage('Faltan datos para entrar.', 'error');
    return;
  }
  const btn = $('loginSubmit');
  setBusy(btn, true, 'Entrando…');
  try {
    sessionStorage.setItem(PENDING_KEY, '1');
    await signInWithIdentifier(identifier, password);
    sessionStorage.removeItem(PENDING_KEY);
    enterApp();
  } catch (err) {
    sessionStorage.removeItem(PENDING_KEY);
    showMessage(authErrorMessage(err), 'error');
    setBusy(btn, false);
  }
});

forms.signup?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  const username = $('signupUsername').value.trim();
  const email = $('signupEmail').value.trim();
  const password = $('signupPassword').value;
  const btn = $('signupSubmit');
  setBusy(btn, true, 'Creando…');
  try {
    sessionStorage.setItem(PENDING_KEY, '1');
    const result = await signUp({ email, username, password });
    if (result.needsEmailConfirmation) {
      sessionStorage.removeItem(PENDING_KEY);
      setBusy(btn, false);
      showView('login');
      showMessage(
        `Cuenta creada. Te mandamos un correo a ${email} para confirmarla — ábrelo y ya puedes entrar.`,
        'ok'
      );
      return;
    }
    sessionStorage.removeItem(PENDING_KEY);
    enterApp();
  } catch (err) {
    sessionStorage.removeItem(PENDING_KEY);
    showMessage(authErrorMessage(err), 'error');
    setBusy(btn, false);
  }
});

forms.forgot?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  const btn = $('forgotSubmit');
  setBusy(btn, true, 'Enviando…');
  try {
    await requestPasswordReset($('forgotEmail').value);
    showMessage(
      'Si ese correo tiene una cuenta, ya va en camino el enlace para cambiar la contraseña. Revisa también el spam.',
      'ok'
    );
  } catch (err) {
    showMessage(authErrorMessage(err), 'error');
  } finally {
    setBusy(btn, false);
  }
});

forms.reset?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  const btn = $('resetSubmit');
  setBusy(btn, true, 'Guardando…');
  try {
    await updatePassword($('resetPassword').value);
    recoveryMode = false;
    showMessage('Listo, contraseña actualizada. Entrando…', 'ok');
    setTimeout(enterApp, 900);
  } catch (err) {
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

// Disponibilidad del username mientras se escribe: mejor enterarse acá que
// después de llenar todo el formulario.
let usernameTimer = null;
$('signupUsername')?.addEventListener('input', (e) => {
  const hint = $('usernameHint');
  const value = e.target.value.trim();
  if (usernameTimer) clearTimeout(usernameTimer);

  if (!value) {
    hint.className = 'field-hint';
    hint.textContent = '3 a 24 caracteres: letras, números, guion bajo o punto.';
    return;
  }
  if (!USERNAME_RE.test(value)) {
    hint.className = 'field-hint bad';
    hint.textContent = 'Solo letras, números, guion bajo y punto — entre 3 y 24 caracteres.';
    return;
  }

  hint.className = 'field-hint';
  hint.textContent = 'Revisando disponibilidad…';
  usernameTimer = setTimeout(async () => {
    try {
      const free = await isUsernameAvailable(value);
      hint.className = `field-hint ${free ? 'ok' : 'bad'}`;
      hint.textContent = free ? `"${value}" está libre.` : `"${value}" ya está ocupado.`;
    } catch {
      hint.className = 'field-hint';
      hint.textContent = 'No se pudo revisar ahora; lo confirmamos al crear la cuenta.';
    }
  }, 450);
});

init();
