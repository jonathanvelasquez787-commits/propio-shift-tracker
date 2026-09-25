// Arranque de /app.
//
// La app es un módulo ES (app-main.js) que, al ejecutarse, lee localStorage y se dibuja entera
// de una vez. Si la hidratación desde la nube llegara después, habría que recargar la página
// para verla. Por eso este módulo lo importa (import() dinámico, que solo ejecuta la primera vez
// que se llama) recién cuando la sesión está resuelta y localStorage ya tiene los datos
// correctos: la app nunca llega a montarse con datos de nadie más ni con datos viejos.

import { getSupabase, isConfigured } from './supabase-client.js';
import { getProfile, signOut } from './auth.js';
import {
  BOOT,
  resolveBoot,
  adoptCloud,
  adoptLocal,
  resetForUser,
  startAutoSync,
  pushSnapshot,
  setAccessToken,
  onSync,
  readMeta,
  describeSnapshot,
  readLocalSnapshot,
  applyLightThemeDefault,
  syncThemeClass,
} from './sync.js';

// Antes que nada: el gate hereda los tokens de la app y por defecto son los
// del tema oscuro. Pintarlo con el tema correcto de entrada evita el parpadeo.
syncThemeClass();

const overlay = document.getElementById('bootGate');
const bootText = document.getElementById('bootGateText');
const bootBody = document.getElementById('bootGateBody');

function setBootMessage(text) {
  if (bootText) bootText.textContent = text;
}

