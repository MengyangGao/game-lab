export function random(seed) {
  let state = seed >>> 0;
  return max => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor(state / 4294967296 * max);
  };
}

export function neighbors(i, n) {
  const row = Math.floor(i / n);
  const column = i % n;
  return [
    ...(row > 0 ? [i - n] : []),
    ...(column < n - 1 ? [i + 1] : []),
    ...(row < n - 1 ? [i + n] : []),
    ...(column > 0 ? [i - 1] : [])
  ];
}

export const bit = i => 1 << i;
export const indices = n => Array.from({length: n}, (_, i) => i);
export const popcount = value => {
  let count = 0;
  for (let rest = value; rest; rest &= rest - 1) count++;
  return count;
};

export function choose(seed, difficulty, bands, candidate, solve) {
  if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty >= bands.length) {
    throw new RangeError('Invalid difficulty');
  }
  const rand = random(seed);
  const [min, max] = bands[difficulty];
  for (let attempt = 0; attempt < 1500; attempt++) {
    const level = candidate(rand, difficulty);
    if (!level) continue;
    const solution = solve(level, level.initial);
    if (solution && solution.length >= min && solution.length <= max) {
      return {...level, seed: seed >>> 0, difficulty, par: solution.length};
    }
  }
  throw new Error('No level found in difficulty band');
}

export function campaign(game, seeds) {
  return seeds.map(([difficulty, seed, title], index) => ({
    ...game.generate(seed, difficulty), title, id: String(index + 1)
  }));
}

export const directions = ['up', 'right', 'down', 'left'];

export function step(i, n, direction) {
  const row = Math.floor(i / n);
  const column = i % n;
  switch (direction) {
    case 'up': return row ? i - n : -1;
    case 'right': return column < n - 1 ? i + 1 : -1;
    case 'down': return row < n - 1 ? i + n : -1;
    case 'left': return column ? i - 1 : -1;
    default: return -1;
  }
}

export function shortest(level, initial, {key, won, actions, reduce}) {
  const queue = [{state: initial, parent: -1}];
  const seen = new Set([key(initial)]);
  for (let index = 0; index < queue.length; index++) {
    const {state} = queue[index];
    if (won(level, state)) {
      const result = [];
      for (let i = index; i > 0; i = queue[i].parent) result.push(queue[i].action);
      return result.reverse();
    }
    for (const action of actions(level, state)) {
      const next = reduce(level, state, action);
      const identity = key(next);
      if (seen.has(identity)) continue;
      seen.add(identity);
      queue.push({state: next, parent: index, action});
    }
  }
  return null;
}

export const movement = directions.map(direction => ({type: 'move', direction}));
