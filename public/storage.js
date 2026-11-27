const key = 'puzzle-lab.v1';
const defaults = {motion: false, symbols: true};
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);

export function readSave() {
  let stored;
  try { stored = JSON.parse(localStorage.getItem(key)); } catch {}
  if (!isRecord(stored) || stored.version !== 1) stored = {};
  return {
    version: 1,
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
