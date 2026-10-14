import test from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage } from '../js/i18n.js';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import { withSilentCallFeedback } from '../js/call-feedback.js';

// Feedback variants are translated once when their module loads.
setLanguage('es');
const {
  LONG_CALL_MINUTES, REINFORCEMENT_TEXTS, chooseCallFeedback,
  configureReinforcementFeedback, notifyReinforcement, reinforcementFeedbackEnabled,
  reinforcementText, resetFeedbackForTests, normalizeInactivityMessage, normalizeInactivityMinutes,
} = await import('../js/reinforcement-feedback.js');
const {
  configurePositiveReinforcementContext, createDefaultReinforcementState,
  initPositiveReinforcement, onPositiveCallSaved, onPositiveRewardWindow,
  renderPositiveReinforcement, reopenPositiveReflection,
} = await import('../js/positive-reinforcement.js');

test('custom inactivity message is bounded plain text and empty restores the default', () => {
  const message = 'Respirá <3 y tomá la próxima cuando estés listo.';
  assert.equal(normalizeInactivityMessage(null), '');
  assert.equal(normalizeInactivityMessage({ text: message }), '');
  assert.equal(normalizeInactivityMessage('  Hola\ncompa\u0000  '), 'Hola compa');
  assert.equal(normalizeInactivityMessage('x'.repeat(500)).length, 240);
  setAppSettings({ reinforcement: { inactivityMessage: message } });
  assert.equal(reinforcementText('idle'), message);
  assert.equal(reinforcementText('dropped'), REINFORCEMENT_TEXTS.dropped[0]);
  setAppSettings({ reinforcement: { inactivityMessage: '   ' } });
  assert.equal(reinforcementText('idle'), REINFORCEMENT_TEXTS.idle[0]);
});

test('inactivity frequency defaults and bounds are safe and default wording follows the chosen minutes', () => {
  for (const value of [undefined, null, '', ' ', true, [], {}, NaN, Infinity, 'bad']) assert.equal(normalizeInactivityMinutes(value), 60);
  for (const [value, expected] of [[0, 1], [-5, 1], [900, 240], ['15', 15], [15.9, 15]]) assert.equal(normalizeInactivityMinutes(value), expected);
  setAppSettings({ reinforcement: { inactivityMinutes: 15 } });
  assert.match(reinforcementText('idle'), /15 minutos/);
  assert.doesNotMatch(reinforcementText('idle'), /una hora/);
  setAppSettings({ reinforcement: { inactivityMinutes: 15, inactivityMessage: 'Mi apoyo' } });
  assert.equal(reinforcementText('idle'), 'Mi apoyo');
});

test('automatic call feedback suppresses both notification channels without disabling preferences', () => {
  const config = { game: { enabled: true, intensity: 'arcade' }, reinforcement: { enabled: true } };
  setAppSettings(config); resetFeedbackForTests();
  const feedback = [];
  configureReinforcementFeedback({ queueToast: (...args) => feedback.push(args), triggerEffect: () => feedback.push('effect'), playSound: () => feedback.push('sound') });
  withSilentCallFeedback(() => {
    assert.equal(notifyReinforcement('Automatic', { channel: 'game', effect: true, sound: 'hit' }), false);
    assert.equal(notifyReinforcement('Automatic', { channel: 'personal', sound: 'reward' }), false);
  });
  assert.deepEqual(feedback, []);
  assert.equal(notifyReinforcement('Manual', { channel: 'game' }), true); assert.equal(feedback.length, 1);
  assert.deepEqual(config, { game: { enabled: true, intensity: 'arcade' }, reinforcement: { enabled: true } });
});
test('Logros y refuerzo positivo controlan sus propios canales incluso con intensidad antigua', () => {
  for (const game of [false, true]) {
    for (const personal of [false, true]) {
      for (const intensity of ['off', 'subtle', 'arcade']) {
        const config = { game: { enabled: game, intensity }, reinforcement: { enabled: personal } };
        setAppSettings(config);
        resetFeedbackForTests();
        const queued = [];
        configureReinforcementFeedback({ queueToast: (...args) => queued.push(args) });
        for (const [channel, active] of [['game', game], ['personal', personal], ['either', game || personal]]) {
          const expected = active;
          assert.equal(reinforcementFeedbackEnabled(channel), expected);
          assert.equal(notifyReinforcement(channel, { channel }), expected);
        }
        assert.equal(queued.length, Number(game) + Number(personal) + Number(game || personal));
        assert.deepEqual(config, { game: { enabled: game, intensity }, reinforcement: { enabled: personal } });
      }
    }
  }
  assert.equal(notifyReinforcement('Canal desconocido', { channel: 'unknown' }), false);
  assert.equal(notifyReinforcement('   ', { channel: 'either' }), false);
});

