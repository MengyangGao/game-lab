import {extraGames} from './extra-views.js';
import * as mirror from './games/mirror.js';
import * as flood from './games/flood.js';
import * as relay from './games/switch.js';
import {bit, indices} from './games/common.js';

const symbols = ['●', '◆', '▲', '■', '✦'];
const colorNames = ['紫色', '橙色', '绿色', '蓝色', '粉色'];

function tiles(level, inner) {
  return indices(level.n * level.n).map(inner).join('');
}

function cell(i, name, body, interactive, classes = '') {
  return interactive
    ? `<button type="button" class="cell ${classes}" data-cell="${i}" aria-label="${name}">${body}</button>`
    : `<span class="cell ${classes}"${name ? ` role="img" aria-label="${name}"` : ''}>${body}</span>`;
}

function optical(level, state, preview, hint) {
  const {path, lit} = mirror.trace(level, state);
  const points = path.map(([r, c]) => {
    const clamp = i => Math.min(level.n, Math.max(0, i + .5));
    return `${clamp(c)},${clamp(r)}`;
  }).join(' ');
  const marks = tiles(level, i => {
    const m = level.mirrors.indexOf(i);
    if (m >= 0) {
      const flipped = Boolean(state & bit(m));
      return cell(i, `第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列，${flipped ? '反斜' : '正斜'}镜`,
        `<span class="mirror-piece ${flipped ? 'flipped' : ''}"></span>`, !preview, `mirror-cell ${hint?.i === m ? 'marked' : ''}`);
    }
    const kind = i === level.target ? 'target' : level.walls.includes(i) ? 'wall' : level.sensors.includes(i) ? 'sensor' : '';
    return cell(i, preview ? '' : ({target: '接收器', sensor: lit.has(i) ? '感光器已点亮' : '感光器未点亮', wall: '墙壁'}[kind] ?? ''), kind === 'target' ? '◎' : kind === 'sensor' ? '◇' : '', false, `${kind} ${lit.has(i) ? 'lit' : ''}`);
  });
  return `<div class="board optical" style="--n:${level.n}">${marks}
    <svg class="beam" viewBox="0 0 ${level.n} ${level.n}" aria-hidden="true"><polyline points="${points}"/><circle cx=".13" cy="${level.source[0] + .5}" r=".13"/></svg>
  </div>`;
}

function pigment(level, state, preview, hint) {
  const marks = tiles(level, i => {
    const filled = Boolean(state.region & bit(i));
    const color = filled ? state.color : level.tiles[i];
    return cell(i, preview ? '' : `第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列，${colorNames[color]}${filled ? '，已染色' : ''}`, symbols[color], false, `pigment-color c${color} ${filled ? 'filled' : ''}`);
  });
  const palette = indices(level.colors).map(color =>
    `<button type="button" class="swatch c${color} ${hint?.color === color ? 'marked' : ''}" data-color="${color}" aria-label="${colorNames[color]}" aria-pressed="${state.color === color}"><span>${symbols[color]}</span></button>`).join('');
  return `<div class="board pigment" style="--n:${level.n}">${marks}</div>${preview ? '' : `<div class="palette" aria-label="调色盘">${palette}</div>`}`;
}

function switches(level, state, preview, hint) {
  return `<div class="board switches" style="--n:${level.n}">${tiles(level, i => {
    const on = Boolean(state & bit(i));
    return cell(i, `第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列，${on ? '亮' : '灭'}`, '✦', !preview,
      `${on ? 'on' : ''} ${hint?.i === i ? 'marked' : ''}`);
  })}</div>`;
}

export const games = {
  mirror: {
    engine: mirror, title: '匣里流光', english: 'LUMINFLUX PYXIS', icon: '◈',
    tags: '空间推理', summary: '转动镜面，让一束光穿过暗室。',
    rule: '点击银色镜面改变反射方向。让光束先经过所有菱形感光器，再抵达圆形接收器。',
    tip: '先找光束离开棋盘或撞墙前遇到的最后一面镜子。',
    clue: (level, action) => {
      const i = level.mirrors[action.i];
      return `观察第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列的描边镜面，想象翻转后的光路。`;
    },
    action: i => ({type: 'rotate', i}), draw: optical
  },
  flood: {
    engine: flood, title: '溢彩画', english: 'OVERFLOWING PALETTE', icon: '✿',
    tags: '顺序规划', summary: '选择下一抹颜色，把孤岛连成一片。',
    rule: '从左上角的白色描边区域开始。选一种颜色，把区域染成该色，并吸收所有相连的同色格。让整幅画成为同一种颜色。',
    tip: '关注已染区域接触到的颜色。先打开通往棋盘另一端的路线。',
    clue: (_, action) => `试试调色盘中描边的${colorNames[action.color]}。选色前看看它能接通哪些色块。`,
    draw: pigment
  },
  ...extraGames,
  relay: {
    engine: relay, title: '熄灯', english: 'LIGHTS OUT', icon: '✦',
    tags: '联动逻辑', summary: '轻触一盏灯，改变周围四邻的状态。',
    rule: '点击任意格，会同时翻转这盏灯和它上下左右相邻的灯。把所有灯熄灭即可过关。',
    tip: '同一格点击两次会抵消。试着先考虑能同时处理几盏灯的位置。',
    clue: () => '观察描边格及其上下左右的灯，想象五个位置同时翻转后的样子。',
    action: i => ({type: 'toggle', i}), draw: switches
  }
};
