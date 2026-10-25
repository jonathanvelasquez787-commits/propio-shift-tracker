import { AUTOMATION_STATUS_MAX_AGE, validateAutomationStatus, automationStatusView } from './automation-status.js';

// The extension popup uses Spanish independently of the tracker's language.
const translateText = text => text;
const displayLocale = () => 'es-MX';
const ui = (parts, ...values) => parts.map((part, index) => part + (values[index] ?? '')).join('');

function momentLabel(value, now) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return '';
  const date = new Date(value), today = new Date(now);
  return date.toLocaleString(displayLocale(), { hour:'2-digit', minute:'2-digit',
    ...(date.toDateString() === today.toDateString() ? {} : { month:'short', day:'numeric' }) });
}

function pauseDescription(snapshot, now) {
  if (snapshot.devicePassive || snapshot.coordinationConfirmed === false) return translateText('Esta PC registra llamadas y conserva tus opciones, pero no pulsa Start Calls ni Stop Calls ni termina pausas automáticamente.');
  const type = snapshot.pauseType === 'break' ? 'Break' : snapshot.pauseType === 'lunch' ? 'Lunch' : null;
  const mode = snapshot.options.timed
    ? translateText('Cierre automático solo para pausas con regreso activado y duración configurada.')
    : translateText('Las pausas terminan cuando pulsás Terminar Break o Terminar Lunch en Inicio.');
  if (!type || snapshot.reason !== 'pause' || snapshot.pauseActual === null) return mode;
  const end = momentLabel(snapshot.pauseEndsAt, now);
  if (!snapshot.pauseActual) return end
    ? ui`${type} programado hasta ${end}. No hay una pausa activa registrada; se respeta el horario.` : mode;
  const auto = snapshot.options.timed && snapshot.options[snapshot.pauseType] && end;
  if (auto && Date.parse(snapshot.pauseEndsAt) <= now) return ui`La duración prevista de ${type} ya se cumplió. Esperando confirmar su cierre en Inicio.`;
  const timing = end ? ui`Duración prevista de ${type}: hasta ${end}. ` : ui`${type} sin duración prevista confirmada. `;
  return timing + (auto
    ? translateText('La extensión intentará cerrar la pausa y volver a disponibilidad si el turno y la conexión lo permiten.')
    : (snapshot.options[snapshot.pauseType]
      ? translateText('Terminá la pausa en Inicio; después se intentará ponerte disponible dentro del turno.')
      : translateText('Terminá la pausa en Inicio y pulsá Start Calls en Propio cuando quieras volver.')));
}

