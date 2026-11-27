import {circuitGame} from './circuit-view.js';
import {extraGames} from './extra-views.js';
import * as mirror from './games/mirror.js';
import * as flood from './games/flood.js';
import * as relay from './games/switch.js';
import {bit, indices} from './games/common.js';
import {atmosphere, crystal, defs, floorTiles, isoPoint, isoUnit, position, sceneSvg, sourcePoint} from './scene.js';

const symbols = ['●', '◆', '▲', '■', '✦'];
const colorNames = ['蓝色', '红色', '黄色', '绿色', '粉色'];

function tiles(level, inner) {
  return indices(level.n * level.n).map(inner).join('');
}

function opticalDevice(level, i, state, mirrorIndex, prefix) {
  const {x, y} = isoPoint(level.n, i);
  const flipped = Boolean(state & bit(mirrorIndex));
  return `<g class="mirror-assembly" data-mirror-index="${mirrorIndex}" transform="translate(${x} ${y})" filter="url(#${prefix}-shadow)">
    <ellipse cx="0" cy="4" rx="34" ry="15" fill="#071019" opacity=".6"/>
    <ellipse cx="0" cy="-1" rx="29" ry="14" fill="url(#${prefix}-metal)" stroke="#c2c7a766" stroke-width="2"/>
    <ellipse cx="0" cy="-5" rx="20" ry="9" fill="#142b32" stroke="#b6a87b" stroke-width="2"/>
    <path d="M-17-8-12-63M17-8 12-63" stroke="url(#${prefix}-brass)" stroke-width="6"/>
    <g class="mirror-rotor ${flipped ? 'flipped' : ''}">
      ${flipped ? `<path d="M-38-83 35-56 35-19-38-46Z" fill="url(#${prefix}-silver)" stroke="#d9e7ce" stroke-width="2"/>` : `<path d="M-35-56 38-83 38-46-35-19Z" fill="url(#${prefix}-silver)" stroke="#d9e7ce" stroke-width="2"/>`}
      <path d="${flipped ? 'M-28-71 26-51' : 'M-26-51 28-71'}" stroke="#f0ffff" stroke-opacity=".62" stroke-width="3"/>
    </g>
    <circle cx="0" cy="-57" r="6" fill="url(#${prefix}-brass)"/>
    <path d="M-25 0H25" stroke="#d1b87a" stroke-width="2"/>
  </g>`;
}

