import { settings } from './app-context.js';

export const LONG_CALL_MINUTES = 30;

export const REINFORCEMENT_TEXTS = Object.freeze({
  'call-normal': Object.freeze([
    'Llamada completada · sumaste {amount} a tu día',
    'Tomaste otra llamada · {amount} ganados',
    'Una llamada más completada · {amount} para tu meta',
  ]),
  'call-long': Object.freeze([
    'Sostuviste una llamada de {minutes} min',
    'Completaste {minutes} min de atención continua',
    'Llamada larga completada · {minutes} min de trabajo',
  ]),
  'call-higher': Object.freeze([
    'Aprovechaste Higher Rate · bono de {bonus}',
    'Esta llamada sumó un bono Higher Rate de {bonus}',
    'Higher Rate aprovechado · {bonus} extra en esta llamada',
  ]),
  'call-best': Object.freeze([
    'Tu mejor llamada por pago de hoy · {amount}',
    'Nuevo mejor pago por llamada de hoy · {amount}',
    'Esta es tu llamada de mayor pago de hoy · {amount}',
  ]),
  milestone: Object.freeze([
    'Llegaste al {percent}% de tu meta diaria · {amount} ganados',
    'Tu trabajo ya cubre el {percent}% de tu meta · {amount}',
    'Hito del {percent}% alcanzado · sumaste {amount} hoy',
  ]),
  pause: Object.freeze([
    'Volviste a tiempo de {pause} · cuidaste tu descanso y tu ritmo{xp}',
    '{pause} terminado a tiempo · tu pausa también cuenta{xp}',
    'Regreso puntual de {pause} · listo para continuar{xp}',
  ]),
  dropped: Object.freeze([
    'La llamada se cortó · una llamada no define tu día',
    'El corte quedó registrado · puedes retomar con la siguiente llamada',
    'Una llamada cortada no borra el trabajo que ya hiciste',
  ]),
  idle: Object.freeze([
    'Ha pasado una hora de trabajo sin llamadas · puedes retomar a tu ritmo',
    'Una hora sin llamadas no define tu capacidad · sigue a tu ritmo',
    'Este tramo estuvo tranquilo · la siguiente llamada será un nuevo paso',
  ]),
  recovery: Object.freeze([
    'Volviste a tomar otra llamada · recuperación lograda',
    'Retomaste después de una llamada difícil · ese paso cuenta',
    'Una nueva llamada completada · seguiste adelante',
  ]),
  'reflection-good': Object.freeze([
    'Cierre positivo guardado · esta llamada cuenta',
    'Reconociste algo que salió bien en tu llamada',
    'Guardaste evidencia de una llamada que cerró bien',
  ]),
  'reflection-difficult': Object.freeze([
    'La tomaste aunque fue difícil · puedes volver a tu ritmo',
    'Enfrentaste una llamada difícil · tu esfuerzo cuenta',
    'Una llamada difícil no borra las que ya completaste',
  ]),
  'reflection-learning': Object.freeze([
    'Aprendizaje guardado · una llamada no define tu capacidad',
    'Encontraste un aprendizaje en esta llamada',
    'Lo que aprendiste hoy puede ayudarte en la siguiente llamada',
  ]),
  'reward-earned': Object.freeze([
    '{icon} Premio disponible para tu {window}: {name}{extra}',
    '{icon} Tu constancia desbloqueó {name} · {window}{extra}',
  ]),
  'reward-claimed': Object.freeze([
    '{icon} Premio realizado: {name}',
    '{icon} Disfrutaste tu premio: {name}',
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
  if (settings.game?.intensity === 'off') return false;
  const game = settings.game?.enabled === true;
  const personal = settings.reinforcement?.enabled === true;
  return channel === 'either' ? game || personal : channel === 'personal' ? personal : channel === 'game' ? game : false;
}

export function notifyReinforcement(message, { channel = 'game', effect = false } = {}) {
  const text = String(message ?? '').trim();
  if (!text || !reinforcementFeedbackEnabled(channel) || !queueToast) return false;
  queueToast(text, effect ? 'record' : '', { channel });
  if (effect && settings.game?.intensity === 'arcade' && triggerEffect
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
