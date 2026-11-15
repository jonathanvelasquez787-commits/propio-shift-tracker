import { settings } from './app-context.js';

// Cada operación "discreta" abre un marco con lo que SÍ se permite dentro de ella.
// Sin marco = todo normal. Importar historial = todo en silencio. Llamadas de la extensión = según los
// interruptores de Refuerzo positivo (celebrar / cierre breve), apagados por defecto.
const frames = [];

function run(frame, operation) {
  frames.push(frame);
  try { return operation(); } finally { frames.pop(); }
}

export function callFeedbackSilenced() { return frames.length > 0; }
export function reinforcementFeedbackSilenced() { const frame = frames.at(-1); return Boolean(frame) && frame.celebrate !== true; }
export function reflectionPromptSilenced() { const frame = frames.at(-1); return Boolean(frame) && frame.ask !== true; }

export function withSilentCallFeedback(operation) {
  return run({ celebrate: false, ask: false }, operation);
}

export function withBridgeCallFeedback(operation) {
  const reinforcement = settings?.reinforcement || {};
  return run({ celebrate: reinforcement.celebrateBridgeCalls === true, ask: reinforcement.askAfterBridgeCall === true }, operation);
}
