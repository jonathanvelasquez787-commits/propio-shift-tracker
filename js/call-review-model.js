import { compareCallRecords } from './call-records.js';

export function callRecordSource(call) {
  if (call?.manualCorrectionAt) return 'manual-correction';
  if (call?.source === 'live' || call?.propioBridge?.payEstimated || call?.propioBridge?.timingEstimated) return 'estimated';
  if (call?.source === 'import') return call?.officialCorrection?.kind === 'corrected' ? 'official-correction' : 'official';
  if (call?.source === 'manual') return 'manual';
  return 'unknown';
}

export function matchesCallReview(call, search = '', source = 'all') {
  const kind = callRecordSource(call);
  if (search && !String(call?.customerId || '').toLocaleLowerCase().includes(String(search).trim().toLocaleLowerCase())) return false;
  return source === 'all' || source === kind || source === 'corrected' && kind.endsWith('-correction');
}

// Etiqueta de origen de la medicion: 'both' (Propio + Tool), 'propio', 'tool' o null (manual).
export function callRecordTag(call) {
  const { tool, propio } = compareCallRecords(call);
  return tool && propio ? 'both' : propio ? 'propio' : tool ? 'tool' : null;
}

export function isToolOnlyCall(call) {
  const { tool, propio } = compareCallRecords(call);
  return !!tool && !propio;
}

// Pista "posible repetida" (la cuidadosa): solo une una llamada que esta SOLO en la tool con una que esta
// SOLO en Propio (sin medicion de la tool). Inicio a menos de 5 min y duracion a menos de 1 min de diferencia.
// Nunca junta nada: solo devuelve pares para sugerirlos. Cada llamada entra en un solo par.
export const REPEAT_START_LIMIT_MS = 5 * 60000;
export const REPEAT_DURATION_LIMIT_MS = 60000;
export function possibleRepeatPairs(calls) {
  const pairs = [];
  for (const toolCall of calls) {
    const t = compareCallRecords(toolCall);
    if (!t.tool || t.propio) continue;
    for (const propioCall of calls) {
      if (propioCall === toolCall) continue;
      const p = compareCallRecords(propioCall);
      if (!p.propio || p.tool) continue;
      const startDiff = Math.abs(Date.parse(t.tool.startISO) - Date.parse(p.propio.startISO));
      const durationDiff = Math.abs(Number(t.tool.durationMs) - Number(p.propio.durationMin) * 60000);
      if (!Number.isFinite(startDiff) || !Number.isFinite(durationDiff)) continue;
      if (startDiff < REPEAT_START_LIMIT_MS && durationDiff < REPEAT_DURATION_LIMIT_MS) pairs.push({ toolCall, propioCall, startDiff });
    }
  }
  pairs.sort((a, b) => a.startDiff - b.startDiff);
  const usedTool = new Set(), usedPropio = new Set(), result = new Map();
  for (const pair of pairs) {
    if (usedTool.has(pair.toolCall.id) || usedPropio.has(pair.propioCall.id)) continue;
    usedTool.add(pair.toolCall.id); usedPropio.add(pair.propioCall.id);
    result.set(pair.toolCall.id, pair);
  }
  return result;
}
