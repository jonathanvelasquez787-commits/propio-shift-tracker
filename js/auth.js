import { translateText } from './i18n.js';
// Google y gestión de la cuenta; conserva el cambio de contraseña de enlaces existentes.
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

function assertAccount(session, expectedUserId) {
  const owner = typeof window === 'undefined' ? undefined : window[Symbol.for('propio.expectedAppOwner')];
  if (!session?.user?.id || (expectedUserId && session.user.id !== expectedUserId)
    || (owner !== undefined && session.user.id !== owner)) throw new AuthError('NOT_AUTHENTICATED');
  return session.user.id;
}

export async function getUser(expectedUserId) {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  if (data.user) assertAccount({user:data.user}, expectedUserId);
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

export async function updatePassword(newPassword, expectedUserId) {
  if (String(newPassword || '').length < 8) throw new AuthError('PASSWORD_TOO_SHORT');
  if (!expectedUserId) throw new AuthError('NOT_AUTHENTICATED');
  assertAccount(await getSession(), expectedUserId);
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw error;
  assertAccount(await getSession(), expectedUserId);
  return true;
}

// --- Perfil -----------------------------------------------------------------

export async function getProfile(expectedUserId) {
  const session = await getSession();
  if (!session) return null;
  const userId = assertAccount(session, expectedUserId);
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('user_id, username, display_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  assertAccount(await getSession(), userId);
  return data || null;
}

export async function updateEmail(email, expectedUserId) {
  const clean = String(email || '').trim().toLowerCase();
  if (!looksLikeEmail(clean)) throw new AuthError('EMAIL_INVALID');
  const session = await getSession();
  assertAccount(session, expectedUserId);
  const { error } = await getSupabase().auth.updateUser({ email: clean });
  if (error) throw error;
  return true;
}

export async function updateUsername(username, expectedUserId) {
  const clean = String(username || '').trim();
  if (!USERNAME_RE.test(clean)) throw new AuthError('USERNAME_INVALID');
  const session = await getSession();
  const userId = assertAccount(session, expectedUserId);
  const { data, error } = await getSupabase()
    .from('profiles')
    .update({ username: clean })
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle();
  if (error) {
    if (String(error.code) === '23505') throw new AuthError('USERNAME_TAKEN');
    throw error;
  }
  assertAccount(await getSession(), userId);
  if (!data || data.user_id !== userId) throw new AuthError('PROFILE_SAVE_FAILED');
  return true;
}

export async function signOut() {
  try {
    await getSupabase().auth.signOut();
  } finally {
    setAppEntryHint(false);
  }
}

// A non-secret routing preference, never proof of identity or permission.
// The app shell still verifies Supabase and hydrates only its account's data.
export function setAppEntryHint(enabled) {
  try {
    document.cookie = `ps_app_entry=${enabled ? '1' : ''}; Path=/; Max-Age=${enabled ? 31536000 : 0}; SameSite=Lax; Secure`;
  } catch {
    /* Entry from /app still works when cookie storage is unavailable. */
  }
}

// --- Errores en español ------------------------------------------------------

export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

const MESSAGES = () => ({
  LOGIN_FAILED: translateText('Usuario o contraseña incorrectos.'),
  INVALID_CREDENTIALS: translateText('Usuario o contraseña incorrectos.'),
  EMAIL_INVALID: translateText('Ese correo no parece válido.'),
  EMAIL_TAKEN: translateText('Ya existe una cuenta con ese correo.'),
  USERNAME_INVALID:
    translateText('El usuario debe tener entre 3 y 24 caracteres: letras, números, guion bajo o punto.'),
  USERNAME_TAKEN: translateText('Ese nombre de usuario ya está ocupado.'),
  PASSWORD_TOO_SHORT: translateText('La contraseña necesita al menos 8 caracteres.'),
  NOT_AUTHENTICATED: translateText('Tu sesión expiró. Vuelve a entrar.'),
  PROFILE_SAVE_FAILED: translateText('No se pudo guardar el perfil. Vuelve a intentar.'),
  EMAIL_NOT_CONFIRMED: translateText('Falta confirmar tu correo. Revisa la bandeja de entrada.'),
  RATE_LIMITED: translateText('Demasiados intentos seguidos. Espera un minuto y vuelve a probar.'),
  LOGIN_UNAVAILABLE: translateText('El acceso no está disponible temporalmente. Espera un minuto y vuelve a intentar.'),
  NETWORK: translateText('No se pudo conectar. Revisa tu internet y vuelve a intentar.'),
  RESET_UNAVAILABLE: translateText('No se pudo enviar el enlace ahora. Espera un momento y vuelve a intentar.'),
  NOT_CONFIGURED:
    translateText('La app todavía no está conectada a su base de datos (falta configurar js/config.js).'),
});

export function authErrorMessage(err) {
  const messages = MESSAGES();
  if (!err) return messages.LOGIN_FAILED;
  if (err instanceof AuthError && messages[err.code]) return messages[err.code];

  const raw = String(err.message || err.error_description || err).toLowerCase();

  if (raw.includes(translateText('sin configurar'))) return messages.NOT_CONFIGURED;
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) return messages.NETWORK;
  if (raw.includes('invalid login credentials')) return messages.INVALID_CREDENTIALS;
  if (raw.includes('email not confirmed')) return messages.EMAIL_NOT_CONFIRMED;
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return messages.EMAIL_TAKEN;
  }
  if (raw.includes('password should be at least')) return messages.PASSWORD_TOO_SHORT;
  if (raw.includes('rate limit') || raw.includes('too many requests')) return messages.RATE_LIMITED;
  if (raw.includes('username_taken')) return messages.USERNAME_TAKEN;
  if (raw.includes('username_invalid')) return messages.USERNAME_INVALID;

  return messages.LOGIN_FAILED;
}