function statusMessages(key, snapshot) {
  const messages = {
    missing: [translateText('Sin conexión confirmada'), translateText('Abrí Propio y comprobá que la extensión de Chrome esté activada. Los controles manuales siguen disponibles.')],
    stale: [translateText('Esperando una lectura reciente'), translateText('La extensión debe confirmar el estado de Propio antes de mostrar la próxima acción.')],
    'recording-off': [translateText('Registro automático apagado'), translateText('Activá Registrar mi actividad en la extensión de Chrome para usar las opciones automáticas.')],
    'manual-paused': [translateText('Pausada por vos'), translateText('El registro de llamadas continúa. Reanudá la disponibilidad desde la extensión o con Start Calls en Propio.')],
    'device-passive': [translateText('Solo registro en esta PC'), translateText('Esta PC registra llamadas y conserva tus opciones, pero no pulsa Start Calls ni Stop Calls ni termina pausas automáticamente.')],
    coordination: [translateText('Esperando permiso para esta PC'), translateText('Otra PC puede estar usando la disponibilidad automática, o falta conexión con la nube. El registro continúa. Pausá los iniciadores de la PC anterior; el permiso vence en hasta 30 segundos.')],
    review: [translateText('La conexión necesita revisión'), translateText('Abrí el estado de conexión de la extensión para ver qué necesita atención. El inicio automático espera.')],
    connection: [translateText('Esperando tu sesión de Propio'), translateText('Abrí Propio con tu sesión para que la extensión pueda confirmar la disponibilidad.')],
    schedule: [translateText('Esperando confirmar tu horario'), translateText('La extensión necesita el horario y los descansos actuales antes de actuar.')],
    'shift-ended': [translateText('Fuera de tu turno'), translateText('La extensión no inicia disponibilidad después de finalizar el turno o su horario.')],
    'before-shift': [translateText('Esperando el inicio de tu turno'), translateText('Aunque Propio ya esté abierto, la disponibilidad espera tu horario.')],
    'before-shift-manual': [translateText('Antes del horario de disponibilidad'), translateText('El inicio automático del turno está apagado. Los regresos de pausas y la espera entre llamadas conservan sus opciones.')],
    'in-call': [translateText('Estás en llamada'), translateText('La extensión registra la actividad y no toca los controles de una llamada conectada.')],
    incoming: [translateText('Tenés una llamada entrante'), translateText('Vos elegís si aceptarla. La extensión espera tu decisión.')],
    'portal-state': [translateText('Esperando confirmar el estado de Propio'), translateText('La extensión espera un estado claro antes de tocar Start Calls o Stop Calls.')],
    'multiple-portals': [translateText('Hay varias pestañas de Propio'), translateText('Dejá una sola pestaña del portal para evitar actuar sobre la sesión equivocada.')],
    pause: [snapshot?.pauseType === 'lunch' ? translateText('En Lunch') : snapshot?.pauseType === 'break' ? translateText('En Break') : translateText('Esperando que termine tu pausa'),
      translateText('La disponibilidad respeta tu descanso y la opción de regreso que elegiste.')],
    spacing: [translateText('Próximo intento'), ui`Al alcanzar ${snapshot?.options.minutes} minutos de ACW, la extensión de Chrome intentará pulsar Start Calls.`],
    'acw-update': [translateText('La aplicación necesita actualizarse'), translateText('Recargá Propio Shift Tracker cuando estés libre para compartir su ACW actual con la extensión de Chrome.')],
    'acw-pending': [translateText('Esperando confirmar tu ACW'), translateText('La extensión necesita una lectura reciente del contador antes de volver a ponerte disponible.')],
    'pause-return-off': [translateText('Regreso de esta pausa en manual'), translateText('Pulsá Start Calls en Propio cuando quieras volver. La espera entre llamadas no sustituye esta elección.')],
    'first-done': [translateText('Inicio del turno ya utilizado'), translateText('El inicio del turno ya se utilizó. Los regresos de pausas y la espera conservan sus opciones independientes.')],
    off: [translateText('Sin inicio automático pendiente'), translateText('Vos pulsás Start Calls cuando quieras estar disponible. Podés revisar tus opciones en la extensión.')],
    available: [translateText('Ya estás disponible en Propio'), translateText('La próxima llamada queda a tu elección. La extensión no acepta llamadas por vos.')],
    'offline-control': [translateText('Esperando el control Start Calls'), translateText('Propio debe confirmar Offline o Not Available y habilitar el botón antes del próximo intento.')],
    retry: [translateText('Esperando para reintentar'), translateText('La extensión deja un intervalo entre intentos de disponibilidad.')],
    starting: [translateText('Intentando ponerte disponible'), translateText('La extensión ha solicitado Start Calls. Esperamos la confirmación de Propio.')],
    confirming: [translateText('Confirmando la próxima acción'), translateText('Ya se alcanzó la hora prevista. La extensión vuelve a comprobar las condiciones antes de actuar.')],
  };
  return messages[key] || messages['portal-state'];
}

