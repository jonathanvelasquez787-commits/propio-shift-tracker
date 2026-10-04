const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
export function battleWorkMode(state = {}) {
  if (state.activeCall) return 'call';
  if (!state.shiftStartedAt || state.shiftEndedAt) return 'off';
  return state.activePause ? 'break' : 'ready';
}
export function canPlayDuel(work) { return work === 'break' || work === 'off'; }

// The duel owns only temporary arcade data; it has no account or reward dependencies.
export function createDuel() {
  let best = 0, serial = 0, nextAttack = 1.2, invulnerable = 0, lastShot = -1;
  let data;
  function reset() {
    data = { status: 'ready', time: 60, elapsed: 0, lives: 3, hp: 100, points: 0, combo: 0, grenade: 0, attacks: [], pattern: 0 };
    nextAttack = 1.2; invulnerable = 0; lastShot = -1;
  }
  reset();
  function finish(status) {
    data.status = status; data.attacks = []; best = Math.max(best, data.points);
  }
  function snapshot() {
    return { ...data, best, attacks: data.attacks.map(attack => ({ ...attack })) };
  }
  function start(work) {
    if (!canPlayDuel(work)) return false;
    reset(); data.status = 'running'; return true;
  }
  function pause() { if (data.status === 'running') data.status = 'paused'; }
  function resume(work) {
    if (!canPlayDuel(work) || data.status !== 'paused') return false;
    data.status = 'running'; return true;
  }
  function shoot(work, { grenade = false, damage = 7, cooldown = .28 } = {}) {
    if (!canPlayDuel(work) || data.status !== 'running') return false;
    if (grenade ? data.grenade > 0 : data.elapsed - lastShot < clamp(cooldown, .16, 1)) return false;
    if (grenade) data.grenade = 8;
    else lastShot = data.elapsed;
    data.combo = Math.min(5, data.combo + 1);
    data.points += (grenade ? 20 : 10) * data.combo;
    data.hp = Math.max(0, data.hp - (grenade ? 24 : clamp(damage, 1, 16)));
    if (data.hp === 0) { data.points += 100 + Math.ceil(data.time); finish('won'); }
    return true;
  }
  function step(seconds, hero = {}, work) {
    if (!canPlayDuel(work)) { pause(); return snapshot(); }
    if (data.status !== 'running') return snapshot();
    const dt = clamp(seconds, 0, .05), x = clamp(hero.x, 0, 1), jump = clamp(hero.jump, 0, 200);
    data.elapsed += dt; data.time = Math.max(0, 60 - data.elapsed);
    data.grenade = Math.max(0, data.grenade - dt); invulnerable = Math.max(0, invulnerable - dt);
    if (data.time === 0) { finish('lost'); return snapshot(); }
    if (data.elapsed >= nextAttack) {
      const kind = ['wave', 'projectile', 'charge'][data.pattern++ % 3];
      data.attacks.push({ id: ++serial, kind, age: 0, warning: .85, target: x, x: 1, resolved: false });
      nextAttack = data.elapsed + Math.max(2.1, 3.2 - data.elapsed / 60);
    }
    for (const attack of data.attacks) {
      const previous = attack.x;
      attack.age += dt;
      if (attack.age <= attack.warning) continue;
      const q = clamp((attack.age - attack.warning) / (attack.kind === 'wave' ? 1.5 : .7), 0, 1);
      attack.x = 1 + ((attack.kind === 'wave' ? -.1 : attack.target) - 1) * q;
      const crossing = attack.kind === 'wave' ? previous >= x - .04 && attack.x <= x + .04 : q === 1 && Math.abs(x - attack.target) < .085;
      if (crossing && !attack.resolved) {
        attack.resolved = true;
        const safe = attack.kind === 'projectile' ? jump > 48 : jump > 26;
        if (!safe && !invulnerable) {
          data.lives--; data.combo = 0; invulnerable = 1.1;
          if (!data.lives) { finish('lost'); break; }
        } else if (safe) data.points += 15;
      }
    }
    data.attacks = data.attacks.filter(attack => attack.age < attack.warning + (attack.kind === 'wave' ? 1.6 : .9));
    return snapshot();
  }
  return { start, pause, resume, shoot, step, snapshot, reset };
}