test('Arcade celebra hitos y movimiento reducido conserva anuncios sin partículas', () => {
  const config = { game: { enabled: true, intensity: 'arcade' }, reinforcement: { enabled: false } };
  setAppSettings(config);
  const queued = [];
  const effects = [];
  configureReinforcementFeedback({ queueToast: (...args) => queued.push(args), triggerEffect: (text) => effects.push(text) });
  notifyReinforcement('Hito', { effect: true });
  assert.deepEqual(queued[0], ['Hito', 'record', { channel: 'game' }]);
  assert.deepEqual(effects, ['Hito']);
  notifyReinforcement('Llamada normal');
  assert.deepEqual(effects, ['Hito'], 'las llamadas normales no disparan partículas');
  notifyReinforcement('Récord', { effect: true });
  assert.deepEqual(effects, ['Hito', 'Récord']);
  const previousMatchMedia = globalThis.matchMedia;
  try {
    globalThis.matchMedia = () => ({ matches: true });
    notifyReinforcement('Otro hito', { effect: true });
    assert.deepEqual(effects, ['Hito', 'Récord']);
    assert.equal(queued.at(-1)[0], 'Otro hito');
  } finally {
    if (previousMatchMedia === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = previousMatchMedia;
  }
  resetFeedbackForTests();
  assert.equal(notifyReinforcement('Sin cola configurada'), false);
});

test('textos centrales tienen variantes estables y no dejan variables sin reemplazar', () => {
  const vars = { amount: '$12.00 ≈ L 300.00', bonus: '$1.00 ≈ L 25.00', minutes: 30, percent: 25, pause: 'Break', xp: ' · +5 XP', icon: '☕', name: 'Té', window: 'Break', extra: '' };
  for (const [kind, variants] of Object.entries(REINFORCEMENT_TEXTS)) {
    assert.ok(variants.length >= 2, kind);
    const first = reinforcementText(kind, vars, 0);
    assert.notEqual(first, reinforcementText(kind, vars, 1));
    assert.equal(first, reinforcementText(kind, vars, variants.length));
    assert.equal(reinforcementText(kind, vars, 'call-id'), reinforcementText(kind, vars, 'call-id'));
    assert.doesNotMatch(first, /\{\w+\}/);
  }
  assert.equal(reinforcementText('unknown'), '');
});

test('feedback reconoce llamada normal, umbral largo, bono y mejor pago con moneda secundaria', () => {
  setLanguage('es');
  assert.equal(LONG_CALL_MINUTES, 30);
  const format = { money: (value) => `$${value.toFixed(2)}`, convertedAmountText: (value) => `≈ L ${(value * 25).toFixed(2)}` };
  const normal = { id: 'normal', durationMin: 29.9, pay: '$5.00' };
  const plain = chooseCallFeedback(normal, format);
  assert.match(plain, /\$5\.00 ≈ L 125\.00/);
  assert.doesNotMatch(plain, /Higher Rate|larga|continua|Sostuviste|mayor pago|mejor/);
  const long = { id: 0, durationMin: 30, pay: '$10.00' };
  const combined = chooseCallFeedback(long, { ...format, previousCalls: [normal, long], bonus: 2 });
  assert.match(combined, /mejor llamada por pago/);
  assert.match(combined, /\$12\.00 ≈ L 300\.00/);
  assert.match(combined, /30 min/);
  assert.match(combined, /Higher Rate · bono de \$2\.00 ≈ L 50\.00/);
  const tie = chooseCallFeedback({ ...normal, id: 'tie' }, { previousCalls: [normal] });
  assert.doesNotMatch(tie, /mejor|mayor pago/);
  assert.doesNotMatch(chooseCallFeedback({ id: 'free', pay: 0 }, { previousCalls: [{ id: 'before', pay: 0 }] }), /mejor|mayor pago/);
  assert.equal(chooseCallFeedback(null), '');
});

test('mejor llamada compara el bono real de las anteriores y excluye el mismo evento', () => {
  setLanguage('es');
  const call = { id: 'current', durationMin: 5, pay: 10, extra: 2 };
  const prior = { id: 'prior', pay: 9, extra: 5 };
  const feedback = chooseCallFeedback(call, { previousCalls: [prior, { ...call }], bonus: (item) => item.extra || 0 });
  assert.doesNotMatch(feedback, /mejor|mayor pago/);
  assert.match(feedback, /Higher Rate/);
  const corrected = chooseCallFeedback({ ...call, pay: 13 }, { previousCalls: [prior, call], bonus: (item) => item.extra || 0 });
  assert.match(corrected, /mejor|mayor pago/);
});

test('Refuerzo positivo funciona con Logros apagado y espera el cierre del diálogo de importación', async () => {
  setLanguage('es');
  const dayKey = '09/29/2026';
  const call = { id: 'personal-call', callDate: dayKey, startISO: new Date(Date.now() - 120000).toISOString(), endISO: new Date(Date.now() - 60000).toISOString() };
  const rows = [call];
  const currentState = { game: { reinforcement: createDefaultReinforcementState() }, activePause: { type: 'break' } };
  const config = { game: { enabled: false, intensity: 'off' }, reinforcement: { enabled: false, askAfterCall: true, rewards: [{ id: 'tea', name: 'Té', icon: '☕', window: 'break', trigger: 'calls', every: 1 }] } };
  setAppState(currentState);
  setAppCalls(rows);
  setAppSettings(config);
  const opened = [];
  const closed = [];
  const messages = [];
  const listeners = new Map();
  const nodes = new Map([['physicalRewardClaimList', { innerHTML: '' }], ['physicalRewardClaimTitle', { textContent: '' }]]);
  for (const id of ['positiveReflectionModal', 'physicalRewardClaimModal', 'physicalRewardEditorModal']) {
    const modal = { open: false };
    modal.classList = { contains: name => name === 'open' && modal.open };
    nodes.set(id, modal);
  }
  globalThis.document = { getElementById: (id) => nodes.get(id) || null, addEventListener: (type, callback) => listeners.set(type, callback),
    querySelector: () => [...nodes.values()].find(node => node.open) || null };
  configureReinforcementFeedback({ queueToast: (...args) => messages.push(args) });
  const positiveContext = {
    callDateKeyFromValue: (value) => value === dayKey ? value : '', callsForDay: () => rows,
    closeModal: (id) => { closed.push(id); nodes.get(id).open = false; }, convertedAmountText: () => '', effectiveDailyGoal: () => ({ usd: 0 }),
    escapeHtml: String, importedCallStats: () => ({ earnings: 0 }), openModal: (id) => { opened.push(id); nodes.get(id).open = true; },
    saveSettingsOnly: () => {}, saveStateOnly: () => {}, toast: () => {}, todayCallDateKey: () => dayKey,
  };
  configurePositiveReinforcementContext(positiveContext);
  onPositiveCallSaved(call, 'manual', dayKey);
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 0);
  assert.deepEqual(currentState.game.reinforcement.reflections, {});
  assert.equal(messages.length, 0);
  assert.deepEqual(opened, []);
  assert.equal(reopenPositiveReflection(call, dayKey), false);
  assert.equal(onPositiveRewardWindow('break', { manual: true }), false);

  config.reinforcement.enabled = true;
  onPositiveCallSaved(call, 'manual', dayKey);
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 1);
  assert.ok(messages.length > 0);
  assert.deepEqual(opened, ['positiveReflectionModal']);
  assert.equal(onPositiveRewardWindow('break'), true);
  assert.equal(onPositiveRewardWindow('break', { manual: true }), true);
  assert.equal(opened.at(-1), 'physicalRewardClaimModal');
  initPositiveReinforcement();
  assert.equal(opened.filter(id => id === 'positiveReflectionModal').length, 1);
  globalThis.Element = class { closest() { return this; } };
  const button = new Element();
  button.dataset = { positiveOutcome: 'good' };
  listeners.get('click')({ target: button });
  assert.equal(messages.at(-1)[2].channel, 'personal');
  assert.match(messages.at(-1)[0], /positivo|salió bien|cerró bien/);
  assert.equal(currentState.game.reinforcement.reflections[call.id].outcome, 'good');
  const imported = { ...call, id: 'pasted-1' };
  const imported2 = { ...call, id: 'pasted-2' };
  nodes.get('physicalRewardClaimModal').open = false;
  rows.push(imported, imported2);
  nodes.set('callsModal', { open: true });
  const beforePaste = opened.length;
  onPositiveCallSaved(imported, 'import', dayKey);
  onPositiveCallSaved(imported, 'import', dayKey);
  onPositiveCallSaved(imported2, 'import', dayKey);
  assert.equal(opened.length, beforePaste, 'import waits instead of opening beneath the paste dialog');
  nodes.get('callsModal').open = false;
  listeners.get('app:modal-closed')({ detail: { id: 'callsModal' } });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(opened.length, beforePaste + 1);
  listeners.get('click')({ target: button });
  listeners.get('app:modal-closed')({ detail: { id: 'positiveReflectionModal' } });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(currentState.game.reinforcement.reflections[imported.id].outcome, 'good');
  assert.equal(opened.length, beforePaste + 2, 'second imported call prompts after first closure');
  listeners.get('click')({ target: button });
  listeners.get('app:modal-closed')({ detail: { id: 'positiveReflectionModal' } });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(opened.length, beforePaste + 2, 'duplicate import cannot add another reflection');
  const disabledQueued = { ...call, id: 'disabled-queued' };
  rows.push(disabledQueued);
  nodes.get('callsModal').open = true;
  onPositiveCallSaved(disabledQueued, 'import', dayKey);
  config.reinforcement.askAfterCall = false;
  nodes.get('callsModal').open = false;
  listeners.get('app:modal-closed')({ detail: { id: 'callsModal' } });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(opened.length, beforePaste + 2, 'turning off brief closure cancels queued prompts');
  config.reinforcement.askAfterCall = true;
  const beforeFailure = structuredClone(currentState.game.reinforcement);
  const failed = { ...call, id: 'failed-save' };
  rows.push(failed);
  configurePositiveReinforcementContext({ ...positiveContext, saveStateOnly: () => false });
  const messagesBeforeFailure = messages.length;
  onPositiveCallSaved(failed, 'manual', dayKey);
  assert.deepEqual(currentState.game.reinforcement, beforeFailure);
  assert.equal(messages.length, messagesBeforeFailure, 'rejected write cannot announce a reward');
  assert.equal(opened.length, beforePaste + 2);
  configurePositiveReinforcementContext(positiveContext);
  assert.equal(reopenPositiveReflection(call, dayKey), true);
  nodes.get('physicalRewardClaimModal').open = true;
  nodes.get('physicalRewardEditorModal').open = true;
  const saved = structuredClone(currentState.game.reinforcement);
  const messagesBeforeDisable = messages.length;
  closed.length = 0;
  config.reinforcement.enabled = false;
  renderPositiveReinforcement();
  for (const id of ['positiveReflectionModal', 'physicalRewardClaimModal']) {
    assert.ok(closed.includes(id), `${id} se cierra al apagar el refuerzo`);
    assert.equal(nodes.get(id).open, false);
  }
  assert.equal(nodes.get('physicalRewardEditorModal').open, true, 'el editor de preferencias sigue disponible con Logros apagado');
  assert.equal(closed.includes('physicalRewardEditorModal'), false);
  assert.deepEqual(currentState.game.reinforcement, saved);
  assert.equal(reopenPositiveReflection(call, dayKey), false);
  assert.equal(onPositiveRewardWindow('break', { manual: true }), false);
  listeners.get('click')({ target: button });
  assert.equal(messages.length, messagesBeforeDisable);
  assert.deepEqual(currentState.game.reinforcement, saved);
});