export function installAutomationStatusUi({ host = window, document = host.document, now = () => Date.now(), getWorkSession = () => null } = {}) {
  const panel = document.getElementById('automationPanel');
  if (!panel) return { update() {}, stop() {} };
  let snapshot = null, closed = false;
  const element = id => document.getElementById(id);
  const setText = (id, text) => { const node = element(id); if (node && node.textContent !== text) node.textContent = text; };
  function render() {
    if (closed) return;
    const brief = element('automationStatusBtn');
    if (brief) brief.hidden = document.getElementById('pageHome')?.hidden === true;
    const current = automationStatusView(snapshot, now()), [title, detail] = statusMessages(current.key, snapshot);
    setText('automationTitle', title); setText('automationDetail', current.key === 'pause' ? pauseDescription(snapshot, now()) : detail);
    const timer = element('automationCountdown');
    if(timer.dataset)timer.dataset.kind=current.key;
    timer.hidden = current.seconds === null && current.key !== 'before-shift';
    const clock = current.seconds !== null ? `${Math.floor(current.seconds / 60)}:${String(current.seconds % 60).padStart(2, '0')}`
      : current.key === 'before-shift' && snapshot.startAt ? new Date(snapshot.startAt).toLocaleTimeString(displayLocale(), { hour:'2-digit', minute:'2-digit' }) : '';
    setText('automationCountdown', clock);
    const briefTimer = element('automationCompactCountdown');
    if (briefTimer) { briefTimer.hidden = timer.hidden; setText('automationCompactCountdown', clock); }
    setText('automationCompactTitle', current.key === 'spacing' ? translateText('en') : current.key === 'missing' ? translateText('Sin confirmar') : title);
    const acwProgress=element('automationAcwProgress'),acwBar=element('automationAcwProgressBar');
    if(acwProgress){acwProgress.hidden=current.key!=='spacing';if(current.key==='spacing'){const total=snapshot.options.minutes*60,elapsed=Math.max(0,Math.min(total,total-current.seconds));if(acwBar)acwBar.value=elapsed/total*100;setText('automationAcwProgressLabel',ui`ACW actual: ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')} de ${snapshot.options.minutes} min`);}}
    const recent = snapshot && now() >= Date.parse(snapshot.reportedAt) && now() - Date.parse(snapshot.reportedAt) <= AUTOMATION_STATUS_MAX_AGE;
    const observed = recent && snapshot.observedAt && now() >= Date.parse(snapshot.observedAt) && now() - Date.parse(snapshot.observedAt) <= AUTOMATION_STATUS_MAX_AGE;
    setText('automationTrackerCheck', recent ? translateText('Aplicación y cuenta reconocidas') : translateText('Esperando confirmar la conexión de la extensión'));
    setText('automationPortalCheck', observed && snapshot.portal === 'authenticated' ? translateText('Sesión de Propio reconocida') : translateText('Sesión de Propio pendiente de confirmar'));
    setText('automationScheduleCheck', recent && snapshot.scheduleVerified ? translateText('Horario y descansos confirmados') : translateText('Horario y descansos pendientes de confirmar'));
    setText('automationOptionsCheck', recent ? ui`Espera entre llamadas: ${snapshot.options.spacing ? ui`${snapshot.options.minutes} minutos de ACW` : translateText('apagada')}` : translateText('Esperando tus opciones actuales'));
    setText('automationHoursCheck',recent&&snapshot.scheduleVerified&&snapshot.startAt&&snapshot.endAt?`${momentLabel(snapshot.startAt,now())} – ${momentLabel(snapshot.endAt,now())}`:'');
    setText('automationFirstCheck', recent ? ui`Inicio automático del turno: ${snapshot.options.first ? translateText('activado') : translateText('apagado')}` : '');
    setText('automationReturnsCheck', recent ? ui`Regreso automático: Break ${snapshot.options.break ? translateText('activado') : translateText('apagado')} · Lunch ${snapshot.options.lunch ? translateText('activado') : translateText('apagado')}` : '');
    setText('automationPauseCheck', recent ? pauseDescription(snapshot, now()) : '');
    setText('automationConnectionCheck', observed && snapshot.portal === 'authenticated' && snapshot.connectionAt
      ? ui`Conexión a Propio detectada: ${momentLabel(snapshot.connectionAt, now())}` : '');
    let work;
    try { work = getWorkSession(); } catch { work = null; }
    const at = momentLabel(work?.startedAt, now()), end = momentLabel(work?.endedAt, now());
    const workText = !at ? '' : end && Date.parse(work.endedAt) < Date.parse(work.startedAt)
      ? translateText('Esta sesión se cerró antes del comienzo laboral; no sumó tiempo de trabajo.')
      : Date.parse(work.startedAt) > now() ? ui`Inicio laboral previsto: ${at}. La conexión anterior no suma ACW ni tiempo de trabajo.`
      : work.manual ? ui`Inicio laboral manual: ${at}.`
      : work.callAtStart && recent && snapshot.startAt && Date.parse(work.startedAt) < Date.parse(snapshot.startAt)
        ? ui`Inicio laboral: ${at}; se registró una llamada antes del horario.` : ui`Inicio laboral: ${at}.`;
    setText('automationWorkCheck', workText + (end && Date.parse(work.endedAt) >= Date.parse(work.startedAt) ? ui` Cierre de sesión: ${end}.` : ''));
  }
  const timer = host.setInterval(render, 1000);
  const observer = new host.MutationObserver(render);
  const home = element('pageHome');
  if (home) observer.observe(home, { attributes:true, attributeFilter:['hidden'] });
  function stop() { closed = true; snapshot = null; host.clearInterval(timer); observer.disconnect(); host.removeEventListener('pagehide', stop); }
  host.addEventListener('pagehide', stop, { once:true });
  render();
  return { update(raw) {
    if (closed) return;
    const next = validateAutomationStatus(raw, now());
    if (raw === null) snapshot = null;
    else if (next && (!snapshot || Date.parse(next.reportedAt) >= Date.parse(snapshot.reportedAt))) snapshot = next;
    render();
  }, stop };
}
