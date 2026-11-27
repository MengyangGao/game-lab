import {indices, step, movement, shortest, choose, campaign} from './common.js';

export function reduce(level, state, action) {
  if (action?.type !== 'move') return state;
  const p = step(state.p, level.n, action.direction);
  if (p < 0 || level.walls.includes(p)) return state;
  if (!state.boxes.includes(p)) return {...state, p};
  const destination = step(p, level.n, action.direction);
  if (destination < 0 || level.walls.includes(destination) || state.boxes.includes(destination)) return state;
  return {p, boxes: state.boxes.map(box => box === p ? destination : box).sort((a,b) => a-b)};
}

export const won = (level, state) => state.p === level.exit;
export const actions = () => movement;
export const solve = (level, state) => shortest(level, state, {
  key: ({p, boxes}) => [p, ...boxes].join(','), won, actions, reduce
});

function candidate(rand, difficulty) {
  const n = 5 + (difficulty > 0 ? 1 : 0);
  const cells = indices(n * n);
  const exit = n * n - n - 1;
  const walls = [exit - n, exit + n];
  const boxes = [exit - 1];
  const available = cells.filter(i => i !== exit && !walls.includes(i) && !boxes.includes(i));
  const take = () => available.splice(rand(available.length), 1)[0];
  for (let i = 0; i < 3 + difficulty * 2; i++) walls.push(take());
  for (let i = 0; i < difficulty + 1; i++) boxes.push(take());
  return {n, exit, walls, initial: {p: take(), boxes: boxes.sort((a,b) => a-b)}};
}

export const generate = (seed, difficulty) => choose(seed, difficulty, [[3,5],[6,8],[9,13]], candidate, solve);
export const levels = () => campaign({generate}, [
  [0, 22, '出门之前'], [0, 56, '窄巷'], [0, 88, '让出一格'],
  [1, 13, '货架之间'], [1, 37, '借道'], [1, 94, '仓库尽头'],
  [2, 19, '转身的空间'], [2, 49, '暗门'], [2, 76, '最后一扇窗']
]);
