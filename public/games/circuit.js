import {bit, indices, popcount, choose, campaign} from './common.js';

const point = (n, i) => [i % n, Math.floor(i / n)];

export function network(level, state) {
  const active = [level.source, ...level.sockets.filter((_, i) => state & bit(i)), ...level.targets];
  const neighbors = active.map(() => []);
  const edges = [];
  for (let i = 0; i < active.length; i++) {
    const [x, y] = point(level.n, active[i]);
    for (let j = i + 1; j < active.length; j++) {
      const [u, v] = point(level.n, active[j]);
      if ((x - u) ** 2 + (y - v) ** 2 > level.reach ** 2) continue;
      neighbors[i].push(j);
      neighbors[j].push(i);
      edges.push([active[i], active[j]]);
    }
  }
  const powered = new Set([0]);
  for (const i of powered) for (const j of neighbors[i]) powered.add(j);
  const lit = new Set([...powered].map(i => active[i]));
  return {lit, edges: edges.filter(([a, b]) => lit.has(a) && lit.has(b))};
}

export const won = (level, state) => {
  const {lit} = network(level, state);
  return level.targets.every(i => lit.has(i));
};

export const actions = (level, state) => indices(level.sockets.length)
  .filter(i => state & bit(i) || popcount(state) < level.capacity)
  .map(i => ({type: 'relay', i}));

export function reduce(level, state, action) {
  const {i} = action ?? {};
  if (action?.type !== 'relay' || !Number.isInteger(i) || i < 0 || i >= level.sockets.length) return state;
  const next = state ^ bit(i);
  return popcount(next) <= level.capacity ? next : state;
}

export function solve(level, state) {
  let best = null;
  let distance = Infinity;
  for (let goal = 0; goal < bit(level.sockets.length); goal++) {
    const changes = goal ^ state;
    const moves = popcount(changes);
    if (moves >= distance || popcount(goal) > level.capacity || !won(level, goal)) continue;
    distance = moves;
    best = indices(level.sockets.length).filter(i => changes & bit(i))
      .sort((a, b) => Number(Boolean(state & bit(b))) - Number(Boolean(state & bit(a))))
      .map(i => ({type: 'relay', i}));
  }
  return best;
}

function candidate(rand, tier) {
  const n = 7;
  const source = 3 * n;
  const targets = tier === 0 ? [3 * n + 6] : [n + 6, 5 * n + 6];
  const available = indices(n * n).filter(i => !targets.includes(i) && i !== source);
  const sockets = Array.from({length: 8 + tier}, () => available.splice(rand(available.length), 1)[0]);
  return {n, source, targets, sockets, reach: 2.35, capacity: 3 + tier, initial: 0};
}

export const generate = (seed, tier) => choose(seed, tier, [[2,3],[3,4],[4,5]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 12, '葛藤之间'], [0, 68, '断开的潮线'], [0, 219, '风化的石台'],
  [1, 3, '两座灯标'], [1, 81, '风口'], [1, 267, '双向通路'],
  [2, 14, '远雷'], [2, 157, '分流'], [2, 662, '雨停之前']
]);
