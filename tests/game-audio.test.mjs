import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameAudio } from '../js/game-audio.js';

function harness({ resumeMode = 'running', available = true } = {}) {
  const config = { masterVolume: 100, game: { enabled: true, soundEnabled: true, soundVolume: 40 } };
  const timers = new Map(), documentListeners = new Map(), hostListeners = new Map(), contexts = [];
  let timerId = 0;
  const addListener = (map, name, callback) => map.set(name, [...(map.get(name) || []), callback]);
  const param = () => ({
    value: 0, events: [],
    setValueAtTime(value, at) { this.events.push({ method: 'set', value, at }); },
    exponentialRampToValueAtTime(value, at) { this.events.push({ method: 'ramp', value, at }); },
    setTargetAtTime(value, at, constant) { this.events.push({ method: 'target', value, at, constant }); },
  });
  class Node {
    constructor(kind) {
      this.kind = kind;
      this.connections = [];
      this.disconnects = 0;
      this.gain = param();
      this.frequency = param();
      this.starts = [];
      this.stops = [];
      this.ended = false;
    }
    connect(target) { this.connections.push(target); return target; }
    disconnect() { this.disconnects++; }
    start(at) { this.starts.push(at); }
    stop(at) { this.stops.push(at); if (at === undefined) this.end(); }
    end() { if (!this.ended) { this.ended = true; this.onended?.(); } }
  }
  class AudioContext {
    constructor() {
      this.currentTime = 10;
      this.sampleRate = 48000;
      this.state = 'suspended';
      this.destination = new Node('destination');
      this.nodes = [];
      this.resumeCalls = 0;
      this.resolvers = [];
      contexts.push(this);
    }
    node(kind) { const node = new Node(kind); this.nodes.push(node); return node; }
    createGain() { return this.node('gain'); }
    createBiquadFilter() { return this.node('filter'); }
    createOscillator() { return this.node('oscillator'); }
    createBufferSource() { return this.node('noise'); }
    createBuffer(channels, size, rate) {
      assert.equal(channels, 1);
      assert.equal(rate, this.sampleRate);
      const data = new Float32Array(size);
      return { getChannelData: () => data };
    }
    resume() {
      this.resumeCalls++;
      if (resumeMode === 'reject') return Promise.reject(new Error('autoplay blocked'));
      if (resumeMode === 'defer') return new Promise((resolve) => this.resolvers.push(() => { this.state = 'running'; resolve(); }));
      this.state = 'running';
      return Promise.resolve();
    }
    finishVoices() { this.nodes.filter(node => node.starts.length).forEach(node => node.end()); }
  }
  const doc = { hidden: false, addEventListener(name, callback) { addListener(documentListeners, name, callback); } };
  const host = {
    document: doc,
    ...(available ? { AudioContext } : {}),
    addEventListener(name, callback) { addListener(hostListeners, name, callback); },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const audio = createGameAudio({ readSettings: () => config, host, doc });
  const dispatch = (name, props = {}) => {
    for (const callback of documentListeners.get(name) || []) callback({ type: name, isTrusted: true, ...props });
  };
  return {
    audio, config, contexts, timers, doc, documentListeners, hostListeners, dispatch,
    unlock() { audio.init(); dispatch('pointerdown'); },
    get sources() { return contexts.flatMap(ctx => ctx.nodes.filter(node => ['oscillator', 'noise'].includes(node.kind))); },
    async flush() {
      const batch = [...timers.values()];
      timers.clear();
      await Promise.all(batch.map(({ callback, delay }) => { assert.equal(delay, 45); return callback(); }));
    },
    beginFlush() {
      const batch = [...timers.values()];
      timers.clear();
      return Promise.all(batch.map(({ callback }) => callback()));
    },
  };
}

test('inicializar o recargar no crea contexto ni reproduce eventos anteriores', async () => {
  for (let load = 0; load < 2; load++) {
    const h = harness();
    h.audio.init();
    assert.equal(h.audio.play('clear'), false);
    assert.equal(h.timers.size, 0);
    assert.equal(h.contexts.length, 0);
    h.dispatch('pointerdown');
    await h.flush();
    assert.equal(h.sources.length, 0, 'el primer gesto no recupera celebraciones anteriores');
  }
});

test('init es idempotente y gestos válidos reutilizan un único contexto', async () => {
  const h = harness();
  h.audio.init();
  h.audio.init();
  for (const name of ['pointerdown', 'keydown', 'click', 'visibilitychange']) assert.equal(h.documentListeners.get(name).length, 1);
  assert.equal(h.hostListeners.get('pagehide').length, 1);
  h.dispatch('pointerdown', { isTrusted: false });
  h.dispatch('keydown', { ctrlKey: true });
  h.dispatch('keydown', { metaKey: true });
  h.dispatch('keydown', { altKey: true });
  assert.equal(h.contexts.length, 0);
  h.dispatch('keydown');
  h.dispatch('click');
  h.dispatch('pointerdown');
  assert.equal(h.contexts.length, 1);
  assert.equal(h.sources.length, 0);
  assert.equal(h.audio.play('equip'), true);
  await h.flush();
  assert.equal(h.sources.length, 2);
});

test('resume rechazado y Web Audio ausente conservan silencio sin errores', async () => {
  const blocked = harness({ resumeMode: 'reject' });
  blocked.unlock();
  blocked.audio.play('stage');
  await blocked.flush();
  assert.equal(blocked.sources.length, 0);
  const unavailable = harness({ available: false });
  unavailable.unlock();
  assert.equal(unavailable.audio.play('hit'), false);
  assert.equal(unavailable.contexts.length, 0);
});

test('volumen maestro, volumen arcade y sus interruptores impiden desbloquear audio', () => {
  for (const disable of [
    h => { h.config.masterVolume = 0; },
    h => { h.config.game.soundVolume = 0; },
    h => { h.config.game.soundEnabled = false; },
    h => { h.config.game.enabled = false; },
  ]) {
    const h = harness();
    disable(h);
    h.unlock();
    assert.equal(h.audio.play('hit'), false);
    assert.equal(h.contexts.length, 0);
  }
});

test('un lote de impacto, misión y derrota reproduce una sola fanfarria', async () => {
  const h = harness();
  h.unlock();
  for (const kind of ['hit', 'mission', 'clear', 'clear', 'hit']) assert.equal(h.audio.play(kind), true);
  assert.equal(h.audio.play('unknown'), false);
  assert.equal(h.timers.size, 1);
  await h.flush();
  assert.equal(h.sources.length, 6);
  assert.deepEqual(h.sources.map(node => node.frequency.events[0].value), [523, 659, 784, 1047, 784, 1047]);
  assert.ok(h.sources.every(node => node.starts.length === 1));
  const output = h.contexts[0].nodes[0];
  assert.equal(output.gain.events.at(-1).value, .4);
});

test('silenciar antes de reproducir cancela el lote incluso si después se restaura el volumen', async () => {
  const h = harness();
  h.unlock();
  h.audio.play('clear');
  h.config.masterVolume = 0;
  h.audio.sync();
  assert.equal(h.timers.size, 0);
  h.config.masterVolume = 100;
  h.audio.sync();
  await h.flush();
  assert.equal(h.sources.length, 0);
});

test('apagar Logros cancela sonidos personales y pruebas pendientes sin reproducirlos al reactivar', async () => {
  const h = harness();
  h.config.reinforcement = { enabled: true };
  h.unlock();
  assert.equal(h.audio.play('reward'), true);
  assert.equal(h.audio.play('loot'), true, 'la prueba de arcade entra en el mismo lote');
  h.config.game.enabled = false;
  h.audio.sync();
  assert.equal(h.timers.size, 0);
  assert.equal(h.audio.play('pause'), false);
  assert.equal(h.audio.play('loot'), false);
  h.config.game.enabled = true;
  h.audio.sync();
  await h.flush();
  assert.equal(h.sources.length, 0);
});

test('apagar Logros durante resume cancela audio aunque refuerzo personal permanezca activado', async () => {
  const h = harness({ resumeMode: 'defer' });
  h.config.reinforcement = { enabled: true };
  h.unlock();
  h.audio.play('reward');
  const flushed = h.beginFlush();
  h.config.game.enabled = false;
  h.audio.sync();
  h.config.game.enabled = true;
  h.contexts[0].resolvers.forEach(resolve => resolve());
  await flushed;
  assert.equal(h.sources.length, 0);
});

test('silenciar durante una fanfarria detiene y desconecta todas las voces', async () => {
  for (const disable of [
    h => { h.config.masterVolume = 0; },
    h => { h.config.game.soundVolume = 0; },
    h => { h.config.game.soundEnabled = false; },
    h => { h.config.game.enabled = false; },
  ]) {
    const h = harness();
    h.unlock();
    h.audio.play('stage');
    await h.flush();
    assert.equal(h.sources.length, 7);
    disable(h);
    h.audio.sync();
    assert.ok(h.sources.every(node => node.stops.includes(undefined) && node.disconnects === 1));
    assert.ok(h.sources.every(node => node.connections[0].disconnects === 1));
    assert.equal(h.contexts[0].nodes[0].gain.events.at(-1).value, 0);
    assert.equal(h.audio.play('hit'), false);
  }
});

test('ocultar página cancela lotes y voces y volver no reproduce sonidos pendientes', async () => {
  const h = harness();
  h.unlock();
  h.audio.play('hit');
  h.doc.hidden = true;
  h.dispatch('visibilitychange');
  assert.equal(h.timers.size, 0);
  assert.equal(h.audio.play('clear'), false);
  h.doc.hidden = false;
  h.dispatch('visibilitychange');
  await h.flush();
  assert.equal(h.sources.length, 0);
  h.audio.play('critical');
  await h.flush();
  assert.ok(h.sources.some(node => node.kind === 'noise'));
  h.doc.hidden = true;
  h.dispatch('visibilitychange');
  assert.ok(h.sources.every(node => node.ended && node.disconnects === 1));
});

test('cancelar mientras resume espera impide que una promesa tardía reproduzca audio', async () => {
  const h = harness({ resumeMode: 'defer' });
  h.unlock();
  h.audio.play('clear');
  const flushed = h.beginFlush();
  const context = h.contexts[0];
  assert.equal(context.resolvers.length, 2);
  h.audio.stop();
  context.resolvers.forEach(resolve => resolve());
  await flushed;
  assert.equal(h.sources.length, 0);
});

test('una celebración activa protege su prioridad y una mayor la reemplaza', async () => {
  const h = harness();
  h.unlock();
  h.audio.play('clear');
  await h.flush();
  const initial = [...h.sources];
  h.audio.play('hit');
  await h.flush();
  assert.equal(h.sources.length, initial.length);
  h.audio.play('stage');
  await h.flush();
  assert.equal(h.sources.length, initial.length + 7);
  assert.ok(initial.every(node => node.ended && node.disconnects === 1));
});

test('las voces terminadas liberan sus nodos y pagehide detiene las siguientes', async () => {
  const h = harness();
  h.unlock();
  h.audio.play('hit');
  await h.flush();
  const initial = [...h.sources];
  assert.equal(initial.length, 3);
  h.contexts[0].finishVoices();
  assert.ok(initial.every(node => node.disconnects === 1 && node.connections[0].disconnects === 1));
  h.contexts[0].currentTime += 2;
  h.audio.play('pause');
  await h.flush();
  for (const callback of h.hostListeners.get('pagehide')) callback();
  assert.ok(h.sources.every(node => node.ended && node.disconnects === 1));
  assert.ok(initial.every(node => node.stops.length === 1), 'las voces terminadas dejan el registro activo');
});

test('los catorce efectos generan notas finitas y liberan sus recursos', async () => {
  for (const kind of ['hit', 'critical', 'equip', 'pause', 'vulnerable', 'fury', 'impulse', 'mission', 'reward', 'loot', 'clear', 'cycle', 'level', 'stage']) {
    const h = harness();
    h.unlock();
    assert.equal(h.audio.play(kind), true, kind);
    await h.flush();
    assert.ok(h.sources.length >= 2, kind);
    for (const source of h.sources) {
      assert.ok(Number.isFinite(source.starts[0]), kind);
      assert.ok(source.stops[0] > source.starts[0], kind);
      for (const event of [...source.frequency.events, ...source.connections[0].gain.events]) {
        assert.ok(Number.isFinite(event.value) && event.value > 0, kind);
        assert.ok(Number.isFinite(event.at), kind);
      }
      if (source.kind === 'noise') assert.ok(source.buffer.getChannelData(0).every(value => value >= -1 && value <= 1));
    }
    h.contexts[0].finishVoices();
    assert.ok(h.sources.every(source => source.disconnects === 1 && source.connections[0].disconnects === 1), kind);
  }
});

test('los volúmenes se multiplican y se normalizan sin ganancias inválidas', () => {
  const h = harness();
  h.config.masterVolume = 50;
  h.config.game.soundVolume = 20;
  h.unlock();
  const output = h.contexts[0].nodes[0];
  assert.equal(output.gain.events.at(-1).value, .1);
  h.config.masterVolume = 200;
  h.config.game.soundVolume = 300;
  h.audio.sync();
  assert.equal(output.gain.events.at(-1).value, 1);
  h.config.masterVolume = 'invalid';
  h.config.game.soundVolume = 'invalid';
  h.audio.sync();
  assert.equal(output.gain.events.at(-1).value, .4);
  h.config.masterVolume = -10;
  h.audio.sync();
  assert.equal(output.gain.events.at(-1).value, 0);
});

test('cambiar la fecha antes de finalizar el lote descarta el sonido de la fecha anterior', async () => {
  const h = harness();
  let selectedDay = 'today';
  h.unlock();
  h.audio.play('clear', { allowed: () => selectedDay === 'today' });
  selectedDay = 'yesterday';
  h.audio.sync();
  await h.flush();
  assert.equal(h.sources.length, 0);
  selectedDay = 'today';
  await h.flush();
  assert.equal(h.sources.length, 0, 'volver a la fecha no recupera celebraciones descartadas');
});

test('cambiar la fecha durante una fanfarria detiene voces activas', async () => {
  const h = harness();
  let allowed = true;
  h.unlock();
  h.audio.play('clear', { allowed: () => allowed });
  await h.flush();
  assert.equal(h.sources.length, 6);
  allowed = false;
  h.audio.sync();
  assert.ok(h.sources.every(source => source.ended && source.disconnects === 1));
  allowed = true;
  h.audio.sync();
  await h.flush();
  assert.equal(h.sources.length, 6);
});

test('cambiar la fecha mientras resume espera impide una celebración tardía', async () => {
  const h = harness({ resumeMode: 'defer' });
  let allowed = true;
  h.unlock();
  h.audio.play('clear', { allowed: () => allowed });
  const flushed = h.beginFlush();
  allowed = false;
  h.contexts[0].resolvers.forEach(resolve => resolve());
  await flushed;
  assert.equal(h.sources.length, 0);
});
