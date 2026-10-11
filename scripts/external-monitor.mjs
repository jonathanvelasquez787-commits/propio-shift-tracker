import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { confirmedObservation, monitorTransition } from '../lib/external-monitor.js';

export async function runMonitor(statePath) {
  if (!statePath || !path.isAbsolute(statePath)) throw new Error('ABSOLUTE_STATE_PATH_REQUIRED');
  let previous = null;
  try { previous = JSON.parse(await fs.readFile(statePath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('MONITOR_STATE_UNREADABLE'); }
  const observation = await confirmedObservation();
  const { alert, state } = monitorTransition(previous, observation, new Date().toISOString());
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const temporary = `${statePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
  await fs.rename(temporary, statePath);
  return { alert, ...observation, checkedAt: state.checkedAt };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runMonitor(process.argv[2]))); }
  catch { console.error('External monitor could not complete; state or runtime requires attention.'); process.exitCode = 1; }
}
