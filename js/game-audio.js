import { settings } from './app-context.js';

let silentOperations = 0;
export function gameSoundsSilenced() { return silentOperations > 0; }
// Scope only synchronous history updates; queued animations capture their own sound policy.
export function withGameSoundsSilenced(operation) {
  silentOperations++;
  try { return operation(); } finally { silentOperations--; }
}

const note = (frequency, at, duration, gain = .14, wave = 'square', slide = 0) => ({ frequency, at, duration, gain, wave, slide });
const melody = (frequencies, step = .09, wave = 'square') => frequencies.map((frequency, index) => note(frequency, index * step, step * .85, .12, wave));
const CUES = Object.freeze({
  'shoot-pistol': { priority: .5, notes: [note(920, 0, .035, .075, 'square', 190), note(145, .012, .055, .055, 'triangle')], noise: .025 },
  'shoot-smg': { priority: .5, notes: [0, .035, .07].map(at => note(710, at, .022, .055, 'square', 230)), noise: .018 },
  'shoot-shotgun': { priority: .5, notes: [note(165, 0, .11, .09, 'sawtooth', 48), note(340, .008, .055, .045, 'square', 90)], noise: .075 },
  'shoot-rocket': { priority: .5, notes: [note(95, 0, .2, .085, 'sawtooth', 38), note(280, .025, .15, .045, 'triangle', 65)], noise: .12 },
  'shoot-railgun': { priority: .5, notes: [note(2400, 0, .13, .055, 'sine', 350), note(1200, .015, .11, .04, 'triangle', 175)] },
  'shoot-flame': { priority: .5, notes: [note(130, 0, .18, .045, 'sawtooth', 240), note(210, .06, .13, .035, 'sawtooth', 100)], noise: .19, noiseGain: .03 },
  'shoot-too-much': { priority: .5, notes: [480, 240, 720, 120].map((frequency, index) => note(frequency, index * .045, .035, .055, 'square', frequency / 2)), noise: .035 },
  'shoot-drone': { priority: .5, notes: [note(420, 0, .075, .05, 'sine', 620), note(840, .065, .08, .045, 'sine', 1240)] },
  'shoot-psr': { priority: .5, notes: [note(1700, 0, .045, .06, 'square', 280), note(260, .02, .12, .06, 'triangle', 65)], noise: .02 },
  'shoot-wand': { priority: .5, notes: [note(660, 0, .075, .055, 'sine', 1320), note(990, .065, .095, .045, 'triangle', 1980)] },
  'shoot-grenade': { priority: .5, notes: [note(390, 0, .07, .045, 'triangle', 90), note(85, .07, .11, .085, 'sine', 35)], noise: .065 },
  hit: { priority: 1, notes: [note(660, 0, .07, .16, 'square', 165), note(220, .02, .09, .13, 'triangle')], noise: .045 },
  critical: { priority: 3, notes: [note(1047, 0, .12, .13, 'triangle', 523), ...melody([1047, 1319, 1568], .055)], noise: .035 },
  equip: { priority: 2, notes: melody([392, 784], .065, 'triangle') },
  pause: { priority: 3, notes: melody([523, 659, 784], .08, 'triangle') },
  vulnerable: { priority: 4, notes: melody([784, 392, 1047], .075), noise: .035 },
  fury: { priority: 4, notes: melody([175, 196, 233, 349], .07, 'sawtooth') },
  impulse: { priority: 5, notes: melody([523, 784, 880, 1047], .065) },
  mission: { priority: 6, notes: [note(880, 0, .09, .11, 'square', 220), ...melody([659, 784, 1047], .075).map(n => ({ ...n, at: n.at + .07 }))], noise: .065 },
  reward: { priority: 7, notes: melody([659, 784, 1047], .1, 'triangle') },
  loot: { priority: 8, notes: [...melody([784, 1047, 1319], .075, 'triangle'), note(1568, .225, .22, .13, 'square')] },
  clear: { priority: 9, notes: [...melody([523, 659, 784, 1047], .105), note(784, .42, .29, .09, 'triangle'), note(1047, .42, .32, .13)] },
  cycle: { priority: 10, notes: [...melody([392, 523, 659, 784, 1047], .105), note(659, .525, .3, .09, 'triangle'), note(1047, .525, .3, .13)] },
  level: { priority: 11, notes: [...melody([392, 494, 587, 784, 988, 1175], .08), note(1568, .48, .3, .13), note(784, .48, .3, .08, 'triangle')] },
  stage: { priority: 12, notes: [...melody([523, 784, 1047, 1319, 1175], .12), note(1047, .6, .4, .13), note(659, .6, .4, .08, 'triangle')] },
});

function fraction(value, fallback) {
  return (Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : fallback) / 100;
}

