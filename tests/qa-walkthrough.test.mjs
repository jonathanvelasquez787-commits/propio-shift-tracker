import assert from 'node:assert/strict';
import test from 'node:test';

import {
  configureQaWalkthroughContext,
  initQaWalkthrough,
  renderQaWalkthrough,
  stopQaWalkthrough,
} from '../js/qa-walkthrough.js';

class MockElement {
  constructor() {
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.handlers = new Map();
  }

  addEventListener(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    this.handlers.get(type)?.delete(handler);
  }

  fire(type, { force = false } = {}) {
    if (this.disabled && !force) return;
    for (const handler of this.handlers.get(type) || []) handler({ preventDefault() {} });
  }
}

function makeDocument() {
  const nodes = new Map([
    'qaWalkthroughPanel', 'qaWalkthroughProgress', 'qaWalkthroughTitle', 'qaWalkthroughDescription',
    'qaWalkthroughResult', 'qaWalkthroughNextBtn', 'qaWalkthroughRestartBtn',
  ].map((id) => [id, new MockElement()]));
  const handlers = new Map();
  return {
    nodes,
    getElementById: (id) => nodes.get(id) || null,
    addEventListener(type, handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(handler);
    },
    removeEventListener(type, handler) { handlers.get(type)?.delete(handler); },
    dispatchEvent(event) {
      for (const handler of handlers.get(event.type) || []) handler(event);
    },
  };
}

function makeHarness({ active = true, withModel = true } = {}) {
  const now = new Date();
  const dayKey = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
  const state = {
    activeDayKey: dayKey,
    shiftStartedAt: new Date(now.getTime() - 30 * 60000).toISOString(),
    shiftEndedAt: null,
    activePause: null,
    game: { totalXp: 120, live: { combo: 0 }, chest: { pending: false }, reinforcement: { reflections: {}, pendingRewards: [] } },
    ...(withModel ? { qaWalkthrough: { version: 1, step: 0, completed: false, sessionId: 'qa-session-test', nextCallOrdinal: 1, generatedCallIds: [] } } : {}),
  };
  const calls = [];
  const effects = { addCall: [], reopenReflection: [], navigate: [], startPause: [], endPause: 0, endShift: 0, restart: 0, save: 0, notify: [] };
  let modalOpen = false;
  let activeFlag = active;
  let duringAddCall = null;
  const documentMock = makeDocument();
  global.document = documentMock;

  const context = {
    getState: () => state,
    getCalls: () => calls,
    getSettings: () => ({ reinforcement: { enabled: true, askAfterCall: true } }),
    isActive: () => activeFlag,
    saveState: () => { effects.save++; },
    addCall(call, source) {
      if (!calls.some((item) => item.id === call.id)) calls.push(call);
      effects.addCall.push({ id: call.id, source, stepAtHook: state.qaWalkthrough?.step, generatedBeforeHook: state.qaWalkthrough?.generatedCallIds?.includes(call.id) });
      if (source === 'manual') modalOpen = true;
      duringAddCall?.();
    },
    reopenReflection(call, dayKeyArg) {
      effects.reopenReflection.push({ id: call.id, dayKey: dayKeyArg });
      modalOpen = true;
    },
    startPause(type) {
      effects.startPause.push(type);
      state.activePause = { type };
      modalOpen = true;
    },
    endPause() { effects.endPause++; state.activePause = null; },
    endShift() { effects.endShift++; state.shiftEndedAt = new Date().toISOString(); modalOpen = true; },
    navigate(page, targetId) { effects.navigate.push({ page, targetId }); },
    restart() { effects.restart++; },
    hasOpenModal: () => modalOpen,
    notify: (text) => effects.notify.push(text),
  };

  function closeModal(id, reflection = null) {
    if (reflection) state.game.reinforcement.reflections[reflection.callId] = reflection;
    modalOpen = false;
    documentMock.dispatchEvent({ type: 'app:modal-closed', detail: { id } });
  }

  return {
    state, calls, effects, context, document: documentMock, closeModal,
    setActive(value) { activeFlag = value; },
    setModalOpen(value) { modalOpen = value; },
    setDuringAddCall(callback) { duringAddCall = callback; },
  };
}

function setup(harness) {
  configureQaWalkthroughContext(harness.context);
  initQaWalkthrough();
}

function click(harness, id, force = false) {
  harness.document.getElementById(id).fire('click', { force });
}