function optical(level, state, preview, hint) {
  const {path, lit, won} = mirror.trace(level, state);
  const prefix = 'optical';
  const unit = isoUnit(level.n);
  const point = ([r, c]) => sourcePoint(level.n, [r, c]);
  const points = path.map(coord => {
    const p = point(coord);
    return `${p.x},${p.y - 45}`;
  }).join(' ');
  const walls = level.walls.map(i => {
    const {x, y} = isoPoint(level.n, i);
    return `<g transform="translate(${x} ${y})"><path d="M-${unit * .8} 0 0 ${unit * .43} ${unit * .8} 0 0-${unit * .43}Z" fill="#111d25" stroke="#60716d"/><path d="M-22-8 0-22 22-8 0 5Z" fill="#2f4143" stroke="#9aab9144"/></g>`;
  }).join('');
  const mirrors = level.mirrors.map((i, index) => opticalDevice(level, i, state, index, prefix)).join('');
  const sensors = level.sensors.map(i => {
    const {x, y} = isoPoint(level.n, i);
    const active = lit.has(i);
    return `<g class="wood-sensor ${active ? 'lit' : ''}" transform="translate(${x} ${y})">
      ${active ? `<ellipse cx="0" cy="-38" rx="52" ry="52" fill="url(#${prefix}-light)"/>` : ''}
      <path d="M0 0V-45M0-29-18-50M0-36 17-58M0-20 23-34" stroke="${active ? '#b8ffe1' : '#668b75'}" stroke-width="5" stroke-linecap="round"/>
      <path d="M-18-50-26-65-10-58M17-58 25-72 28-55M23-34 38-41 31-26" fill="${active ? '#d6ffb8' : '#4e7661'}" stroke="#c0db9b66"/>
      <ellipse cx="0" cy="1" rx="19" ry="8" fill="url(#${prefix}-brass)"/>
    </g>`;
  }).join('');
  const targetPoint = isoPoint(level.n, level.target);
  const target = `<g class="optical-target ${won ? 'lit' : ''}" transform="translate(${targetPoint.x} ${targetPoint.y})">
    <ellipse cx="0" cy="-36" rx="62" ry="62" fill="url(#${prefix}-light)" opacity="${won ? 1 : .22}"/>
    <path d="M-26 0-18-17H18L26 0 14 8H-14Z" fill="url(#${prefix}-brass)" stroke="#dbc994"/>
    <path d="M0-92 18-58 0-25-18-58Z" fill="${won ? '#a4f3c9' : '#28534f'}" stroke="${won ? '#e4ffe2' : '#79a393'}" stroke-width="2"/>
    <path d="M0-92V-25L-18-58Z" fill="#e6fff0" opacity=".34"/>
    <circle cx="0" cy="-55" r="5" fill="${won ? '#f4ffe4' : '#77a49a'}" filter="url(#${prefix}-glow)"/>
  </g>`;
  const emitterPoint = sourcePoint(level.n, level.source);
  const emitter = `<g transform="translate(${emitterPoint.x} ${emitterPoint.y})"><ellipse cy="-42" rx="58" ry="58" fill="url(#${prefix}-light)"/><path d="M-27 0-20-22H20L27 0" fill="url(#${prefix}-brass)"/><path d="M0-99 20-66 0-27-20-66Z" fill="#5cb9a6" stroke="#c3ffe7" stroke-width="2"/><path d="M0-99V-27L-20-66Z" fill="#e3fff0" opacity=".4"/><circle cy="-59" r="6" fill="#f1ffe4" filter="url(#${prefix}-glow)"/></g>`;
  const scene = `${floorTiles(level.n, prefix)}<g class="beam fired"><polyline class="beam-halo" points="${points}"/><polyline class="beam-core" pathLength="1" points="${points}"/></g>${walls}${sensors}${target}${emitter}${mirrors}`;
  const buttons = preview ? '' : level.mirrors.map((i, index) => {
    const flipped = Boolean(state & bit(index));
    return `<button type="button" class="scene-hit optical-hit ${hint?.i === index ? 'marked' : ''}" style="${position(isoPoint(level.n, i))}" data-cell="${i}" aria-label="第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列承接器，当前${flipped ? '反斜' : '正斜'}方向，点击旋转"></button>`;
  }).join('');
  return `<div class="board scene-board optical" style="--n:${level.n}">${atmosphere(prefix)}${sceneSvg(prefix, 'jade', scene)}${buttons}<span class="scene-caption">工造司 · 匣里流光</span><span class="scene-legend"><i></i>激发器<b></b>承接器</span></div>`;
}

function pigment(level, state, preview, hint, selected) {
  const region = Number.isInteger(hint?.i) ? flood.regionAt(level, state, hint.i) : 0;
  const marks = tiles(level, i => {
    const color = Number(state[i]);
    const name = `第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列，${colorNames[color]}，点击染色`;
    const highlighted = Boolean(region & bit(i));
    return `<button type="button" class="cell pigment-color c${color} ${highlighted ? 'filled marked' : ''}" data-cell="${i}" aria-label="${name}"><span>${symbols[color]}</span></button>`;
  });
  const palette = indices(level.colors).map(color =>
    `<button type="button" class="swatch c${color} ${hint?.color === color ? 'marked' : ''}" data-color="${color}" aria-label="选择${colorNames[color]}颜料" aria-pressed="${selected === color}"><i></i><span>${symbols[color]}</span><small>${colorNames[color]}</small></button>`).join('');
  return `<div class="pigment-shell"><div class="board pigment" style="--n:${level.n}">${marks}<i class="frame-corner tl"></i><i class="frame-corner tr"></i><i class="frame-corner bl"></i><i class="frame-corner br"></i></div>${preview ? '' : `<div class="paint-tools"><span class="paint-instruction">选择颜料</span><div class="palette" aria-label="颜料列表">${palette}</div><div class="paint-target">目标色彩 <span class="paint-chip c${level.target}">${colorNames[level.target]}</span></div></div>`}</div>`;
}

