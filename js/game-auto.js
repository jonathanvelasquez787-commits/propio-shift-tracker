const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

// Round health and charge are temporary presentation data, independent of account rewards.
export function createAutoBattle() {
  let elapsed, round, hp, enemyHp, charge, shotAt, counterAt, dodgeAt, victoryUntil;
  function reset() {
    elapsed = 0; round = 1; hp = 100; enemyHp = 72; charge = 100;
    shotAt = .9; counterAt = 3.2; dodgeAt = -10; victoryUntil = 0;
  }
  reset();
  function snapshot() {
    const jump = Math.max(0, Math.sin(clamp((elapsed - dodgeAt) / .9, 0, 1) * Math.PI)) * 55;
    return { round, hp, enemyHp, charge, elapsed, jump, x: .2 + Math.sin(elapsed * 1.4) * .035, status: victoryUntil > elapsed ? 'victory' : 'combat' };
  }
  function damage(amount) {
    enemyHp = Math.max(0, enemyHp - amount);
    if (!enemyHp && victoryUntil <= elapsed) victoryUntil = elapsed + 3;
  }
  function recordCall(count = 1) { charge = Math.min(100, charge + clamp(count, 1, 1e6) * 25); }
  function special() {
    if (charge < 100 || victoryUntil > elapsed) return false;
    charge = 0; damage(35); shotAt = elapsed + 1.2; return true;
  }
  function step(seconds, weapon = 'pistol') {
    const events = [];
    elapsed += clamp(seconds, 0, .05);
    if (victoryUntil) {
      if (elapsed < victoryUntil) return events;
      victoryUntil = 0; round++; hp = 100; enemyHp = 100;
      shotAt = elapsed + .9; counterAt = elapsed + 3.2; events.push('round');
    }
    if (elapsed >= shotAt) {
      damage(['rocket', 'too-much'].includes(weapon) ? 12 : ['railgun', 'shotgun', 'psr'].includes(weapon) ? 10 : 8);
      shotAt = elapsed + (weapon === 'rocket' ? 2.6 : weapon === 'smg' ? 1.6 : 1.9);
      events.push('shot');
    }
    if (enemyHp && elapsed >= counterAt) {
      dodgeAt = elapsed + .35; counterAt = elapsed + 4.5; events.push('counter');
    }
    return events;
  }
  return { snapshot, reset, step, recordCall, special };
}
