const key = 'puzzle-lab.v1';
const rulesRevision = 2;
const defaults = {motion: false, symbols: true};
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);

export function readSave() {
  let stored;
  try { stored = JSON.parse(localStorage.getItem(key)); } catch {}
  if (!isRecord(stored) || stored.version !== 1) stored = {};
  if (stored.rulesRevision !== rulesRevision) {
    for (const field of ['best', 'sessions']) {
      if (!isRecord(stored[field])) continue;
      for (const slot of Object.keys(stored[field])) {
        if (/^(flood|echo)\//.test(slot)) delete stored[field][slot];
      }
    }
  }
  return {
    version: 1,
    rulesRevision,
    best: isRecord(stored.best) ? stored.best : {},
    sessions: isRecord(stored.sessions) ? stored.sessions : {},
    preferences: Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => [
      name, typeof stored.preferences?.[name] === 'boolean' ? stored.preferences[name] : fallback
    ])),
    last: typeof stored.last === 'string' ? stored.last : ''
  };
}

export function writeSave(data) {
  try { localStorage.setItem(key, JSON.stringify(data)); return true; }
  catch { return false; }
}
