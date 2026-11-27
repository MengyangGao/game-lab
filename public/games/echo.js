import {indices, step, movement, shortest, choose, campaign} from './common.js';

export const actions = (_, state) => state?.failed ? [] : [...movement, {type: 'move', direction: 'wait'}];
const directions = actions().map(action => action.direction);

export function reduce(level, state, action) {
  if (state.failed || action?.type !== 'move' || !directions.includes(action.direction)) return state;
  const walk = (i, direction) => {
    const next = step(i, level.n, direction);
    return next < 0 || level.walls.includes(next) ? i : next;
  };
  const {p, shadow, queue, cursor} = state;
  const nextP = walk(p, action.direction);
  if (queue.length < level.delay) return {...state, p: nextP, queue: [...queue, action.direction]};
  const nextShadow = cursor < queue.length ? walk(shadow, queue[cursor]) : shadow;
  const failed = nextP === nextShadow || (nextP === shadow && nextShadow === p);
  return {p: nextP, shadow: nextShadow, queue, cursor: Math.min(cursor + 1, queue.length), failed};
}

export const won = (level, state) => !state.failed && state.p === level.exit && state.shadow === level.plate && state.queue.length === level.delay;
export const solve = (level, state) => shortest(level, state, {
  key: ({p, shadow, queue, cursor, failed}) => failed ? 'collision' : [p, shadow, cursor, ...queue].join(','),
  won, actions, reduce
});

function candidate(rand, difficulty) {
  const n = 4 + Number(difficulty === 2);
  const cells = indices(n * n);
  const take = () => cells.splice(rand(cells.length), 1)[0];
  const p = take();
  return {
    n, exit: take(), plate: take(), walls: Array.from({length: 2 + difficulty}, take),
    delay: 2 + difficulty, initial: {p, shadow: p, queue: [], cursor: 0, failed: false}
  };
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[3,5],[6,8],[9,13]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 18, '隔两拍'], [0, 51, '脚步回响'], [0, 303, '同步'],
  [1, 20, '晚来的同伴'], [1, 53, '错开一步'], [1, 304, '留在原地'],
  [2, 21, '空房间'], [2, 56, '穿过长廊'], [2, 305, '两条时间线']
]);