export function createGameAudio({ readSettings, host = globalThis, doc = host.document, channel = 'game' } = {}) {
  let context = null, output = null, initialized = false, unlocked = false;
  let pending = null, timer = null, generation = 0, activePriority = 0, activeUntil = 0;
  let activeAllowed = () => true;
  const voices = new Map();
  const volume = () => {
    const config = readSettings?.() || {};
    const enabled = channel === 'personal' ? config.reinforcement?.enabled === true : config.game?.enabled === true;
    return enabled && config.game?.soundEnabled !== false && !doc?.hidden
      ? fraction(config.masterVolume, 100) * fraction(config.game?.soundVolume, 40) : 0;
  };
  function stopVoices() {
    for (const [voice, cleanup] of [...voices]) {
      try { voice.stop(); } catch {}
      cleanup();
    }
  }
  function stop() {
    generation++;
    if (timer != null) host.clearTimeout(timer);
    timer = null;
    pending = null;
    stopVoices();
    activePriority = 0;
    activeUntil = 0;
    activeAllowed = () => true;
  }
  function sync() {
    const gain = volume();
    if (!gain || !activeAllowed() || (pending && !pending.allowed())) stop();
    if (output && context) output.gain.setTargetAtTime(gain, context.currentTime, .012);
  }
  function unlock(event) {
    if (event?.isTrusted !== true || doc?.hidden) return;
    if (event?.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey)) return;
    if (!volume()) return;
    try {
      if (!context) {
        const Constructor = host.AudioContext || host.webkitAudioContext;
        if (!Constructor) return;
        context = new Constructor();
        output = context.createGain();
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3400;
        output.connect(filter).connect(context.destination);
      }
      unlocked = true;
      sync();
      context.resume?.()?.catch?.(() => {});
    } catch { unlocked = false; }
  }
  function init({ unlockOnGesture = true } = {}) {
    if (initialized || !doc?.addEventListener) return;
    initialized = true;
    if (unlockOnGesture) for (const event of ['pointerdown', 'keydown', 'click']) doc.addEventListener(event, unlock, true);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) stop(); });
    host.addEventListener?.('pagehide', stop);
  }
  function connectVoice(source, envelope, at, duration, gain) {
    const level = Math.max(.0001, gain);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(level, at + .004);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(envelope).connect(output);
    let disconnected = false;
    const cleanup = () => {
      if (disconnected) return;
      disconnected = true;
      voices.delete(source);
      source.disconnect();
      envelope.disconnect();
    };
    voices.set(source, cleanup);
    source.onended = cleanup;
    source.start(at);
    source.stop(at + duration + .01);
  }
  function synthesize(cue, allowed) {
    stopVoices();
    activeAllowed = allowed;
    sync();
    const start = context.currentTime + .008;
    activePriority = cue.priority;
    activeUntil = start + Math.max(cue.noise || 0, ...cue.notes.map(n => n.at + n.duration)) + .08;
    for (const n of cue.notes) {
      const oscillator = context.createOscillator();
      oscillator.type = n.wave;
      oscillator.frequency.setValueAtTime(n.frequency, start + n.at);
      if (n.slide) oscillator.frequency.exponentialRampToValueAtTime(n.slide, start + n.at + n.duration);
      connectVoice(oscillator, context.createGain(), start + n.at, n.duration, n.gain);
    }
    if (cue.noise) {
      const duration = cue.noise;
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index++) channel[index] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      connectVoice(source, context.createGain(), start, duration, cue.noiseGain ?? .045);
    }
  }
  async function flush() {
    timer = null;
    const item = pending;
    pending = null;
    const ticket = generation;
    if (!item || !unlocked || !context || !volume()) return;
    try {
      const { cue, allowed } = item;
      if (!allowed()) return;
      if (context.state !== 'running') await context.resume();
      if (ticket !== generation || context.state !== 'running' || !volume() || !allowed()) return;
      if (context.currentTime < activeUntil && cue.priority <= activePriority) return;
      synthesize(cue, allowed);
    } catch {}
  }
  function play(kind = 'hit', { allowed = () => true } = {}) {
    if (gameSoundsSilenced()) return false;
    const cue = CUES[kind];
    if (!cue || !unlocked || !context || !volume()) return false;
    // Una importación puede generar muchos eventos; se oye solo el más significativo.
    if (pending && !pending.allowed()) pending = null;
    if (!pending || cue.priority > pending.cue.priority) pending = { cue, allowed };
    if (timer == null) timer = host.setTimeout(flush, 45);
    return true;
  }
  return { init, play, stop, sync, unlock };
}

export function createGameAudioPreview({ readSettings = () => settings, ...environment } = {}) {
  const audio = createGameAudio({ ...environment, readSettings: () => {
    const config = readSettings() || {};
    return { ...config, game: { ...config.game, enabled: true, soundEnabled: true } };
  } });
  return {
    play(kind, event) {
      if (event?.isTrusted !== true) return false;
      audio.init({ unlockOnGesture: false });
      audio.unlock(event);
      return audio.play(kind);
    },
    stop: audio.stop,
    sync: audio.sync,
  };
}

const gameAudio = createGameAudio({ readSettings: () => settings });
const personalAudio = createGameAudio({ readSettings: () => settings, channel: 'personal' });
const gameAudioPreview = createGameAudioPreview();
export function initGameAudio() { gameAudio.init(); personalAudio.init(); }
export function playGameSound(kind, { channel = 'game', ...options } = {}) { return (channel === 'personal' ? personalAudio : gameAudio).play(kind, options); }
export function previewGameSound(kind, event) { return gameAudioPreview.play(kind, event); }
export function syncGameAudio() { gameAudio.sync(); personalAudio.sync(); gameAudioPreview.sync(); }
export function stopGameSounds() { gameAudio.stop(); personalAudio.stop(); gameAudioPreview.stop(); }
