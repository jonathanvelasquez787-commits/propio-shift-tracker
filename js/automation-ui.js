import { ui, translateText, displayLocale } from './i18n.js';
import { validateAutomationStatus, automationStatusView } from './automation-status.js';

function statusMessages(key, snapshot) {
  const messages = {
    missing: [translateText('Esperando información de la extensión'), translateText('Conectá la extensión para ver su próxima acción. Los controles manuales siguen disponibles.')],
    stale: [translateText('Esperando una lectura reciente'), translateText('La extensión debe confirmar el estado de Propio antes de mostrar la próxima acción.')],
    'recording-off': [translateText('Registro automático apagado'), translateText('Activá Registrar en mi tracker en la extensión para usar sus automatismos.')],
    'manual-paused': [translateText('Pausada por vos'), translateText('El registro de llamadas continúa. Reanudá la disponibilidad desde la extensión o con Start Calls en Propio.')],
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
    spacing: [translateText('Próximo intento de disponibilidad'), ui`Al alcanzar ${snapshot?.options.minutes} minutos de ACW, esta extensión intentará pulsar Start Calls.`],
    'acw-update': [translateText('El tracker necesita actualizarse'), translateText('Recargá el tracker cuando estés libre para compartir su ACW actual con la extensión.')],
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

export function installAutomationStatusUi({ host = window, document = host.document, now = () => Date.now() } = {}) {
  const panel = document.getElementById('automationPanel');
  if (!panel) return { update() {}, stop() {} };
  let snapshot = null, closed = false;
  const element = id => document.getElementById(id);
  const setText = (id, text) => { const node = element(id); if (node && node.textContent !== text) node.textContent = text; };
  function render() {
    if (closed) return;
    panel.hidden = document.getElementById('pageHome')?.hidden === true;
    const current = automationStatusView(snapshot, now()), [title, detail] = statusMessages(current.key, snapshot);
    setText('automationTitle', title); setText('automationDetail', detail);
    const timer = element('automationCountdown');
    timer.hidden = current.seconds === null && current.key !== 'before-shift';
    const clock = current.seconds !== null ? `${Math.floor(current.seconds / 60)}:${String(current.seconds % 60).padStart(2, '0')}`
      : current.key === 'before-shift' && snapshot.startAt ? new Date(snapshot.startAt).toLocaleTimeString(displayLocale(), { hour:'2-digit', minute:'2-digit' }) : '';
    setText('automationCountdown', clock);
    const recent = snapshot && now() >= Date.parse(snapshot.reportedAt) && now() - Date.parse(snapshot.reportedAt) <= 15000;
    const observed = recent && snapshot.observedAt && now() >= Date.parse(snapshot.observedAt) && now() - Date.parse(snapshot.observedAt) <= 15000;
    setText('automationTrackerCheck', recent ? translateText('Tracker y cuenta reconocidos') : translateText('Esperando confirmar la conexión de la extensión'));
    setText('automationPortalCheck', observed && snapshot.portal === 'authenticated' ? translateText('Sesión de Propio reconocida') : translateText('Sesión de Propio pendiente de confirmar'));
    setText('automationScheduleCheck', recent && snapshot.scheduleVerified ? translateText('Horario y descansos confirmados') : translateText('Horario y descansos pendientes de confirmar'));
    setText('automationOptionsCheck', recent ? ui`Espera entre llamadas: ${snapshot.options.spacing ? ui`${snapshot.options.minutes} minutos de ACW` : translateText('apagada')}` : translateText('Esperando tus opciones actuales'));
    setText('automationFirstCheck', recent ? ui`Inicio automático del turno: ${snapshot.options.first ? translateText('activado') : translateText('apagado')}` : '');
    setText('automationReturnsCheck', recent ? ui`Regreso automático: Break ${snapshot.options.break ? translateText('activado') : translateText('apagado')} · Lunch ${snapshot.options.lunch ? translateText('activado') : translateText('apagado')}` : '');
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
