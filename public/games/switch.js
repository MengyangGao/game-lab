import {bit, indices, neighbors, choose, campaign} from './common.js';

const tables = new Map();

export function masks(n) {
  return indices(n * n).map(i => neighbors(i, n).reduce((mask, j) => mask | bit(j), bit(i)));
}

function table(n) {
  if (tables.has(n)) return tables.get(n);
  const flips = masks(n);
  const previous = new Int8Array(bit(n * n)).fill(-1);
  const queue = [0];
  previous[0] = -2;
  for (let index = 0; index < queue.length; index++) {
    const state = queue[index];
    flips.forEach((mask, i) => {
      const next = state ^ mask;
      if (previous[next] !== -1) return;
      previous[next] = i;
      queue.push(next);
    });
  }
  const result = {previous, flips};
  tables.set(n, result);
  return result;
}

export const won = (_, state) => state === 0;
export const actions = level => indices(level.n * level.n).map(i => ({type: 'toggle', i}));

export function reduce(level, state, action) {
  const i = action?.i;
  return action?.type === 'toggle' && Number.isInteger(i) && i >= 0 && i < level.n * level.n
    ? state ^ table(level.n).flips[i] : state;
}

export function solve(level, state) {
  const {previous, flips} = table(level.n);
  if (!Number.isInteger(state) || state < 0 || state >= previous.length || previous[state] === -1) return null;
  const result = [];
  for (let current = state; current;) {
    const i = previous[current];
    result.push({type: 'toggle', i});
    current ^= flips[i];
  }
  return result;
}

function candidate(rand, difficulty) {
  const n = difficulty === 0 ? 3 : 4;
  const flips = table(n).flips;
  const remaining = indices(n * n);
  let initial = 0;
  for (let m = 0; m < 2 + difficulty * 2; m++) {
    const [i] = remaining.splice(rand(remaining.length), 1);
    initial ^= flips[i];
  }
  return {n, initial};
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[2,2], [3,4], [5,6]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 9, '熄灯之前'], [0, 43, '十字联动'], [0, 317, '边角余光'],
  [1, 15, '四乘四'], [1, 55, '灯阵交叠'], [1, 721, '静默回路'],
  [2, 15, '逆向推演'], [2, 103, '交错脉冲'], [2, 917, '长夜']
]);
