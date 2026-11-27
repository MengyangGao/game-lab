import * as mirror from '../public/games/mirror.js';
import * as flood from '../public/games/flood.js';
import * as relay from '../public/games/switch.js';

import * as crate from '../public/games/crate.js';
import * as echo from '../public/games/echo.js';
import * as voxel from '../public/games/voxel.js';
import * as mosaic from '../public/games/mosaic.js';
import * as circuit from '../public/games/circuit.js';
import {extraGames} from '../public/extra-views.js';
import {campaign as snapshot} from '../public/campaign.js';

function test(name, run) {
  const start = Date.now();
  run();
  console.log(`PASS ${name} (${Date.now() - start} ms)`);
}

const assert = {
  ok(value, message = 'Expected truthy value') { if (!value) throw new Error(message); },
  equal(actual, expected) { this.ok(Object.is(actual, expected), `Expected ${expected}, got ${actual}`); },
  deepEqual(actual, expected) { this.equal(JSON.stringify(actual), JSON.stringify(expected)); }
};

const games = [
  ['mirror', mirror, [[2, 2], [3, 3], [4, 4]], 120],
  ['flood', flood, [[2, 3], [4, 5], [5, 7]], 120],
  ['relay', relay, [[2, 2], [3, 4], [5, 6]], 120],
  ['crate', crate, [[3, 5], [6, 8], [9, 13]], 25],
  ['echo', echo, [[3, 5], [6, 8], [9, 13]], 25],
  ['voxel', voxel, [[1, 2], [3, 4], [5, 6]], 25],
  ['mosaic', mosaic, [[3, 5], [6, 9], [10, 14]], 25],
  ['circuit', circuit, [[2,3], [3,4], [4,5]], 25]
];

function verify(engine, level, state, expected) {
  const solution = engine.solve(level, state);
  assert.ok(solution, 'solution exists');
  if (expected !== undefined) assert.equal(solution.length, expected);
  for (let i = 0; i < solution.length; i++) {
    assert.ok(!engine.won(level, state));
    assert.ok(engine.actions(level, state).some(a => (a.type === 'swap' && solution[i].type === 'swap' && a.i === solution[i].j && a.j === solution[i].i) || JSON.stringify(a) === JSON.stringify(solution[i])));
    state = engine.reduce(level, state, solution[i]);
  }
  assert.ok(engine.won(level, state));
  assert.deepEqual(engine.solve(level, state), []);
}

for (const [name, engine, bands, samples] of games) {
  test(`${name}: campaign, deterministic generation, and solution replay`, () => {
    const campaign = engine.levels();
    assert.equal(campaign.length, 9);
    assert.deepEqual(campaign, snapshot[name]);
    const layouts = new Set(campaign.map(({seed, difficulty, par, id, title, ...layout}) => JSON.stringify(layout)));
    assert.equal(layouts.size, 9);
    for (const level of campaign) {
      verify(engine, level, level.initial, level.par);
      if (extraGames[name]) assert.ok(extraGames[name].draw(level, level.initial, false, null, null).includes('class='));
    }
    for (const [tier, [min, max]] of bands.entries()) {
      for (let sample = 0; sample < samples; sample++) {
        const seed = Math.imul(sample, 0x9e3779b1) >>> 0;
        const level = engine.generate(seed, tier);
        assert.ok(level.par >= min && level.par <= max);
        assert.deepEqual(engine.generate(seed, tier), level);
        verify(engine, level, level.initial, level.par);
        const [action] = engine.actions(level, level.initial);
        const advanced = engine.reduce(level, level.initial, action);
        if (name !== 'echo' || engine.solve(level, advanced)) verify(engine, level, advanced);
      }
    }
  });
}

test('mirror requires a live receiver and every sensor', () => {
  const level = {n: 3, source: [1, -1, 0], mirrors: [4], target: 1, sensors: [3], walls: []};
  assert.deepEqual(mirror.trace(level, 0).path, [[1,-1], [1,0], [1,1], [0,1]]);
  assert.equal(mirror.won(level, 0), true);
  assert.equal(mirror.won(level, 1), false);
  assert.equal(mirror.won({...level, sensors: [8]}, 0), false);
  assert.equal(mirror.won({...level, walls: [3]}, 0), false);
  assert.equal(mirror.solve({...level, sensors: [8]}, 0), null);
  assert.equal(mirror.reduce(level, 0, {type: 'rotate', i: 1}), 0);
});

