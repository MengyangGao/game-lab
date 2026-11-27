import {indices, choose, campaign} from './common.js';

export function actions(level) {
  return indices(level.n ** 2).flatMap((i, _, all) => [
    {type: 'turn', i}, ...all.slice(i + 1).map(j => ({type: 'swap', i, j}))
  ]);
}

export function reduce(level, state, action) {
  const valid = i => Number.isInteger(i) && i >= 0 && i < state.length;
  const {type, i, j} = action ?? {};
  if (!valid(i)) return state;
  const result = state.slice();
  if (type === 'turn') {
    result[i] = state[i] % 4 === 3 ? state[i] - 3 : state[i] + 1;
  } else if (type === 'swap' && valid(j) && j !== i) {
    [result[i], result[j]] = [state[j], state[i]];
  } else return state;
  return result;
}

export const won = (_, state) => state.every((tile, i) => tile === i * 4);

export function solve(level, state) {
  const result = [];
  for (let i = 0; i < state.length; i++) {
    const j = state.findIndex(tile => Math.floor(tile / 4) === i);
    if (j !== i) {
      const swap = {type: 'swap', i, j};
      state = reduce(level, state, swap);
      result.push(swap);
    }
    for (let turns = state[i] % 4; turns > 0 && turns < 4; turns++) result.push({type: 'turn', i});
  }
  return result;
}

function candidate(rand, difficulty) {
  const n = difficulty === 0 ? 2 : 3;
  const art = rand(8);
  const level = {n, art};
  let initial = indices(n ** 2).map(i => i * 4);
  for (let move = 0; move < 2 + difficulty * 2; move++) {
    const i = rand(initial.length);
    const j = (i + 1 + rand(initial.length - 1)) % initial.length;
    initial = reduce(level, initial, {type: 'swap', i, j});
  }
  for (let i = 0; i < difficulty + 1; i++) {
    initial = reduce(level, initial, {type: 'turn', i: rand(initial.length)});
  }
  return {...level, initial};
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[3,5],[6,9],[10,14]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 17, '碎片'], [0, 81, '拼回清晨'], [0, 819, '缺一角的天'],
  [1, 27, '留影'], [1, 82, '折叠的画面'], [1, 820, '沿着轨迹'],
  [2, 37, '越过边缘'], [2, 83, '重叠的轨道'], [2, 821, '梦醒时分']
]);
