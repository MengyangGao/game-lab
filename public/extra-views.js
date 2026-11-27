import * as crate from './games/crate.js';
import * as echo from './games/echo.js';
import * as voxel from './games/voxel.js';
import * as mosaic from './games/mosaic.js';
import {bit, indices} from './games/common.js';

const arrows = {up: '↑', right: '→', down: '↓', left: '←', wait: '·'};
const directionNames = {up: '向上', right: '向右', down: '向下', left: '向左', wait: '等待'};
const directionClue = (_, action) => `试着${directionNames[action.direction] === '等待' ? '等待一步' : directionNames[action.direction] + '走一步'}，观察棋盘的变化。`;

function walkBoard(level, state, preview, hint, hasEcho) {
  const grid = indices(level.n ** 2).map(i => {
    const item = level.walls.includes(i) ? ['wall', '', '墙'] : i === state.p ? ['walker', '●', '你']
      : hasEcho && i === state.shadow ? ['echo-piece', '◉', '回声']
      : state.boxes?.includes(i) ? ['crate-piece', '▧', '箱子']
      : i === level.exit ? ['exit', '✦', '出口'] : i === level.plate ? ['plate', '◈', '回声开关'] : ['', '', '空地'];
    return `<span class="cell ${item[0]}" ${preview ? '' : `role="img" aria-label="第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列，${item[2]}"`}>${item[1]}</span>`;
  }).join('');
  const buttons = (hasEcho ? echo : crate).actions().map(({direction}) =>
    `<button type="button" class="quiet ${hint?.direction === direction ? 'marked' : ''}" data-move="${direction}" aria-label="${directionNames[direction]}">${arrows[direction]}</button>`).join('');
  const timeline = hasEcho ? `<p class="timeline">回放延迟 ${level.delay} 步 <strong>${state.queue.map(key => arrows[key]).join(' ') || '·'}</strong></p>` : '';
  return `<div class="board walk-board" style="--n:${level.n}">${grid}</div>${preview ? '' : `${timeline}<div class="direction-pad">${buttons}</div>`}`;
}

function isometric(level, state) {
  const cubes = indices(level.count).sort((a, b) => {
    const depth = i => Math.floor(i / 4) * 3 + (i % 2) + Math.floor(i / 2) % 2;
    return depth(a) - depth(b);
  }).map(i => {
    const x = i % 2;
    const y = Math.floor(i / 2) % 2;
    const z = Math.floor(i / 4);
    const dx = 50 + (x - y) * 19;
    const dy = 72 + (x + y) * 10 - z * 20;
    const filled = Boolean(state & bit(i));
    return `<g transform="translate(${dx} ${dy})" class="${filled ? 'occupied' : 'empty'}">
      <path class="top" d="M0-10 19 0 0 10-19 0Z"/>
      <path class="left" d="M-19 0 0 10 0 30-19 20Z"/>
      <path class="right" d="M0 10 19 0 19 20 0 30Z"/>
    </g>`;
  }).join('');
  return `<svg class="isometric" viewBox="0 12 100 112" aria-hidden="true">${cubes}</svg>`;
}

function volume(level, state, preview, hint) {
  const layers = indices(level.count / 4).map(z => {
    const slots = indices(4).map(index => {
      const i = z * 4 + index;
      const filled = Boolean(state & bit(i));
      const locked = Boolean(level.initial & bit(i));
      const flags = `class="voxel-cell ${filled ? 'solid' : ''} ${hint?.i === i ? 'marked' : ''}"`;
      if (preview || locked) return `<span ${flags}>${locked ? '◆' : ''}</span>`;
      return `<button type="button" ${flags} data-cube="${i}" aria-pressed="${filled}" aria-label="第 ${z + 1} 层第 ${index + 1} 格"></button>`;
    }).join('');
    return `<div class="layer"><small>第 ${z + 1} 层</small><div>${slots}</div></div>`;
  }).join('');
  const current = voxel.projection(level, state);
  const sides = level.targets.map((mask, i) => {
    const dots = indices(i === 0 ? 4 : level.count / 2).map(j => {
      const required = mask & bit(j);
      const occupied = current[i] & bit(j);
      return `<span class="projection-dot ${required ? 'required' : ''} ${occupied ? 'occupied' : ''}">${required ? (occupied ? '✓' : '○') : occupied ? '×' : '·'}</span>`;
    }).join('');
    return `<div class="layer"><small>${['顶视','正视','侧视'][i]}</small><div>${dots}</div></div>`;
  }).join('');
  if (preview) return isometric(level, state);
  return `<div class="voxel-layout">${isometric(level, state)}<div class="voxel-layers">${layers}</div></div>
    <div class="projections" aria-label="三面投影">${sides}</div>`;
}

