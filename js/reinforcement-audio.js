import { settings } from './app-context.js';
import { reinforcementFeedbackSilenced } from './call-feedback.js';

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
  pause: { priority: 3, notes: melody([523, 659, 784], .08, 'triangle') },
  impulse: { priority: 5, notes: melody([523, 784, 880, 1047], .065) },
});

function fraction(value, fallback) {
  return (Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : fallback) / 100;
}

export function createGameAudio({ readSettings, host = globalThis, doc = host.document } = {}) {
  let context = null, output = null, initialized = false, unlocked = false;
  let pending = null, timer = null, generation = 0, activePriority = 0, activeUntil = 0;
  let activeAllowed = () => true;
  const voices = new Map();
  const volume = () => {
    const config = readSettings?.() || {};
    const enabled = config.reinforcement?.enabled === true;
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
    if (gameSoundsSilenced() || reinforcementFeedbackSilenced()) return false;
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

const reinforcementAudio = createGameAudio({ readSettings: () => settings });
export function initGameAudio() { reinforcementAudio.init(); }
export function playGameSound(kind, options = {}) { return reinforcementAudio.play(kind, options); }
export function syncGameAudio() { reinforcementAudio.sync(); }
export function stopGameSounds() { reinforcementAudio.stop(); }
