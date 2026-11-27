import {indices, step, movement, shortest, choose, campaign} from './common.js';

export const actions = () => [...movement, {type: 'move', direction: 'wait'}];
const directions = actions().map(action => action.direction);

export function reduce(level, state, action) {
  if (action?.type !== 'move' || !directions.includes(action.direction)) return state;
  const walk = (i, direction) => {
    const next = step(i, level.n, direction);
    return next < 0 || level.walls.includes(next) ? i : next;
  };
  const {p, shadow, queue} = state;
  const nextP = walk(p, action.direction);
  const echo = queue.length === level.delay;
  const nextShadow = echo ? walk(shadow, queue[0]) : shadow;
  if (echo && (nextP === nextShadow || (nextP === shadow && nextShadow === p))) return state;
  return {p: nextP, shadow: nextShadow, queue: [...queue.slice(echo ? 1 : 0), action.direction]};
}

export const won = (level, state) => state.p === level.exit && state.shadow === level.plate;
export const solve = (level, state) => shortest(level, state, {
  key: ({p, shadow, queue}) => [p, shadow, ...queue].join(','), won, actions, reduce
});

function candidate(rand, difficulty) {
  const n = 4 + Number(difficulty === 2);
  const cells = indices(n * n);
  const take = () => cells.splice(rand(cells.length), 1)[0];
  const p = take();
  return {
    n, exit: take(), plate: take(), walls: Array.from({length: 2 + difficulty}, take),
    delay: 2 + Number(difficulty > 0), initial: {p, shadow: p, queue: []}
  };
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[3,5],[6,8],[9,13]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 18, '隔两拍'], [0, 51, '脚步回响'], [0, 303, '同步'],
  [1, 20, '晚来的同伴'], [1, 53, '错开一步'], [1, 304, '留在原地'],
  [2, 21, '空房间'], [2, 56, '穿过长廊'], [2, 305, '两条时间线']
]);
