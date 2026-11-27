import {bit, indices, choose, campaign, popcount} from './common.js';

const dr = [0, 1, 0, -1];
const dc = [1, 0, -1, 0];
const slash = [3, 2, 1, 0];
const backslash = [1, 0, 3, 2];

export function trace(level, state) {
  const {n, source, target, mirrors, walls, sensors} = level;
  let [row, column, direction] = source;
  const path = [[row, column]];
  const seen = new Set();
  const lit = new Set();
  while (true) {
    row += dr[direction];
    column += dc[direction];
    path.push([row, column]);
    if (row < 0 || row >= n || column < 0 || column >= n) break;
    const i = row * n + column;
    const key = 4 * i + direction;
    if (seen.has(key) || walls.includes(i)) break;
    seen.add(key);
    if (sensors.includes(i)) lit.add(i);
    if (i === target) return {path, lit, won: lit.size === sensors.length};
    const mirror = mirrors.indexOf(i);
    if (mirror !== -1) direction = (state & bit(mirror) ? backslash : slash)[direction];
  }
  return {path, lit, won: false};
}

export function actions(level) {
  return level.mirrors.map((_, i) => ({type: 'rotate', i}));
}

export function reduce(level, state, action) {
  const i = action?.i;
  return action?.type === 'rotate' && Number.isInteger(i) && i >= 0 && i < level.mirrors.length
    ? state ^ bit(i) : state;
}

export function solve(level, state) {
  let best = null;
  let distance = Infinity;
  for (let layout = 0; layout < bit(level.mirrors.length); layout++) {
    const difference = state ^ layout;
    const moves = popcount(difference);
    if (moves >= distance || !trace(level, layout).won) continue;
    distance = moves;
    best = actions(level).filter(action => difference & bit(action.i));
  }
  return best;
}

function candidate(rand, difficulty) {
  const n = 5 + difficulty;
  const occupied = new Set();
  const route = [];
  const mirrors = [];
  let solution = 0;
  const start = rand(n);
  let row = start;
  let column = -1;
  let direction = 0;
  for (let turn = 0; turn <= 2 + difficulty; turn++) {
    const segment = [];
    for (let step = 1; step < n + 1; step++) {
      const r = row + step * dr[direction];
      const c = column + step * dc[direction];
      const i = r * n + c;
      if (r < 0 || r >= n || c < 0 || c >= n || occupied.has(i)) break;
      segment.push(i);
    }
    if (!segment.length) return null;
    const length = 1 + rand(segment.length);
    for (const i of segment.slice(0, length)) {
      occupied.add(i);
      route.push(i);
    }
    const end = route.at(-1);
    row = Math.floor(end / n);
    column = end % n;
    if (turn === 2 + difficulty) break;
    mirrors.push(end);
    const orientation = rand(2);
    if (orientation) solution |= bit(turn);
    direction = (orientation ? backslash : slash)[direction];
  }
  const target = route.at(-1);
  const sensorOptions = route.slice(0, -1).filter(i => !mirrors.includes(i));
  if (sensorOptions.length < difficulty) return null;
  const sensors = Array.from({length: difficulty}, () => sensorOptions.splice(rand(sensorOptions.length), 1)[0]);
  const empty = indices(n * n).filter(i => !occupied.has(i));
  const take = () => empty.splice(rand(empty.length), 1)[0];
  for (let i = 0; i < difficulty + 1; i++) mirrors.push(take());
  const walls = Array.from({length: 2 + difficulty * 2}, take);
  const initial = solution ^ (bit(2 + difficulty) - 1);
  return {n, source: [start, -1, 0], target, mirrors, walls, sensors, initial};
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[2,2], [3,3], [4,4]], candidate, solve);
export const won = (level, state) => trace(level, state).won;
export const levels = () => campaign({generate}, [
  [0, 24, '初次折射'], [0, 86, '窗边微光'], [0, 298, '折返廊道'],
  [1, 12, '唤醒感光器'], [1, 73, '侧光'], [1, 682, '石阵间隙'],
  [2, 6, '双重校准'], [2, 183, '光路回旋'], [2, 817, '暗室传输']
]);