test('flood starts at any region and targets a specified color', () => {
  const level = {n: 2, colors: 3, target: 0};
  const initial = '0120';
  assert.equal(flood.regionAt(level, initial, 0), 1);
  assert.equal(flood.reduce(level, initial, {type: 'paint', i: 2, color: 0}), '0100');
  assert.equal(flood.reduce(level, initial, {type: 'paint', i: 0, color: 9}), initial);
  assert.equal(flood.won(level, '1111'), false);
  verify(flood, level, initial, 2);
});

test('flood optimized search matches unrestricted search on all 2×2 boards', () => {
  const level = {n: 2, colors: 3, target: 0};
  const queue = [{state: '0000', depth: 0}];
  // Use forward search from each input because some merges cannot be reversed.
  for (let i = 0; i < 81; i++) {
    const initial = i.toString(3).padStart(4, '0');
    queue.splice(0, queue.length, {state: initial, depth: 0});
    const seen = new Set([initial]);
    for (let index = 0; index < queue.length; index++) {
      const {state, depth} = queue[index];
      if (flood.won(level, state)) {
        assert.equal(flood.solve(level, initial).length, depth);
        break;
      }
      for (const action of flood.actions(level, state)) {
        const next = flood.reduce(level, state, action);
        if (!seen.has(next)) {
          seen.add(next);
          queue.push({state: next, depth: depth + 1});
        }
      }
    }
  }
});

test('relay has orthogonal neighbors, reversible moves and unreachable states', () => {
  assert.equal(relay.masks(3)[0], 0b1011);
  assert.equal(relay.masks(3)[4], 0b10111010);
  const level = {n: 4};
  const action = {type: 'toggle', i: 0};
  const after = relay.reduce(level, 0, action);
  assert.equal(relay.reduce(level, after, action), 0);
  assert.equal(relay.solve(level, 1), null);
  verify(relay, level, after, 1);
});

test('crate pushes one crate and respects corners and walls', () => {
  const level = {n: 4, walls: [7], exit: 6};
  const state = {p: 4, boxes: [5]};
  const right = {type: 'move', direction: 'right'};
  assert.deepEqual(crate.reduce(level, state, right), {p: 5, boxes: [6]});
  const blocked = {p: 5, boxes: [6]};
  assert.equal(crate.reduce(level, blocked, right), blocked);
  assert.equal(crate.reduce(level, {p: 4, boxes: []}, {type: 'jump'}).p, 4);
});

test('echo replays a fixed tape, stops, and detects collisions', () => {
  const level = {n: 4, walls: [], delay: 2, exit: 3, plate: 1};
  let state = {p: 0, shadow: 0, queue: [], cursor: 0, failed: false};
  const right = {type: 'move', direction: 'right'};
  verify(echo, level, state, 3);
  state = echo.reduce(level, echo.reduce(level, state, right), right);
  assert.equal(state.shadow, 0);
  const collision = echo.reduce(level, state, {type: 'move', direction: 'left'});
  assert.equal(collision.failed, true);
  assert.equal(echo.solve(level, collision), null);
  state = echo.reduce(level, state, right);
  assert.deepEqual(state, {p: 3, shadow: 1, queue: ['right','right'], cursor: 1, failed: false});
  const down = {type: 'move', direction: 'down'};
  state = echo.reduce(level, echo.reduce(level, state, down), down);
  assert.equal(state.shadow, 2);
  assert.equal(state.cursor, 2);
});

test('voxel projections use orthogonal axes and preserve fixed voxels', () => {
  const level = {count: 8, initial: 1, targets: [9, 9, 9]};
  assert.deepEqual(voxel.projection(level, 129), [9, 9, 9]);
  assert.equal(voxel.reduce(level, 1, {type: 'cube', i: 0}), 1);
  verify(voxel, level, 1, 1);
});

test('mosaic separates permutation from rotating tiles', () => {
  const level = {n: 2};
  verify(mosaic, level, [5, 0, 8, 12], 4);
  const restored = [0, 4, 8, 12];
  let state = restored;
  for (let i = 0; i < 4; i++) state = mosaic.reduce(level, state, {type: 'turn', i: 1});
  assert.deepEqual(state, restored);
});

test('relay network requires a powered path and respects inventory', () => {
  const level = {n: 5, source: 0, targets: [4], sockets: [2, 20], reach: 2, capacity: 1};
  const offPath = circuit.reduce(level, 0, {type: 'relay', i: 1});
  assert.equal(circuit.won(level, offPath), false);
  assert.equal(circuit.reduce(level, offPath, {type: 'relay', i: 0}), offPath);
  assert.deepEqual(circuit.solve(level, offPath), [{type: 'relay', i: 1}, {type: 'relay', i: 0}]);
  verify(circuit, level, offPath, 2);
});
