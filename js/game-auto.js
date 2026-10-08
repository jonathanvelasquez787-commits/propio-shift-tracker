const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

// Call cadence is presentation data; time never generates attacks or account progress.
export function createAutoBattle() {
  let elapsed = 0, calls = 0;
  function reset() { elapsed = 0; calls = 0; }
  function snapshot() { return { elapsed, calls, remainder: calls % 3, x: .19 + Math.sin(elapsed * 1.6) * .005, jump: 0 }; }
  function recordCall(count = 1) {
    const previous = Math.floor(calls / 3);
    calls += Math.floor(clamp(count, 1, 1e9));
    return Math.floor(calls / 3) - previous;
  }
  function step(seconds) { elapsed += clamp(seconds, 0, .05); return []; }
  return { snapshot, reset, step, recordCall };
}
