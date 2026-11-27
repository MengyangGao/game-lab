import {bit, indices, neighbors, choose, campaign, popcount} from './common.js';

export function expand(level, region, color) {
  let boundary = region;
  while (boundary) {
    const flag = boundary & -boundary;
    boundary ^= flag;
    for (const j of neighbors(31 - Math.clz32(flag), level.n)) {
      const next = bit(j);
      if ((region & next) || level.tiles[j] !== color) continue;
      region |= next;
      boundary |= next;
    }
  }
  return region;
}

export const won = (level, state) => state.region === bit(level.tiles.length) - 1;
export const actions = (level, state) => indices(level.colors)
  .filter(color => color !== state.color)
  .map(color => ({type: 'paint', color}));

export function reduce(level, state, action) {
  const color = action?.color;
  if (action?.type !== 'paint' || !Number.isInteger(color) || color < 0 || color >= level.colors || color === state.color) return state;
  return {region: expand(level, state.region, color), color};
}

export function solve(level, state) {
  if (won(level, state)) return [];
  const queue = [{region: state.region, path: []}];
  const seen = new Set([state.region]);
  for (let index = 0; index < queue.length; index++) {
    const {region, path} = queue[index];
    for (const color of indices(level.colors)) {
      const next = expand(level, region, color);
      if (seen.has(next)) continue;
      const nextPath = [...path, {type: 'paint', color}];
      if (won(level, {region: next})) return nextPath;
      seen.add(next);
      queue.push({region: next, path: nextPath});
    }
  }
  return null;
}

export const coverage = (level, state) => [popcount(state.region), level.tiles.length];

function candidate(rand, difficulty) {
  const n = 3 + difficulty;
  const colors = 3 + difficulty;
  const tiles = indices(n * n).map(() => rand(colors));
  const level = {n, colors, tiles};
  return {...level, initial: {region: expand(level, 1, tiles[0]), color: tiles[0]}};
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[2,3], [4,5], [6,9]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 11, '第一滴颜料'], [0, 76, '早晨的窗'], [0, 94, '相邻色块'],
  [1, 29, '染料分岔'], [1, 71, '纸上潮汐'], [1, 121, '回旋色域'],
  [2, 16, '混色练习'], [2, 163, '暮色拼盘'], [2, 855, '满幅渐染']
]);