function fail(message, { retry = true } = {}) {
  if (!bootBody) return;
  bootBody.innerHTML = `
    <div class="boot-card">
      <div class="boot-card-title">No se pudo abrir la app</div>
      <p class="boot-card-text">${escapeHtml(message)}</p>
      <div class="boot-card-actions">
        ${retry ? '<button class="mc-btn-primary cyan" id="bootRetryBtn" type="button">Reintentar</button>' : ''}
        <button class="mc-btn-warn-pill" id="bootLogoutBtn" type="button">Cerrar sesión</button>
      </div>
    </div>`;
  const retryBtn = document.getElementById('bootRetryBtn');
  if (retryBtn) retryBtn.addEventListener('click', () => window.location.reload());
  const logoutBtn = document.getElementById('bootLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut();
      } catch {
        /* igual sacamos al usuario de la app */
      }
      window.location.replace('/');
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ---------------------------------------------------------------------------
// Conflicto de versiones: lo decide el usuario, nunca se hace merge automático
// ---------------------------------------------------------------------------

function askConflict({ localSummary, cloudSummary, cloud }) {
  return new Promise((resolve) => {
    const cuando = cloud.updated_at
      ? new Intl.DateTimeFormat('es-MX', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(cloud.updated_at))
      : 'fecha desconocida';
    const desde = cloud.device_label ? ` desde ${escapeHtml(cloud.device_label)}` : '';

    bootBody.innerHTML = `
      <div class="boot-card boot-card-wide">
        <div class="boot-card-title">Dos versiones distintas de tus datos</div>
        <p class="boot-card-text">
          Este dispositivo tiene cambios sin subir, y en la nube hay una versión
          guardada${desde} el ${escapeHtml(cuando)}. No se mezclan solas: elige
          cuál se queda. La otra se pierde.
        </p>
        <div class="boot-choice-grid">
          <button class="boot-choice" id="bootUseLocal" type="button">
            <span class="boot-choice-label">Usar la de este dispositivo</span>
            <span class="boot-choice-sub">${escapeHtml(localSummary)}</span>
            <span class="boot-choice-note">Se sube y reemplaza la de la nube</span>
          </button>
          <button class="boot-choice" id="bootUseCloud" type="button">
            <span class="boot-choice-label">Usar la de la nube</span>
            <span class="boot-choice-sub">${escapeHtml(cloudSummary)}</span>
            <span class="boot-choice-note">Se baja y reemplaza la de este dispositivo</span>
          </button>
        </div>
        <p class="boot-card-hint">
          Si no estás seguro: elige la de la nube y, si te faltaba algo, todavía
          tienes el respaldo local hasta que vuelvas a guardar.
        </p>
      </div>`;

    document.getElementById('bootUseLocal').addEventListener('click', () => resolve('local'));
    document.getElementById('bootUseCloud').addEventListener('click', () => resolve('cloud'));
  });
}

// ---------------------------------------------------------------------------
// Montaje de la app
// ---------------------------------------------------------------------------

// app-main.js es un módulo ES real (import/export), no un <script> clásico inyectado a mano: el
// import() dinámico solo lo ejecuta la primera vez que se llama, así que sigue funcionando como
// gate de sesión. Se revela el body ANTES de importar (no después) por la misma razón que antes:
// la app mide anchos reales al dibujarse (fundidos de scroll, tablas) y con el body oculto
// mediría 0. app.html precarga el archivo con <link rel="modulepreload"> para que este import()
// no tenga que esperar una descarga de red — solo evalúa lo que el navegador ya bajó en paralelo.
//
// IMPORTANTE: el overlay (#bootGate) se queda puesto hasta que el import() de arriba termina bien.
// Antes se quitaba de una vez, ANTES de intentar la carga; si esa carga fallaba (por ejemplo un
// error de sintaxis en app-main.js, finance.js, reports.js o calendar.js — un import/export que
// dejó de cuadrar entre esos 4 archivos), fail() escribía el mensaje de error dentro de #bootGate,
// pero ese nodo YA HABÍA SIDO BORRADO del documento. El resultado: la app se quedaba muda —
// pantalla estática, botones muertos, reloj parado — SIN ningún error visible en pantalla ni en la
// consola del navegador, porque el catch de abajo lo atrapaba en silencio. Quitar el overlay solo
// después de un import() exitoso, y mandar el error también a console.error, hace que cualquier
// fallo futuro de este tipo sea imposible de pasar por alto.
async function mountApp() {
  document.body.classList.add('app-ready');
  try {
    await import('/js/app-main.js');
  } catch (err) {
    console.error('boot: no se pudo importar app-main.js', err);
    fail('No se pudo cargar la app. ' + (err && err.message ? err.message : String(err)));
    return false;
  }
  if (overlay) overlay.remove();
  return true;
}

// Barra de cuenta dentro del menú lateral: reutiliza las clases que ya usa el
// sidebar para no introducir lenguaje visual nuevo.
function injectAccountPanel(profile, email) {
  const footer = document.querySelector('#sidebarNav .sidebar-footer');
  if (!footer) return;
  const name = (profile && (profile.display_name || profile.username)) || email || 'Mi cuenta';
  const handle = profile && profile.username ? `@${profile.username}` : email || '';

  const wrap = document.createElement('div');
  wrap.className = 'sidebar-account';
  wrap.innerHTML = `
    <div class="sidebar-account-row">
      <span class="sidebar-account-avatar" aria-hidden="true">${escapeHtml(
        String(name).trim().charAt(0).toUpperCase() || '?'
      )}</span>
      <div class="sidebar-account-text">
        <div class="sidebar-account-name">${escapeHtml(name)}</div>
        <div class="sidebar-account-handle">${escapeHtml(handle)}</div>
      </div>
    </div>
    <div class="sidebar-sync-row" id="sidebarSyncRow">
      <span class="sidebar-sync-dot" id="sidebarSyncDot"></span>
      <span class="sidebar-sync-text" id="sidebarSyncText">Sincronizado</span>
    </div>
    <button class="sidebar-logout-btn" id="sidebarLogoutBtn" type="button">Cerrar sesión</button>`;
  footer.appendChild(wrap);

  document.getElementById('sidebarLogoutBtn').addEventListener('click', async () => {
    const meta = readMeta();
    if (meta.dirty) {
      setSyncStatus('saving', 'Guardando antes de salir…');
      await pushSnapshot();
    }
    try {
      await signOut();
    } catch {
      /* si falla el signOut igual sacamos al usuario */
    }
    window.location.replace('/');
  });
}

// La política de privacidad promete que la cuenta se puede borrar; esto lo
// hace cierto. Se inyecta dentro de Ajustes, al lado de "Backup de datos",
// reutilizando las clases de tarjeta de peligro que ya existen.
function injectDeleteAccount() {
  const card = document.querySelector('#goalsModal .modal-card');
  if (!card) return;
  const actions = card.querySelector('.modal-actions');

  const block = document.createElement('div');
  block.innerHTML = `
    <div class="divider"></div>
    <div class="danger-card tone-bad">
      <div class="danger-card-head">
        <span class="danger-card-icon" aria-hidden="true">
          <svg class="ic-svg" viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><path d="M6 7V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>
        </span>
        <span class="danger-card-title">Borrar mi cuenta</span>
      </div>
      <p class="danger-card-desc">
        Borra tu cuenta y TODO lo que tiene dentro, en este navegador y en la nube:
        llamadas, turnos, pausas, horario, metas y finanzas. Exporta tu JSON antes
        si quieres conservar algo.
      </p>
      <span class="danger-card-badge">Irreversible</span>
      <button class="mc-btn-solid-full bad" id="deleteAccountBtn" type="button">Borrar cuenta y datos</button>
    </div>`;

  if (actions) card.insertBefore(block, actions);
  else card.appendChild(block);

  document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    const ask =
      typeof window.appConfirm === 'function'
        ? window.appConfirm
        : (msg, ok) => {
            if (window.confirm(msg)) ok();
          };
    ask(
      '¿Borrar tu cuenta para siempre? Se elimina todo: llamadas, turnos, horario, metas y finanzas, en este dispositivo y en la nube. No se puede deshacer.',
      async () => {
        const { data } = await getSupabase().auth.getSession();
        const token = data.session ? data.session.access_token : null;
        if (!token) {
          window.location.replace('/');
          return;
        }
        try {
          const res = await fetch('/api/delete-account', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('DELETE_FAILED');
        } catch {
          if (typeof window.toast === 'function') {
            window.toast('No se pudo borrar la cuenta. Revisa tu conexión e intenta de nuevo.');
          }
          return;
        }
        resetForUser(null);
        try {
          await signOut();
        } catch {
          /* la cuenta ya no existe: la sesión local se descarta igual */
        }
        window.location.replace('/?cuenta=borrada');
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Proyección del ciclo dentro de Inicio → Ciclo
//
// La app no se puede editar (app.html se genera desde el congelado), así que
// el bloque se inyecta acá igual que el panel de cuenta. No calcula nada
// nuevo: usa las mismas funciones globales que ya alimentan Reportes.
// ---------------------------------------------------------------------------

const CYCLE_PROJECTION_DEPS = [
  'reportsCycleProjection',
  'cycleGoalPace',
  'effectiveCycleGoal',
  'money',
  'financeConvertedInline',
  'convertedAmountText',
  'iconHtml',
];

function hasCycleProjectionDeps() {
  return CYCLE_PROJECTION_DEPS.every((name) => typeof window[name] === 'function');
}

function renderCycleProjection() {
  const box = document.getElementById('cycleProjectionBox');
  const rows = document.getElementById('cycleProjectionRows');
  if (!box || !rows || !hasCycleProjectionDeps()) return;

  // Los números son siempre del ciclo ACTUAL, igual que en Reportes. El
  // rótulo del rango es el único lugar donde la app dice qué ciclo se está
  // mirando, así que el bloque se esconde mientras se navega otro.
  const rangeBadge = document.getElementById('cycleRangeBadge');
  const viewingCurrent = !!rangeBadge && rangeBadge.textContent.includes('(actual)');
  box.style.display = viewingCurrent ? '' : 'none';
  if (!viewingCurrent) return;

  const money = window.money;
  const inline = window.financeConvertedInline;
  const converted = window.convertedAmountText;
  const icon = window.iconHtml;

  const proj = window.reportsCycleProjection();
  const pace = window.cycleGoalPace();
  const goal = window.effectiveCycleGoal(0);

  const totalDays = proj.daysElapsed + proj.daysRemaining;
  const delta = proj.projected - goal;
  const pct = goal > 0 ? Math.max(0, Math.min(100, (proj.projected / goal) * 100)) : 0;
  const barColor = delta >= 0 ? 'var(--good)' : 'var(--warn)';

  let paceValue;
  let paceColor;
  let paceLabel;
  let paceSub;
  if (pace.met) {
    paceValue = 'Listo';
    paceColor = 'var(--good)';
    paceLabel = 'meta cubierta';
    paceSub = 'Lo que ganes de aquí en adelante es extra.';
  } else if (!pace.workDaysLeft) {
    paceValue = '—';
    paceColor = 'var(--bad)';
    paceLabel = 'sin días';
    paceSub = `Faltan ${money(pace.remainingUsd)}${inline(pace.remainingUsd)} y ya no quedan días laborales en este ciclo.`;
  } else {
    paceValue = `~${pace.perDayHours.toFixed(1)} h/día`;
    paceColor = 'var(--warn)';
    paceLabel = 'productivas';
    paceSub = `Faltan ${money(pace.remainingUsd)}${inline(pace.remainingUsd)} · ${money(pace.perDayUsd)}${inline(pace.perDayUsd)} por día laboral`;
  }

  rows.innerHTML = `
    <div class="fin-preview-row" style="--cat-rgb: var(--blue-rgb);">
      <span class="fin-preview-icon">${icon('chart')}</span>
      <div class="fin-preview-main">
        <div class="fin-preview-name">Al ritmo de hoy</div>
        <div class="fin-preview-sub">Día ${proj.daysElapsed} de ${totalDays} · ${delta >= 0 ? '+' : ''}${money(delta)}${inline(Math.abs(delta))} vs tu meta</div>
        <div class="fin-preview-bar"><div style="width:${pct}%; background:${barColor};"></div></div>
      </div>
      <div class="fin-preview-right">
        <div class="fin-preview-amt">${money(proj.projected)}</div>
        <div class="fin-preview-amt-label">${escapeHtml(converted(proj.projected) || 'proyectado')}</div>
      </div>
    </div>
    <div class="fin-preview-row" style="--cat-rgb: var(--warn-rgb);">
      <span class="fin-preview-icon">${icon('flag')}</span>
      <div class="fin-preview-main">
        <div class="fin-preview-name">Para llegar a tu meta</div>
        <div class="fin-preview-sub">${paceSub}</div>
      </div>
      <div class="fin-preview-right">
        <div class="fin-preview-amt" style="color:${paceColor};">${escapeHtml(paceValue)}</div>
        <div class="fin-preview-amt-label">${escapeHtml(paceLabel)}</div>
      </div>
    </div>`;
}

function injectCycleProjection() {
  const view = document.getElementById('earningsCycleView');
  if (!view || document.getElementById('cycleProjectionBox') || !hasCycleProjectionDeps()) return;

  const box = document.createElement('div');
  box.className = 'fin-preview';
  box.id = 'cycleProjectionBox';
  box.style.marginTop = '12px';
  box.innerHTML = `
    <div class="fin-preview-head">
      <span class="fin-preview-title">Proyección del ciclo</span>
      <button class="fin-preview-link" data-nav-page="reports" type="button">Ver Reportes →</button>
    </div>
    <div id="cycleProjectionRows"></div>`;

  // data-nav-page ya lo maneja la app con un listener delegado: el botón no
  // necesita wiring propio para llevar a Reportes.
  const anchor = view.querySelector('.gh-info-row');
  if (anchor) view.insertBefore(box, anchor);
  else view.appendChild(box);

  renderCycleProjection();

  // Repintar al entrar a la pestaña Ciclo o al cambiar de ciclo, sin esperar
  // al refresco periódico.
  document.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;
    if (el.closest('[data-earnings-mode]') || el.closest('#cyclePrevBtn, #cycleNextBtn, #cycleCurrentBtn')) {
      setTimeout(renderCycleProjection, 0);
    }
  });

  // Solo mientras se está viendo: estos cálculos recorren los 14 días del
  // ciclo, igual que Reportes, que por eso tampoco se recalcula de fondo.
  setInterval(() => {
    const cycleView = document.getElementById('earningsCycleView');
    const home = document.querySelector('.app-page[data-page="home"]');
    const accordion = document.getElementById('earningsAccordion');
    if (!cycleView || cycleView.style.display === 'none') return;
    if (!home || home.hidden) return;
    if (accordion && !accordion.open) return;
    renderCycleProjection();
  }, 5000);
}

function setSyncStatus(kind, text) {
  const dot = document.getElementById('sidebarSyncDot');
  const label = document.getElementById('sidebarSyncText');
  if (!dot || !label) return;
  dot.dataset.state = kind;
  label.textContent = text;
}

function wireSyncStatus() {
  let lastPush = null;
  onSync((type) => {
    if (type === 'dirty') setSyncStatus('saving', 'Cambios sin subir…');
    if (type === 'pushed') {
      lastPush = new Date();
      setSyncStatus('ok', 'Guardado en la nube');
    }
    if (type === 'error') setSyncStatus('error', 'Sin conexión — se guardó local');
    if (type === 'conflict') {
      setSyncStatus('error', 'Otro dispositivo guardó después');
      showCloudConflictBanner();
    }
  });

  // Reaprovecha el texto relativo cada minuto para que no quede clavado en
  // "Guardado en la nube" durante horas.
  setInterval(() => {
    if (!lastPush || readMeta().dirty) return;
    const mins = Math.floor((Date.now() - lastPush.getTime()) / 60000);
    if (mins >= 1) setSyncStatus('ok', `Guardado hace ${mins} min`);
  }, 60000);

  window.addEventListener('offline', () => setSyncStatus('error', 'Sin conexión'));
  window.addEventListener('online', () => setSyncStatus('saving', 'Reconectando…'));
}

// La app ya trae este banner para el conflicto entre pestañas; el conflicto
// entre dispositivos es el mismo problema, así que se reutiliza tal cual.
function showCloudConflictBanner() {
  const banner = document.getElementById('storageConflictBanner');
  if (!banner) return;
  const text = banner.querySelector('.storage-conflict-banner-text');
  if (text) {
    text.textContent =
      'Otro dispositivo guardó cambios más recientes en tu cuenta. Si sigues aquí, tu próximo cambio podría sobrescribirlos.';
  }
  banner.classList.add('show');
}

// ---------------------------------------------------------------------------
// Secuencia de arranque
// ---------------------------------------------------------------------------

async function boot() {
  if (!isConfigured()) {
    fail(
      'Falta conectar la app con Supabase: edita js/config.js con la URL y la anon key del proyecto.',
      { retry: false }
    );
    return;
  }

  setBootMessage('Verificando tu sesión…');

  let session = null;
  try {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw error;
    session = data.session;
  } catch (err) {
    fail('No se pudo verificar tu sesión. ' + (err && err.message ? err.message : ''));
    return;
  }

  if (!session) {
    window.location.replace('/?next=/app.html');
    return;
  }

  setAccessToken(session.access_token);
  getSupabase().auth.onAuthStateChange((_event, next) => {
    setAccessToken(next ? next.access_token : null);
    if (!next) window.location.replace('/');
  });

  const userId = session.user.id;
  setBootMessage('Buscando tus datos…');

  let decision;
  try {
    decision = await resolveBoot(userId);
  } catch (err) {
    fail(
      'No se pudieron leer tus datos guardados. ' +
        (err && err.message ? err.message : 'Revisa tu conexión.')
    );
    return;
  }

  try {
    switch (decision.action) {
      case BOOT.OTHER_ACCOUNT:
        // En este navegador quedaron datos de otra cuenta. Jamás se suben a la
        // cuenta nueva: se descartan y se baja lo que corresponda.
        resetForUser(userId);
        if (decision.cloud) adoptCloud(decision.cloud, userId);
        break;

      case BOOT.USE_CLOUD:
        setBootMessage('Descargando tus datos…');
        adoptCloud(decision.cloud, userId);
        break;

      case BOOT.USE_LOCAL:
        adoptLocal(userId);
        break;

      case BOOT.FRESH:
        adoptLocal(userId);
        break;

      case BOOT.CONFLICT: {
        const choice = await askConflict(decision);
        if (choice === 'cloud') {
          adoptCloud(decision.cloud, userId);
        } else {
          adoptLocal(userId);
        }
        break;
      }

      default:
        adoptLocal(userId);
    }
  } catch (err) {
    fail('No se pudieron preparar tus datos. ' + (err && err.message ? err.message : ''));
    return;
  }

  // Después de hidratar y antes de montar: la app lee el tema al ejecutarse,
  // así que si esto corriera después ya se habría dibujado en oscuro.
  applyLightThemeDefault();

  setBootMessage('Abriendo tu turno…');
  startAutoSync();

  if (!(await mountApp())) return;

  wireSyncStatus();
  setSyncStatus(readMeta().dirty ? 'saving' : 'ok', readMeta().dirty ? 'Subiendo…' : 'Sincronizado');

  try {
    const profile = await getProfile();
    injectAccountPanel(profile, session.user.email);
  } catch {
    injectAccountPanel(null, session.user.email);
  }
  injectDeleteAccount();
  injectCycleProjection();

  // Primera subida del dispositivo: si lo local era lo bueno, que quede en la
  // nube sin esperar a la próxima edición.
  if (decision.action === BOOT.USE_LOCAL && readMeta().dirty) {
    const snapshot = readLocalSnapshot();
    setSyncStatus('saving', `Subiendo ${describeSnapshot(snapshot)}…`);
    await pushSnapshot({ force: true });
  }
}

boot().catch((err) => {
  console.error('boot: error inesperado', err);
  fail('Error inesperado al arrancar: ' + (err && err.message ? err.message : String(err)));
});
