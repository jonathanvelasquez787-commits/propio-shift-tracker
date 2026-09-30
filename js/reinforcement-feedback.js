import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
import { settings } from './app-context.js';

export const LONG_CALL_MINUTES = 30;

export const REINFORCEMENT_TEXTS = Object.freeze({
  'call-normal': Object.freeze([
    translateText('Llamada completada · sumaste {amount} a tu día'),
    translateText('Tomaste otra llamada · {amount} ganados'),
    translateText('Una llamada más completada · {amount} para tu meta'),
  ]),
  'call-long': Object.freeze([
    translateText('Sostuviste una llamada de {minutes} min'),
    translateText('Completaste {minutes} min de atención continua'),
    translateText('Llamada larga completada · {minutes} min de trabajo'),
  ]),
  'call-higher': Object.freeze([
    translateText('Aprovechaste Higher Rate · bono de {bonus}'),
    translateText('Esta llamada sumó un bono Higher Rate de {bonus}'),
    translateText('Higher Rate aprovechado · {bonus} extra en esta llamada'),
  ]),
  'call-best': Object.freeze([
    translateText('Tu mejor llamada por pago de hoy · {amount}'),
    translateText('Nuevo mejor pago por llamada de hoy · {amount}'),
    translateText('Esta es tu llamada de mayor pago de hoy · {amount}'),
  ]),
  milestone: Object.freeze([
    translateText('Llegaste al {percent}% de tu meta diaria · {amount} ganados'),
    translateText('Tu trabajo ya cubre el {percent}% de tu meta · {amount}'),
    translateText('Hito del {percent}% alcanzado · sumaste {amount} hoy'),
  ]),
  pause: Object.freeze([
    translateText('Volviste a tiempo de {pause} · cuidaste tu descanso y tu ritmo{xp}'),
    translateText('{pause} terminado a tiempo · tu pausa también cuenta{xp}'),
    translateText('Regreso puntual de {pause} · listo para continuar{xp}'),
  ]),
  dropped: Object.freeze([
    translateText('La llamada se cortó · una llamada no define tu día'),
    translateText('El corte quedó registrado · puedes retomar con la siguiente llamada'),
    translateText('Una llamada cortada no borra el trabajo que ya hiciste'),
  ]),
  idle: Object.freeze([
    translateText('Ha pasado una hora de trabajo sin llamadas · puedes retomar a tu ritmo'),
    translateText('Una hora sin llamadas no define tu capacidad · sigue a tu ritmo'),
    translateText('Este tramo estuvo tranquilo · la siguiente llamada será un nuevo paso'),
  ]),
  recovery: Object.freeze([
    translateText('Volviste a tomar otra llamada · recuperación lograda'),
    translateText('Retomaste después de una llamada difícil · ese paso cuenta'),
    translateText('Una nueva llamada completada · seguiste adelante'),
  ]),
  'reflection-good': Object.freeze([
    translateText('Cierre positivo guardado · esta llamada cuenta'),
    translateText('Reconociste algo que salió bien en tu llamada'),
    translateText('Guardaste evidencia de una llamada que cerró bien'),
  ]),
  'reflection-difficult': Object.freeze([
    translateText('La tomaste aunque fue difícil · puedes volver a tu ritmo'),
    translateText('Enfrentaste una llamada difícil · tu esfuerzo cuenta'),
    translateText('Una llamada difícil no borra las que ya completaste'),
  ]),
  'reflection-learning': Object.freeze([
    translateText('Aprendizaje guardado · una llamada no define tu capacidad'),
    translateText('Encontraste un aprendizaje en esta llamada'),
    translateText('Lo que aprendiste hoy puede ayudarte en la siguiente llamada'),
  ]),
  'reward-earned': Object.freeze([
    translateText('{icon} Premio disponible para tu {window}: {name}{extra}'),
    translateText('{icon} Tu constancia desbloqueó {name} · {window}{extra}'),
  ]),
  'reward-claimed': Object.freeze([
    translateText('{icon} Premio realizado: {name}'),
    translateText('{icon} Disfrutaste tu premio: {name}'),
  ]),
});

let queueToast = null;
let triggerEffect = null;

export function configureReinforcementFeedback(context = {}) {
  queueToast = typeof context.queueToast === 'function' ? context.queueToast : null;
  triggerEffect = typeof context.triggerEffect === 'function' ? context.triggerEffect : null;
}

function variantIndex(seed, count) {
  if (Number.isFinite(Number(seed))) return Math.abs(Math.trunc(Number(seed))) % count;
  let hash = 0;
  for (const char of String(seed)) hash = ((hash * 31) + char.codePointAt(0)) >>> 0;
  return hash % count;
}

export function reinforcementText(kind, vars = {}, variantSeed = 0) {
  const variants = REINFORCEMENT_TEXTS[kind];
  if (!variants?.length) return '';
  return variants[variantIndex(variantSeed, variants.length)].replace(/\{([a-zA-Z]+)\}/g, (_, key) => String(vars[key] ?? ''));
}

export function reinforcementFeedbackEnabled(channel = 'game') {
  const game = settings.game?.enabled === true;
  const personal = settings.reinforcement?.enabled === true;
  return channel === 'either' ? game || personal : channel === 'personal' ? personal : channel === 'game' ? game : false;
}

export function notifyReinforcement(message, { channel = 'game', effect = false } = {}) {
  const text = String(message ?? '').trim();
  if (!text || !reinforcementFeedbackEnabled(channel) || !queueToast) return false;
  queueToast(text, effect ? 'record' : '', { channel });
  if (effect && settings.game?.enabled === true && triggerEffect
      && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) triggerEffect(text);
  return true;
}

function callPay(call) {
  const amount = Number(String(call?.pay ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function chooseCallFeedback(call, { previousCalls = [], bonus = 0, money, convertedAmountText } = {}) {
  if (!call) return '';
  const formatMoney = typeof money === 'function' ? money : (value) => `$${value.toFixed(2)}`;
  const withConversion = (value) => {
    const converted = typeof convertedAmountText === 'function' ? convertedAmountText(value) : '';
    return `${formatMoney(value)}${converted ? ` ${converted}` : ''}`;
  };
  const bonusFor = (item) => Math.max(0, Number(typeof bonus === 'function' ? bonus(item) : item === call ? bonus : item?.feedbackBonus) || 0);
  const currentBonus = bonusFor(call);
  const amount = callPay(call) + currentBonus;
  const duration = Math.max(0, Number(call.durationMin) || 0);
  const seed = call.id || 0;
  const prior = previousCalls.filter((item) => item && (call.id == null || String(item.id) !== String(call.id)));
  const best = amount > 0 && prior.length > 0 && prior.every((item) => amount > callPay(item) + bonusFor(item));
  const messages = [];
  if (best) messages.push(reinforcementText('call-best', { amount: withConversion(amount) }, seed));
  else messages.push(reinforcementText('call-normal', { amount: withConversion(amount) }, seed));
  if (duration >= LONG_CALL_MINUTES) messages.push(reinforcementText('call-long', { minutes: Math.round(duration * 10) / 10 }, seed));
  if (currentBonus > 0) messages.push(reinforcementText('call-higher', { bonus: withConversion(currentBonus) }, seed));
  return messages.join(' · ');
}

export function resetFeedbackForTests() {
  queueToast = null;
  triggerEffect = null;
}
