// Autenticación — los 3 métodos de entrada.
//
// Google y correo/contraseña los resuelve Supabase Auth directo desde el
// navegador. "Usuario y contraseña" NO se puede resolver acá: haría falta
// traducir el username a su correo, y exponer esa traducción al navegador
// convertiría cualquier lista de usernames en una lista de correos. Por eso
// ese caso pasa por /api/login (ver api/login.js), que hace la traducción del
// lado del servidor y devuelve únicamente la sesión ya creada.

import { getSupabase, isConfigured } from './supabase-client.js';

export { isConfigured };

export const USERNAME_RE = /^[a-zA-Z0-9_.]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function looksLikeEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

export async function getSession() {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session || null;
}

export async function getUser() {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) return null;
  return data.user || null;
}

export function onAuthChange(handler) {
  return getSupabase().auth.onAuthStateChange((event, session) => handler(event, session));
}

// --- Google ----------------------------------------------------------------

export async function signInWithGoogle(redirectTo) {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

// --- Correo o usuario + contraseña -----------------------------------------

// Un solo campo "identifier" acepta las dos formas. El correo se podría
// resolver acá mismo, pero se manda todo por /api/login para que el mensaje de
// error sea idéntico en ambos casos: distinguir "ese usuario no existe" de
// "contraseña incorrecta" es justo lo que permite averiguar quién tiene cuenta.
export async function signInWithIdentifier(identifier, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: String(identifier || '').trim(), password }),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || !payload || !payload.access_token) {
    const code = (payload && payload.error) || 'LOGIN_FAILED';
    throw new AuthError(code);
  }

  const { data, error } = await getSupabase().auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (error) throw error;
  return data.session;
}

// --- Registro ---------------------------------------------------------------

export async function isUsernameAvailable(username) {
  const clean = String(username || '').trim();
  if (!USERNAME_RE.test(clean)) return false;
  const { data, error } = await getSupabase().rpc('username_available', {
    p_username: clean,
  });
  if (error) throw error;
  return data === true;
}

export async function signUp({ email, username, password, displayName }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanUsername = String(username || '').trim();

  if (!looksLikeEmail(cleanEmail)) throw new AuthError('EMAIL_INVALID');
  if (!USERNAME_RE.test(cleanUsername)) throw new AuthError('USERNAME_INVALID');
  if (String(password || '').length < 8) throw new AuthError('PASSWORD_TOO_SHORT');

  const available = await isUsernameAvailable(cleanUsername);
  if (!available) throw new AuthError('USERNAME_TAKEN');

  const { data, error } = await getSupabase().auth.signUp({
    email: cleanEmail,
    password,
    options: {
      // El trigger handle_new_user() lee este metadata para crear la fila de
      // profiles en el mismo instante en que nace la cuenta.
      data: {
        username: cleanUsername,
        display_name: String(displayName || '').trim() || cleanUsername,
      },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;

  return {
    session: data.session || null,
    // Con "Confirm email" activado en Supabase no hay sesión hasta que el
    // usuario abra el correo; la UI tiene que decirlo en vez de quedarse
    // girando.
    needsEmailConfirmation: !data.session,
  };
}

// --- Contraseña olvidada ----------------------------------------------------

// Siempre resuelve sin error aunque el correo no exista: confirmar que un
// correo está registrado es la misma fuga que se evita en el login.
export async function requestPasswordReset(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!looksLikeEmail(cleanEmail)) throw new AuthError('EMAIL_INVALID');
  await getSupabase().auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/?recuperar=1`,
  });
  return true;
}

export async function updatePassword(newPassword) {
  if (String(newPassword || '').length < 8) throw new AuthError('PASSWORD_TOO_SHORT');
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw error;
  return true;
}

// --- Perfil -----------------------------------------------------------------

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('user_id, username, display_name')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function updateUsername(username) {
  const clean = String(username || '').trim();
  if (!USERNAME_RE.test(clean)) throw new AuthError('USERNAME_INVALID');
  const session = await getSession();
  if (!session) throw new AuthError('NOT_AUTHENTICATED');
  const { error } = await getSupabase()
    .from('profiles')
    .update({ username: clean })
    .eq('user_id', session.user.id);
  if (error) {
    if (String(error.code) === '23505') throw new AuthError('USERNAME_TAKEN');
    throw error;
  }
  return true;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

// --- Errores en español ------------------------------------------------------

export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

const MESSAGES = {
  LOGIN_FAILED: 'Usuario o contraseña incorrectos.',
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos.',
  EMAIL_INVALID: 'Ese correo no parece válido.',
  EMAIL_TAKEN: 'Ya existe una cuenta con ese correo.',
  USERNAME_INVALID:
    'El usuario debe tener entre 3 y 24 caracteres: letras, números, guion bajo o punto.',
  USERNAME_TAKEN: 'Ese nombre de usuario ya está ocupado.',
  PASSWORD_TOO_SHORT: 'La contraseña necesita al menos 8 caracteres.',
  NOT_AUTHENTICATED: 'Tu sesión expiró. Vuelve a entrar.',
  EMAIL_NOT_CONFIRMED: 'Falta confirmar tu correo. Revisa la bandeja de entrada.',
  RATE_LIMITED: 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.',
  NETWORK: 'No se pudo conectar. Revisa tu internet y vuelve a intentar.',
  NOT_CONFIGURED:
    'La app todavía no está conectada a su base de datos (falta configurar js/config.js).',
};

export function authErrorMessage(err) {
  if (!err) return MESSAGES.LOGIN_FAILED;
  if (err instanceof AuthError && MESSAGES[err.code]) return MESSAGES[err.code];

  const raw = String(err.message || err.error_description || err).toLowerCase();

  if (raw.includes('sin configurar')) return MESSAGES.NOT_CONFIGURED;
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) return MESSAGES.NETWORK;
  if (raw.includes('invalid login credentials')) return MESSAGES.INVALID_CREDENTIALS;
  if (raw.includes('email not confirmed')) return MESSAGES.EMAIL_NOT_CONFIRMED;
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return MESSAGES.EMAIL_TAKEN;
  }
  if (raw.includes('password should be at least')) return MESSAGES.PASSWORD_TOO_SHORT;
  if (raw.includes('rate limit') || raw.includes('too many requests')) return MESSAGES.RATE_LIMITED;
  if (raw.includes('username_taken')) return MESSAGES.USERNAME_TAKEN;
  if (raw.includes('username_invalid')) return MESSAGES.USERNAME_INVALID;

  return MESSAGES.LOGIN_FAILED;
}
