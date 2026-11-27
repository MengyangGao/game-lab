import {circuitGame} from './circuit-view.js';
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

function optical(level, state, preview, hint, _, view, shot = false) {
  const {path, lit, won} = mirror.trace(level, state);
  const energized = preview || shot;
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
    return cell(i, preview ? '' : ({target: '接收器', sensor: energized && lit.has(i) ? '感光器已点亮' : '感光器未点亮', wall: '墙壁'}[kind] ?? ''), kind === 'target' ? '◎' : kind === 'sensor' ? '◇' : '', false, `${kind} ${energized && (lit.has(i) || (kind === 'target' && won)) ? 'lit' : ''}`);
  });
  return `<div class="board optical" style="--n:${level.n}">${marks}
    <svg class="beam ${energized ? 'fired' : 'guide'}" viewBox="0 0 ${level.n} ${level.n}" aria-hidden="true"><polyline class="beam-halo" points="${points}"/><polyline class="beam-core" pathLength="1" points="${points}"/><circle cx=".13" cy="${level.source[0] + .5}" r=".13"/></svg>
  </div>`;
}

function pigment(level, state, preview, hint, selected) {
  const origin = hint?.i ?? selected;
  const region = Number.isInteger(origin) ? flood.regionAt(level, state, origin) : 0;
  const marks = tiles(level, i => {
    const color = Number(state[i]);
    const name = `第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列，${colorNames[color]}`;
    const highlighted = Boolean(region & bit(i));
    return cell(i, preview ? '' : name, `<span>${symbols[color]}</span>`, !preview,
      `pigment-color c${color} ${highlighted ? 'filled' : ''}${hint?.i === i ? ' marked' : ''}`);
  });
  const palette = indices(level.colors).map(color =>
    `<button type="button" class="swatch c${color} ${hint?.color === color ? 'marked' : ''}" data-color="${color}" aria-label="${colorNames[color]}" aria-pressed="${Number(state[selected]) === color}"><span>${symbols[color]}</span></button>`).join('');
  return `<div class="board pigment" style="--n:${level.n}">${marks}</div>${preview ? '' :
    `<div class="paint-tools"><div class="paint-target"><span>目标</span><span class="paint-chip c${level.target}">${colorNames[level.target]}</span></div>
    <div class="palette" aria-label="调色盘">${palette}</div></div>`}`;
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
    engine: mirror, title: '匣里流光', english: 'LUMINFLUX PYXIS', source: '崩坏：星穹铁道',
    tags: '空间推理', summary: '转动镜面，让一束光穿过暗室。',
    rule: '转动镜面校准光路。按试射发出光束，依次点亮菱形感光器和圆形接收器。',
    tip: '先找光束离开棋盘或撞墙前遇到的最后一面镜子。',
    clue: (level, action) => {
      const i = level.mirrors[action.i];
      return `观察第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列的描边镜面，想象翻转后的光路。`;
    },
    action: i => ({type: 'rotate', i}), draw: optical
  },
  flood: {
    engine: flood, title: '溢彩画', english: 'OVERFLOWING PALETTE', source: '鸣潮',
    tags: '顺序规划', summary: '选择下一抹颜色，把孤岛连成一片。',
    rule: '先选任意一片相连的同色区域，再选颜料。相邻同色区域会合并；在步数用尽前染成指定颜色。',
    tip: '先用一次换色合并多个相邻区域。最后再染成目标色往往更省步。',
    clue: (_, action) => `选中描边区域，把这片色块染成${colorNames[action.color]}。`,
    draw: pigment
  },
  circuit: circuitGame,
  ...extraGames,
  relay: {
    engine: relay, title: '熄灯', english: 'LIGHTS OUT', source: '经典逻辑谜题',
    tags: '联动逻辑', summary: '轻触一盏灯，改变周围四邻的状态。',
    rule: '点击任意格，会同时翻转这盏灯和它上下左右相邻的灯。把所有灯熄灭即可过关。',
    tip: '同一格点击两次会抵消。试着先考虑能同时处理几盏灯的位置。',
    clue: () => '观察描边格及其上下左右的灯，想象五个位置同时翻转后的样子。',
    action: i => ({type: 'toggle', i}), draw: switches
  }
};
