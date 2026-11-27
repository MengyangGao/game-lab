// Smoke-test the application controller with lightweight host stubs.
// Actual DOM, keyboard, touch and offline behavior are covered by browser.py.
const handlers = new Map();
const values = new Map();
const nodes = new Map();
const active = () => ({focus() {}, animate() {}});
const node = id => {
  if (!nodes.has(id)) nodes.set(id, {
    dataset: {}, focus() {}, querySelector: active,
    addEventListener: (name, callback) => handlers.set(`${id}:${name}`, callback)
  });
  return nodes.get(id);
};
const app = node('#app');

Object.defineProperties(globalThis, {
  navigator: {value: {}, configurable: true},
  document: {value: {...node('document'), documentElement: {dataset: {}}, querySelector: node}},
  location: {value: {hash: ''}},
  localStorage: {value: {
    getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value)
  }},
  crypto: {value: {getRandomValues: () => [123456]}, configurable: true},
  matchMedia: {value: () => ({matches: true})}
});

if (!globalThis.window) globalThis.window = node('window');
else globalThis.window.addEventListener = node('window').addEventListener;

await import('../public/app.js');

function check(success, context) {
  if (!success) throw new Error(context);
}

const click = dataset => handlers.get('#app:click')({target: {closest: selector => selector === 'button' ? {dataset} : null}});
const command = name => click({command: name});
const route = hash => {
  location.hash = hash;
  handlers.get('window:hashchange')();
};

check((app.innerHTML.match(/<article /g) ?? []).length === 8, 'home renders all eight games');
for (const id of ['mirror', 'flood', 'relay', 'crate', 'echo', 'voxel', 'mosaic', 'circuit']) {
  route(`#${id}/1`);
  check(app.innerHTML.includes('0</strong> 步'), `initial view: ${id}`);
  command('hint');
  check(app.innerHTML.includes('标出位置'), `strategy: ${id}`);
  command('hint');
  check(app.innerHTML.includes('marked'), `highlight: ${id}`);
  command('hint');
  check(app.innerHTML.includes('1</strong> 步'), `execute: ${id}`);
  route('#');
  route(`#${id}/1`);
  check(app.innerHTML.includes('1</strong> 步'), `resume: ${id}`);
  command('undo');
  for (let i = 0; i < 16 && !app.innerHTML.includes('挑战成功'); i++) {
    command('hint');
    command('hint');
    command('hint');
  }
  check(app.innerHTML.includes('挑战成功'), `complete: ${id}`);
  command('reset');
  check(app.innerHTML.includes('0</strong> 步'), `reset: ${id}`);
  check(app.innerHTML.includes('已完成'), `best persisted: ${id}`);
}

route('#mosaic/1');
click({piece: '0'});
click({turn: ''});
check(app.innerHTML.includes('1</strong> 步'), 'direct rotation');
click({piece: '1'});
check(app.innerHTML.includes('2</strong> 步'), 'direct swap');

route('#echo/random/2/42');
check(app.innerHTML.includes('随机关卡'), 'shareable random route');
check(JSON.parse(values.get('game-lab.v1')).last === '#echo/random/2/42', 'save records random route');
console.log('PASS application routing, rendering, hints, progression and local persistence');

const {readSave} = await import('../public/storage.js');
values.delete('game-lab.v1');
values.set('puzzle-lab.v1', JSON.stringify({
  version: 1,
  best: {'flood/1': 2, 'echo/2': 5, 'mirror/1': 2},
  sessions: {
    'flood/1': {identity: '1', history: [{region: 1, color: 0}]},
    'echo/2': {identity: '2', history: [{p: 1, shadow: 0, queue: ['right']}]},
    'mirror/1': {identity: '1', history: [3]}
  },
  preferences: {motion: true}
}));
const migrated = readSave();
check(migrated.best['mirror/1'] === 2 && migrated.sessions['mirror/1'].history[0] === 3, 'unchanged games keep progress');
check(!migrated.sessions['flood/1'] && !migrated.sessions['echo/2'], 'obsolete rule sessions are discarded');
check(migrated.preferences.motion, 'motion preference kept on upgrade');