test('guía y acciones quedan inactivas fuera del recorrido QA o sin modelo v1', () => {
  const outsideQa = makeHarness({ active: false });
  setup(outsideQa);
  assert.equal(renderQaWalkthrough(), false);
  assert.equal(outsideQa.document.getElementById('qaWalkthroughPanel').hidden, true);
  click(outsideQa, 'qaWalkthroughNextBtn', true);
  click(outsideQa, 'qaWalkthroughRestartBtn', true);
  assert.equal(outsideQa.effects.addCall.length, 0);
  assert.equal(outsideQa.effects.navigate.length, 0);
  assert.equal(outsideQa.effects.restart, 0);
  stopQaWalkthrough();

  const oldTour = makeHarness({ active: true, withModel: false });
  setup(oldTour);
  assert.equal(oldTour.document.getElementById('qaWalkthroughPanel').hidden, true);
  click(oldTour, 'qaWalkthroughNextBtn', true);
  assert.equal(oldTour.effects.addCall.length, 0);
  assert.equal(oldTour.effects.navigate.length, 0);
  stopQaWalkthrough();
  delete global.document;
});

test('recorrido de ocho pasos usa hooks una vez, respeta reflexiones, modales y recarga', () => {
  const h = makeHarness();
  setup(h);
  const next = () => click(h, 'qaWalkthroughNextBtn');

  assert.match(h.document.getElementById('qaWalkthroughDescription').textContent, /arena está en Inicio/);
  next();
  assert.equal(h.state.qaWalkthrough.step, 1);
  assert.deepEqual(h.effects.navigate.at(-1), { page: 'achievements', targetId: 'gameSettingsAccordion' });

  h.setDuringAddCall(() => click(h, 'qaWalkthroughNextBtn', true));
  next();
  h.setDuringAddCall(null);
  assert.equal(h.state.qaWalkthrough.step, 2);
  assert.equal(h.effects.addCall.length, 1);
  assert.equal(h.effects.addCall[0].source, 'manual');
  assert.equal(h.effects.addCall[0].stepAtHook, 2);
  assert.equal(h.effects.addCall[0].generatedBeforeHook, true);
  assert.deepEqual(h.effects.navigate.at(-1), { page: 'achievements', targetId: 'gameArena' });
  const firstCall = h.calls[0];
  assert.equal(h.state.qaWalkthrough.reflectionCallId, firstCall.id);
  click(h, 'qaWalkthroughNextBtn', true);
  assert.equal(h.effects.addCall.length, 1);

  h.closeModal('positiveReflectionModal', { callId: firstCall.id, outcome: 'good' });
  assert.match(h.document.getElementById('qaWalkthroughResult').textContent, /cierre positivo/i);
  assert.doesNotMatch(h.document.getElementById('qaWalkthroughResult').textContent, /\bgood\b/);
  next();
  assert.equal(h.state.qaWalkthrough.step, 3);
  assert.equal(h.effects.addCall.length, 2);
  const difficultCall = h.calls[1];
  assert.equal(h.effects.addCall[1].source, 'manual');

  stopQaWalkthrough();
  configureQaWalkthroughContext(h.context);
  h.setModalOpen(false);
  initQaWalkthrough();
  assert.equal(h.effects.addCall.length, 2, 'init no repite llamadas ni hooks al recargar');
  next();
  assert.equal(h.effects.addCall.length, 2, 'reabrir reflexión no vuelve a guardar ni a otorgar XP');
  assert.equal(h.effects.reopenReflection.at(-1).id, difficultCall.id);
  h.closeModal('positiveReflectionModal', { callId: difficultCall.id, outcome: 'good' });
  assert.match(h.document.getElementById('qaWalkthroughResult').textContent, /cierre positivo/i);
  next();
  assert.equal(h.effects.addCall.length, 2);
  assert.ok(h.effects.notify.length === 0, 'el aviso se presenta dentro del panel');
  assert.match(h.document.getElementById('qaWalkthroughResult').textContent, /Difícil|Aprendizaje/);
  assert.equal(h.effects.reopenReflection.at(-1).id, difficultCall.id);

  h.closeModal('positiveReflectionModal', { callId: difficultCall.id, outcome: 'difficult' });
  assert.match(h.document.getElementById('qaWalkthroughResult').textContent, /difícil/i);
  assert.doesNotMatch(h.document.getElementById('qaWalkthroughResult').textContent, /\bdifficult\b/);
  next();
  assert.equal(h.state.qaWalkthrough.step, 4);
  assert.equal(h.effects.addCall.length, 3);
  const recoveryCall = h.calls[2];
  assert.equal(h.effects.addCall[2].source, 'manual');
  assert.ok(new Date(recoveryCall.startISO).getTime() >= new Date(difficultCall.endISO).getTime());

  click(h, 'qaWalkthroughNextBtn', true);
  assert.equal(h.effects.addCall.length, 3, 'el modal de tercera reflexión bloquea el siguiente paso');
  h.closeModal('positiveReflectionModal');
  next();
  assert.equal(h.state.qaWalkthrough.step, 4);
  assert.equal(h.effects.addCall[3].source, 'import');
  const call4 = h.calls[3];

  stopQaWalkthrough();
  configureQaWalkthroughContext(h.context);
  initQaWalkthrough();
  assert.equal(h.effects.addCall.filter((item) => item.id === call4.id).length, 1, 'la recarga no repite el hook de la llamada 4');
  next();
  assert.equal(h.state.qaWalkthrough.step, 5);
  assert.equal(h.effects.addCall.length, 5);
  assert.deepEqual(h.effects.addCall.slice(3).map((item) => item.source), ['import', 'import']);
  assert.match(h.document.getElementById('qaWalkthroughResult').textContent, /Combo: .*XP total: .*Premios pendientes:/);

  next();
  assert.equal(h.state.qaWalkthrough.step, 5);
  assert.equal(h.state.qaWalkthrough.phase, 'break-open');
  assert.deepEqual(h.effects.startPause, ['break']);
  assert.match(h.document.getElementById('qaWalkthroughResult').textContent, /Break: activo/);
  assert.equal((h.document.getElementById('qaWalkthroughResult').textContent.match(/Premios pendientes:/g) || []).length, 1);
  click(h, 'qaWalkthroughNextBtn', true);
  assert.equal(h.effects.endPause, 0, 'la ventana de premio abierta bloquea terminar el Break');
  h.closeModal('physicalRewardClaimModal');
  next();
  assert.equal(h.state.qaWalkthrough.step, 6);
  assert.equal(h.effects.endPause, 1);

  next();
  assert.equal(h.state.qaWalkthrough.step, 7);
  assert.equal(h.state.qaWalkthrough.completed, true);
  assert.equal(h.effects.addCall.length, 6);
  assert.equal(h.effects.addCall[5].source, 'import');
  assert.equal(h.effects.endShift, 1);
  assert.deepEqual(h.effects.navigate.at(-1), { page: 'achievements', targetId: 'positiveHistoryPanel' });
  assert.equal(h.document.getElementById('qaWalkthroughNextBtn').disabled, true);
  click(h, 'qaWalkthroughNextBtn', true);
  assert.equal(h.effects.addCall.length, 6);
  h.closeModal('stageClearModal');
  click(h, 'qaWalkthroughRestartBtn');
  assert.equal(h.effects.restart, 1);
  assert.equal(h.document.getElementById('qaWalkthroughPanel').hidden, true);
  assert.equal(new Set(h.effects.addCall.map((item) => item.id)).size, 6);
  stopQaWalkthrough();
  delete global.document;
});

test('no avanza el paso ni consume el ID si addCall falla antes de guardar', () => {
  const h = makeHarness();
  setup(h);
  click(h, 'qaWalkthroughNextBtn');
  const addCall = h.context.addCall;
  const originalModel = structuredClone(h.state.qaWalkthrough);

  h.context.addCall = () => false;
  click(h, 'qaWalkthroughNextBtn');
  assert.deepEqual(h.state.qaWalkthrough, originalModel, 'false sin insertar restaura paso, fase, IDs y resultado');
  assert.equal(h.calls.length, 0);

  h.context.addCall = () => { throw new Error('write failed'); };
  click(h, 'qaWalkthroughNextBtn');
  assert.deepEqual(h.state.qaWalkthrough, originalModel, 'excepción antes de insertar restaura el modelo completo');
  assert.equal(h.calls.length, 0);

  h.context.addCall = addCall;
  click(h, 'qaWalkthroughNextBtn');
  assert.equal(h.state.qaWalkthrough.step, 2);
  assert.equal(h.calls.length, 1);
  assert.equal(h.effects.addCall.length, 1, 'al reintentar se ejecuta el hook una sola vez');
  stopQaWalkthrough();
  delete global.document;
});