function art(level, tile = null, turns = 0) {
  const colors = [
    ['#241753','#af83ee','#ffbf80'], ['#103d48','#5ab49a','#ffbf80'],
    ['#302659','#786ca6','#eea4c3'], ['#563051','#bd7395','#ffb373'],
    ['#13384f','#648bad','#e8cc90'], ['#373061','#8877cd','#aee1ca'],
    ['#4c2b57','#a76ba8','#f8c159'], ['#164a49','#6dba9b','#f5dcca']
  ];
  const [dark, mid, bright] = colors[level.art];
  const size = 120 / level.n;
  const view = tile === null ? '0 0 120 120' : `${(tile % level.n) * size} ${Math.floor(tile / level.n) * size} ${size} ${size}`;
  return `<svg viewBox="${view}" style="transform:rotate(${90 * turns}deg)" aria-hidden="true">
    <rect width="120" height="120" fill="${dark}"/>
    <circle cx="${82 - 4 * level.art}" cy="34" r="19" fill="${bright}"/>
    <path d="M-8 91Q36 21 79 80T132 60V120H-8Z" fill="${mid}"/>
    <path d="M-8 109Q22 67 53 98T129 81" stroke="${bright}" stroke-width="6" fill="none"/>
    <path d="M12 38L24 34 27 19 32 32 47 35 33 40 26 52 22 42Z" fill="${bright}"/>
    <circle cx="101" cy="102" r="5" fill="#fff"/><circle cx="53" cy="71" r="2" fill="#fff"/>
  </svg>`;
}

function picture(level, state, preview, hint, selected) {
  const board = state.map((value, i) => {
    const tile = Math.floor(value / 4);
    const marks = `class="cell ${hint?.i === i || hint?.j === i ? 'marked' : ''} ${selected === i ? 'selected' : ''}"`;
    return preview ? `<span ${marks}>${art(level, tile, value % 4)}</span>` :
      `<button ${marks} type="button" data-piece="${i}" aria-pressed="${selected === i}" aria-label="位置 ${i + 1}，画片 ${tile + 1}，旋转 ${90 * (value % 4)} 度">${art(level, tile, value % 4)}</button>`;
  }).join('');
  return `<div class="board picture" style="--n:${level.n}">${board}</div>
  ${preview ? '' : `<div class="picture-tools"><figure>${art(level)}<figcaption>目标画面</figcaption></figure><button class="quiet" type="button" data-turn ${selected === null ? 'disabled' : ''}>旋转选中画片</button></div>`}`;
}

export const extraGames = {
  crate: {
    engine: crate, title: '庸人的容器', english: 'VESSEL OF MEDIOCRITY', tags: '移动规划',
    summary: '推开挡路的方箱，抵达营救点。',
    rule: '移动圆点，推开方箱，到达星形营救点。一次只能推一个箱子，箱子无法拉回。',
    tip: '从营救点往回找路线，留意箱子后面是否有空间站立。',
    clue: directionClue,
    draw: (level, state, preview, hint) => walkBoard(level, state, preview, hint, false),
    movement: true
  },
  voxel: {
    engine: voxel, title: '枘凿六合·Remake', english: 'HEXANEXUS: REMAKE', tags: '立体投影',
    summary: '填充体素，让三面投影同时吻合。',
    rule: '每层有四个位置，点击添加或移除方块。菱形方块固定。三个投影都需匹配：圆圈待填，叉号表示多填。',
    tip: '某处投影本应为空时，检查同一条视线上的所有层。',
    clue: (_, {i}) => `观察第 ${Math.floor(i / 4) + 1} 层描边的位置，再比较三面投影。`,
    draw: volume
  },
  mosaic: {
    engine: mosaic, title: '梦境拼图', english: 'DREAM JIGSAW', tags: '图形拼合',
    summary: '换位、旋转，找回一张打散的图画。',
    rule: '选中一张画片，再选择另一张可交换。按「旋转选中画片」顺时针转动 90°，拼成目标图。',
    tip: '先找最大的连续轮廓，观察它是否能接到邻格。',
    clue: (_, {i, j}) => j === undefined ? `尝试旋转第 ${i + 1} 张画片。` : `试着交换描边的两张画片（位置 ${i + 1} 和 ${j + 1}）。`,
    draw: picture
  },
  echo: {
    engine: echo, title: '黄金替罪羊', english: 'GOLDEN SCAPEGOAT', tags: '时间规划',
    summary: '用过去的脚步，为现在的自己开门。',
    rule: '回声从起点延迟几步复演指令。用 ◈ 标出的开关接住回声，同时让自己抵达星形出口。双方不能相撞或交换位置。',
    tip: '先想好一条去开关的路线，再安排现在的你怎样离开这条路线。',
    clue: directionClue,
    draw: (level, state, preview, hint) => walkBoard(level, state, preview, hint, true),
    movement: true
  }
};
