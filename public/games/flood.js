import {bit, indices, neighbors, choose, campaign} from './common.js';

const adjacency = new Map();
const neighborsOf = n => {
  if (!adjacency.has(n)) adjacency.set(n, indices(n * n).map(i => neighbors(i, n)));
  return adjacency.get(n);
};

export function regionAt(level, state, start) {
  const adjacent = neighborsOf(level.n);
  let region = bit(start);
  let frontier = region;
  while (frontier) {
    const flag = frontier & -frontier;
    frontier ^= flag;
    for (const i of adjacent[31 - Math.clz32(flag)]) {
      if ((region & bit(i)) || state[i] !== state[start]) continue;
      region |= bit(i);
      frontier |= bit(i);
    }
  }
  return region;
}

export const won = (level, state) => state.split('').every(color => Number(color) === level.target);

function components(level, state) {
  const adjacent = neighborsOf(level.n);
  const result = [];
  let remaining = bit(state.length) - 1;
  while (remaining) {
    const start = 31 - Math.clz32(remaining & -remaining);
    const mask = regionAt(level, state, start);
    remaining &= ~mask;
    const borders = new Set();
    for (let cells = mask; cells; cells &= cells - 1) {
      for (const next of adjacent[31 - Math.clz32(cells & -cells)]) {
        if (!(mask & bit(next))) borders.add(Number(state[next]));
      }
    }
    result.push({start, mask, borders});
  }
  return result;
}

export const actions = (level, state) => components(level, state).flatMap(({start}) =>
  indices(level.colors).filter(color => state[start] !== String(color)).map(color => ({type: 'paint', i: start, color})));

function repaint(state, mask, color) {
  const tiles = state.split('');
  for (let cells = mask; cells; cells &= cells - 1) tiles[31 - Math.clz32(cells & -cells)] = String(color);
  return tiles.join('');
}

export function reduce(level, state, action) {
  const {i, color} = action ?? {};
  if (action?.type !== 'paint' || !Number.isInteger(i) || i < 0 || i >= state.length ||
      !Number.isInteger(color) || color < 0 || color >= level.colors || state[i] === String(color)) return state;
  return repaint(state, regionAt(level, state, i), color);
}

export function solve(level, state) {
  if (won(level, state)) return [];
  const target = String(level.target);
  const path = [];
  const failed = new Map();
  function search(board, remaining) {
    const colors = new Set(board);
    colors.delete(target);
    if (!colors.size) return true;
    if (colors.size > remaining || (failed.get(board) ?? -1) >= remaining) return false;
    const regions = components(level, board);
    if (regions.length === 1) {
      path.push({type: 'paint', i: 0, color: level.target});
      return true;
    }
    for (const {start, mask, borders} of regions) {
      for (const color of borders) {
        path.push({type: 'paint', i: start, color});
        if (search(repaint(board, mask, color), remaining - 1)) return true;
        path.pop();
      }
    }
    failed.set(board, remaining);
    return false;
  }
  for (let limit = 1; limit <= state.length; limit++) {
    if (search(state, limit)) return path;
  }
  return null;
}

export const coverage = (level, state) => [state.split('').filter(tile => Number(tile) === level.target).length, state.length];

function candidate(rand, difficulty) {
  const n = difficulty === 0 ? 3 : 4;
  const colors = difficulty === 0 ? 3 : 4;
  const target = rand(colors);
  const initial = indices(n * n).map(() => rand(colors)).join('');
  return {n, colors, target, initial};
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[2,3], [4,5], [5,7]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 41, '第一滴颜料'], [0, 76, '早晨的窗'], [0, 94, '相邻色块'],
  [1, 29, '染料分岔'], [1, 71, '纸上潮汐'], [1, 121, '回旋色域'],
  [2, 16, '混色练习'], [2, 163, '暮色拼盘'], [2, 855, '满幅渐染']
]);
