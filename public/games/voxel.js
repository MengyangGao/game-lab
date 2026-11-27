import {indices, bit, choose, campaign, popcount} from './common.js';

export function projection(level, mask) {
  const sides = [0, 0, 0];
  for (let i = 0; i < level.count; i++) {
    if (!(mask & bit(i))) continue;
    const z = Math.floor(i / 4);
    const x = i % 2;
    const y = Math.floor(i / 2) % 2;
    sides[0] |= bit(y * 2 + x);
    sides[1] |= bit(z * 2 + x);
    sides[2] |= bit(z * 2 + y);
  }
  return sides;
}

export const actions = level => indices(level.count)
  .filter(i => !(level.initial & bit(i))).map(i => ({type: 'cube', i}));

export function reduce(level, state, action) {
  const i = action?.i;
  return action?.type === 'cube' && Number.isInteger(i) && i >= 0 && i < level.count && !(level.initial & bit(i))
    ? state ^ bit(i) : state;
}

export const won = (level, state) => projection(level, state).every((mask, side) => mask === level.targets[side]);

export function solve(level, state) {
  let best = null;
  let distance = Infinity;
  for (let candidate = 0; candidate < bit(level.count); candidate++) {
    if ((candidate & level.initial) !== level.initial) continue;
    const delta = candidate ^ state;
    const steps = popcount(delta);
    if (steps >= distance || !won(level, candidate)) continue;
    distance = steps;
    best = actions(level).filter(({i}) => delta & bit(i));
  }
  return best;
}

function candidate(rand, difficulty) {
  const count = difficulty > 0 ? 12 : 8;
  const cells = indices(count);
  const take = () => cells.splice(rand(cells.length), 1)[0];
  const initial = bit(take());
  let target = initial;
  for (let i = 0; i < 2 + difficulty * 2; i++) target |= bit(take());
  return {count, initial, targets: projection({count}, target)};
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[1,2],[3,4],[5,6]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 7, '一枚方块'], [0, 91, '正侧之间'], [0, 291, '缺角'],
  [1, 8, '隐于投影'], [1, 92, '向上搭建'], [1, 292, '三面交汇'],
  [2, 9, '悬浮群岛'], [2, 93, '层叠剪影'], [2, 293, '光之雕塑']
]);