function switches(level, state, preview, hint) {
  return `<div class="board switches" style="--n:${level.n}">${tiles(level, i => {
    const on = Boolean(state & bit(i));
    const body = `<span class="switch-core"><i></i><b></b></span>`;
    return `<button type="button" class="cell ${on ? 'on' : ''} ${hint?.i === i ? 'marked' : ''}" data-cell="${i}" aria-label="第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列机关，${on ? '亮' : '灭'}">${body}</button>`;
  })}</div>`;
}

export const games = {
  mirror: {
    engine: mirror, title: '匣里流光', english: 'LUMINFLUX PYXIS', source: '崩坏：星穹铁道',
    location: '仙舟「罗浮」 · 工造司', tags: '光路解谜', summary: '旋转承接器，让激发器的光线照亮建木花枝。',
    objective: '调整承接器的方向，使光线经过所有建木花枝，最终抵达接收装置。',
    rule: '点击承接器可旋转镜面。光路会实时变化；让光线一次性穿过所有建木花枝，并抵达终点。',
    tip: '从激发器出发逐段观察光路。先调整光线遇到的第一个承接器，再追踪下一段。',
    clue: (level, action) => {
      const i = level.mirrors[action.i];
      return `观察第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列的承接器，旋转后光线会改变方向。`;
    },
    clear: '光线已抵达终点，匣中机关重新运转。',
    action: i => ({type: 'rotate', i}), draw: optical
  },
  flood: {
    engine: flood, title: '溢彩画', english: 'OVERFLOWING PALETTE', source: '鸣潮',
    location: '阿维纽林 · 溢彩画', tags: '色彩扩散', summary: '清除杂乱色块，将画中色彩归还给大地。',
    objective: level => `在限定步数内，将画中所有色块染为${colorNames[level.target]}。`,
    rule: '先点击右侧列表选色，再点击左侧画框涂色。被涂色的格子会向四周相连的同色格子扩散。',
    tip: '利用扩散一次合并多个相邻区域。不要急于染成目标色，先减少画面中的色块种类。',
    clue: (_, action) => `选择${colorNames[action.color]}，再点击描边画格，让颜色向相连的同色区域扩散。`,
    clear: '杂乱色块已清除，色彩重新流淌。',
    draw: pigment
  },
  circuit: circuitGame,
  ...extraGames,
  relay: {
    engine: relay, title: '熄灯', english: 'LIGHTS OUT', source: '番外 · 经典逻辑',
    location: '机关档案 · 联动矩阵', tags: '联动逻辑', summary: '每次触发都会联动四邻，让整座矩阵沉寂。',
    objective: '点击机关会同时翻转自身与上下左右四邻。让所有机关熄灭即可过关。',
    rule: '每次点击会翻转自身及上下左右相邻的机关。同一位置点击两次，效果会相互抵消。',
    tip: '从角落开始观察。一个机关的最后状态，只与它和四邻被触发的次数有关。',
    clue: () => '观察描边机关及其上下左右四邻，预演这些位置同时翻转后的状态。',
    clear: '最后一盏灯已经熄灭，矩阵恢复寂静。',
    action: i => ({type: 'toggle', i}), draw: switches
  }
};

export {colorNames};
