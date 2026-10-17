const KEY = 'work-tabs-protection';
const ORIGINS = ['https://interpreters.propio-ls.com', 'https://propio-shift-tracker.vercel.app', 'https://app.useinterpreter.com'];
const isWorkTab = tab => {
  try { return !tab.incognito && ORIGINS.includes(new URL(tab.url).origin); } catch { return false; }
};

export function installBackgroundTabs(api, refresh) {
  let serial = Promise.resolve(), checking = null;
  const enqueue = operation => {
    const next = serial.then(operation);
    serial = next.catch(() => {});
    return next;
  };
  async function reconcile() {
    const owned = { ...(await api.storage.session.get(KEY))[KEY] };
    const tabs = await api.tabs.query({ url: ORIGINS.map(origin => `${origin}/*`) });
    for (const tab of tabs.filter(isWorkTab)) {
      if (!Number.isInteger(tab.id) || tab.id < 0 || tab.autoDiscardable === false) continue;
      // Record ownership before changing the flag so a restarted worker can restore it.
      owned[tab.id] = true;
      await api.storage.session.set({ [KEY]: owned });
      try { await api.tabs.update(tab.id, { autoDiscardable: false }); } catch { /* Retry on the next check. */ }
    }
    for (const id of Object.keys(owned)) {
      let tab;
      try {
        tab = await api.tabs.get(Number(id));
      } catch { /* Closed tabs need no restoration. */ }
      if (isWorkTab(tab)) continue;
      if (tab) {
        try { await api.tabs.update(Number(id), { autoDiscardable: true }); }
        catch { continue; }
      }
      delete owned[id];
    }
    await api.storage.session.set({ [KEY]: owned });
  }
  function check() {
    if (!checking) checking = enqueue(reconcile).then(refresh).finally(() => { checking = null; });
    return checking;
  }
  const schedule = () => { void check().catch(() => {}); };
  api.tabs.onUpdated.addListener((_id, change) => {
    if (change.url || change.status === 'complete' || change.autoDiscardable === true || change.frozen === false || change.discarded === false) schedule();
  });
  api.tabs.onRemoved.addListener(schedule);
  api.runtime.onStartup.addListener(schedule);
  api.runtime.onInstalled.addListener(schedule);
  api.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'work-tabs-maintenance') schedule(); });
  void api.alarms.create('work-tabs-maintenance', { periodInMinutes: 0.5 });
  schedule();
  return { check };
}
