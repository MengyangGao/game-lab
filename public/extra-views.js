import * as crateEngine from './games/crate.js';
import * as echo from './games/echo.js';
import * as voxel from './games/voxel.js';
import * as mosaic from './games/mosaic.js';
import {bit, indices} from './games/common.js';
import {atmosphere, block, crate, defs, entity, floorTiles, hit, isoPoint, person, position, sceneSvg, traveler} from './scene.js';

const arrows = {up: '↑', right: '→', down: '↓', left: '←', wait: '·'};
const directionNames = {up: '向上', right: '向右', down: '向下', left: '向左', wait: '等待'};
const directionClue = (_, action) => `尝试${action.direction === 'wait' ? '等待一步' : directionNames[action.direction] + '移动一格'}，观察自己与黑暗的位置变化。`;

function altar(prefix, lit) {
  return `<svg viewBox="-70 -135 140 145" aria-hidden="true">
    <ellipse cx="0" cy="0" rx="47" ry="14" fill="#030711" opacity=".7"/>
    <path d="M-44-7-28-31H28L44-7 28 3H-28Z" fill="url(#${prefix}-brass)" stroke="#d9bc7b"/>
    <path d="M-31-31-21-48H21L31-31 17-23H-17Z" fill="#554326" stroke="#c9a767"/>
    <path d="M-15-47Q-25-79 0-112 25-79 15-47 0-32-15-47Z" fill="${lit ? '#fff1a6' : '#d68b38'}" filter="url(#${prefix}-glow)"/>
    <path d="M-6-50Q-12-71 1-91 13-68 7-50Z" fill="#fffbd8"/>
    <path d="M-45-18-57-38M45-18 57-38" stroke="url(#${prefix}-brass)" stroke-width="7"/>
    <circle cy="-26" r="7" fill="#f4d384"/>
  </svg>`;
}

function walkBoard(level, state, preview, hint, hasEcho) {
  const prefix = hasEcho ? 'omen' : 'belobog';
  const tone = hasEcho ? 'gold' : 'snow';
  const special = [level.exit, ...(hasEcho ? [level.plate] : [])].map(i => {
    const {x, y} = isoPoint(level.n, i);
    const plate = i === level.plate;
    const active = plate && state.shadow === i && state.queue?.length === level.delay;
    return `<g transform="translate(${x} ${y})" class="${plate ? `pressure-plate ${active ? 'active' : ''}` : 'exit-rune'}">
      <path d="M0-23 42 0 0 23-42 0Z" fill="${plate ? active ? '#b9974e' : '#544a37' : '#284e51'}" stroke="${active ? '#ffe5a0' : '#c3b47d'}" stroke-width="2"/>
      <path d="M0-13 24 0 0 13-24 0Z" fill="none" stroke="${active ? '#fff0b5' : '#9e9875'}" stroke-width="2"/>
      <circle r="5" fill="${active ? '#fff3ba' : '#c0af76'}"/>
    </g>`;
  }).join('');
  const walls = level.walls.map(i => block(level.n, i, prefix, 'wall', .83, hasEcho ? 65 : 50)).join('');
  const tokens = [
    ...(state.boxes ?? []).map(i => entity(level.n, i, 'crate-token', crate(prefix), '军械箱', 'data-token="crate-token"')),
    ...(hasEcho && state.queue.length >= level.delay ? [entity(level.n, state.shadow, 'echo-token', person(prefix, true), '黑暗中的自己', 'data-token="echo-token"')] : []),
    ...(!hasEcho && state.p !== level.exit ? [entity(level.n, level.exit, 'rescue-token', traveler(prefix, true), '等待救援的受困者')] : []),
    ...(hasEcho ? [entity(level.n, level.exit, 'altar-token', altar(prefix, state.p === level.exit), '祭坛')] : []),
    entity(level.n, state.p, 'player-token', hasEcho ? person(prefix) : traveler(prefix), hasEcho ? '持火的自己' : '开拓者', 'data-token="player-token"')
  ].join('');
  const floorHits = preview ? '' : indices(level.n ** 2).filter(i => !level.walls.includes(i)).map(i =>
    hit(level.n, i, `data-floor="${i}"`, `第 ${Math.floor(i / level.n) + 1} 行第 ${i % level.n + 1} 列`, 'walk-hit')).join('');
  const playable = hasEcho ? echo.actions(level, state) : crateEngine.actions();
  const buttons = (hasEcho ? echo.actions() : playable).map(({direction}) =>
    `<button type="button" class="quiet move-button ${hint?.direction === direction ? 'marked' : ''}" data-move="${direction}" aria-label="${directionNames[direction]}" ${state.failed ? 'disabled' : ''}><span>${arrows[direction]}</span><small>${direction === 'wait' ? '等待' : ''}</small></button>`).join('');
  const recording = state.queue?.length < level.delay;
  const timeline = hasEcho ? `<div class="timeline"><div class="timeline-label"><span>${recording ? '黑暗记录' : state.cursor < level.delay ? '黑暗复现' : '黑暗停驻'}</span><strong>${recording ? level.delay - state.queue.length : Math.max(level.delay - state.cursor, 0)}</strong></div><ol>${indices(level.delay).map(i =>
    `<li class="${!recording && state.cursor === i ? 'current' : ''} ${!recording && state.cursor > i ? 'played' : ''}" aria-label="${directionNames[state.queue[i]] ?? '待记录'}">${arrows[state.queue[i]] ?? '·'}</li>`).join('')}</ol></div>` : '';
  const content = `${floorTiles(level.n, prefix)}${special}${walls}`;
  return `<div class="walk-scene"><div class="board scene-board walk-board ${hasEcho ? 'omen-board' : 'belobog-board'}" style="--n:${level.n}" ${preview ? 'aria-hidden="true"' : 'aria-label="机关移动区域"'}>${atmosphere(prefix, hasEcho ? '#d2a959' : '#8aa6c0')}${sceneSvg(prefix, tone, content)}${floorHits}${tokens}<span class="scene-caption">${hasEcho ? '翁法罗斯 · 命运回廊' : '雅利洛-Ⅵ · 边缘通路'}</span></div>${preview ? '' : `${timeline}<div class="direction-pad">${buttons}</div>`}</div>`;
}

function isometric(level, state, view = 0) {
  const cubes = indices(level.count).map(i => {
    const x = i % 2;
    const y = Math.floor(i / 2) % 2;
    const [u, v] = [[x, y], [1 - y, x], [1 - x, 1 - y], [y, 1 - x]][view];
    return {i, x: u, y: v, z: Math.floor(i / 4)};
  }).sort((a, b) => (a.z - b.z) * 3 + a.x + a.y - b.x - b.y).map(({i, x, y, z}) => {
    const dx = 100 + (x - y) * 38;
    const dy = 145 + (x + y) * 20 - z * 42;
    const filled = Boolean(state & bit(i));
    const locked = Boolean(level.initial & bit(i));
    return `<g transform="translate(${dx} ${dy})" data-voxel="${i}" class="${filled ? 'occupied' : 'empty'} ${locked ? 'locked' : ''}">
      <path class="cube-left" d="M-38 0 0 20 0 62-38 42Z"/>
      <path class="cube-right" d="M0 20 38 0 38 42 0 62Z"/>
      <path class="cube-top" d="M0-20 38 0 0 20-38 0Z"/>
      <path class="cube-inset" d="M0-11 26 2 0 14-26 2Z"/>
      <path class="cube-detail" d="M-29 8-9 19V43L-29 32ZM29 8 9 19V43L29 32Z"/>
      <path class="cube-rune" d="M0-6 11 1 0 7-11 1Z"/>
    </g>`;
  }).join('');
  return `<svg class="isometric" viewBox="0 20 200 185" aria-hidden="true">${defs('voxel-model', 'jade')}<ellipse cx="100" cy="175" rx="85" ry="20" fill="#55d8c7" opacity=".08" filter="url(#voxel-model-soft)"/>${cubes}</svg>`;
}

function volume(level, state, preview, hint, _, view = 0) {
  const layers = indices(level.count / 4).map(z => {
    const slots = indices(4).map(index => {
      const i = z * 4 + index;
      const filled = Boolean(state & bit(i));
      const locked = Boolean(level.initial & bit(i));
      const flags = `class="voxel-cell ${filled ? 'solid' : ''} ${locked ? 'locked' : ''} ${hint?.i === i ? 'marked' : ''}"`;
      if (preview || locked) return `<span ${flags}><i></i></span>`;
      return `<button type="button" ${flags} data-cube="${i}" aria-pressed="${filled}" aria-label="第 ${z + 1} 层第 ${index + 1} 个位置，${filled ? '移除资源块' : '搭建资源块'}"><i></i></button>`;
    }).join('');
    return `<div class="layer"><small>第 ${z + 1} 层</small><div>${slots}</div></div>`;
  }).join('');
  const current = voxel.projection(level, state);
  const sides = level.targets.map((mask, i) => {
    const dots = indices(i === 0 ? 4 : level.count / 2).map(j => {
      const required = mask & bit(j);
      const occupied = current[i] & bit(j);
      return `<span class="projection-dot ${required ? 'required' : ''} ${occupied ? 'occupied' : ''}">${required ? occupied ? '✓' : '○' : occupied ? '×' : '·'}</span>`;
    }).join('');
    return `<div class="projection"><small>${['顶视','正视','侧视'][i]}</small><div>${dots}</div></div>`;
  }).join('');
  if (preview) return `<div class="voxel-preview">${isometric(level, state)}</div>`;
  return `<div class="voxel-layout"><div class="voxel-model"><span class="model-label">枘凿六合 · 构筑校准</span>${isometric(level, state, view)}<button type="button" class="quiet rotate-model" data-view aria-label="旋转模型视角">↻ 旋转视角</button></div><div class="voxel-layers"><span class="layers-label">搭建资源块</span>${layers}</div></div>
    <div class="projections" aria-label="三面投影校准">${sides}</div>`;
}

function art(level, tile = null, turns = 0) {
  const size = 120 / level.n;
  const view = tile === null ? '0 0 120 120' : `${(tile % level.n) * size} ${Math.floor(tile / level.n) * size} ${size} ${size}`;
  return `<svg viewBox="${view}" style="transform:rotate(${90 * turns}deg)" aria-hidden="true">
    <image href="./assets/tidal-glass.webp" width="120" height="120" class="glass-tone-${level.art}"/>
  </svg>`;
}

function picture(level, state, preview, hint, selected) {
  const board = state.map((value, i) => {
    const tile = Math.floor(value / 4);
    const marks = `class="cell ${hint?.i === i || hint?.j === i ? 'marked' : ''} ${selected === i ? 'selected' : ''}"`;
    return preview ? `<span ${marks}>${art(level, tile, value % 4)}</span>` :
      `<button ${marks} type="button" data-piece="${i}" aria-pressed="${selected === i}" aria-label="位置 ${i + 1}，画片 ${tile + 1}，旋转 ${90 * (value % 4)} 度">${art(level, tile, value % 4)}<i class="piece-glint"></i></button>`;
  }).join('');
  return `<div class="dream-shell"><div class="board picture" style="--n:${level.n}">${board}<i class="dream-orbit one"></i><i class="dream-orbit two"></i></div>
  ${preview ? '' : `<div class="picture-tools"><figure>${art(level)}<figcaption>完整画面</figcaption></figure><div class="picture-instruction"><strong>筑梦拼图</strong><span>拖动画片交换位置</span><button class="quiet" type="button" data-turn ${selected === null ? 'disabled' : ''}>↻ 旋转选中画片</button></div></div>`}</div>`;
}

export const extraGames = {
  crate: {
    engine: crateEngine, title: '庸人的容器', english: 'VESSEL OF MEDIOCRITY', source: '崩坏：星穹铁道',
    location: '雅利洛-Ⅵ · 愚者之箱', tags: '推箱解谜', summary: '推开军械箱，打通前往受困者身边的道路。',
    objective: '推动挡路的军械箱，抵达受困者所在的位置。箱子只能推动，无法拉回。',
    rule: '使用方向键、滑动或点击相邻格移动。接近军械箱继续前进即可推动；一次只能推动一个箱子。',
    tip: '从受困者的位置反向寻找路线。推箱之前，先确认箱子后方有空位，自己也能绕到推动的一侧。',
    clue: directionClue,
    clear: '道路已经打通，受困者终于可以离开。',
    draw: (level, state, preview, hint) => walkBoard(level, state, preview, hint, false),
    movement: true
  },
  voxel: {
    engine: voxel, title: '枘凿六合·Remake', english: 'HEXANEXUS: REMAKE', source: '崩坏：星穹铁道',
    location: '仙舟「罗浮」 · 庙趣满堂', tags: '空间构筑', summary: '搭建资源块，补全枘凿六合的结构。',
    objective: '在空位搭建资源块，使立体的顶视、正视与侧视投影全部吻合。固定方块不可移除。',
    rule: '选择层级中的位置搭建或移除资源块，也可以旋转模型观察。投影中圆圈表示缺少，叉号表示多放。',
    tip: '先看要求为空的投影格：同一条视线上的所有层都不能出现资源块。',
    clue: (_, {i}) => `检查第 ${Math.floor(i / 4) + 1} 层描边的位置，对照三个投影决定搭建或移除。`,
    clear: '虚实相合，枘凿六合构筑完成。',
    draw: volume
  },
  mosaic: {
    engine: mosaic, title: '筑梦拼图', english: 'DREAM JIGSAW', source: '崩坏：星穹铁道',
    location: '匹诺康尼 · 筑梦边境', tags: '图形拼合', summary: '移动散落的画片，让破碎的梦境重新完整。',
    objective: '拖动画片交换位置，必要时旋转画片，将画面复原为右侧参考图。',
    rule: '抓起画片并拖到另一格即可交换，也可依次点击两格。选中画片后可旋转；所有画片归位即完成。',
    tip: '先找月亮、穹顶等辨识度高的大轮廓，再沿着色块与线条向外拼合。',
    clue: (_, {i, j}) => j === undefined ? `旋转第 ${i + 1} 张画片，让画面线条与邻格衔接。` : `交换描边的两张画片（位置 ${i + 1} 和 ${j + 1}）。`,
    clear: '碎片各归其位，梦境重新完整。',
    draw: picture
  },
  echo: {
    engine: echo, title: '黄金替罪羊', english: 'GOLDEN SCAPEGOAT', source: '崩坏：星穹铁道',
    location: '翁法罗斯 · 黄金替罪羊', tags: '轨迹复现', summary: '利用黑暗复现的脚步，点亮最后的祭坛。',
    objective: '让黑暗停在机关上，同时操纵持火的自己抵达祭坛。与黑暗接触会失败。',
    rule: '最初的行动会被黑暗记录。记录归零后，黑暗将按相同顺序复现脚步，最后停在原地。利用它压住机关，再点亮祭坛。',
    tip: '记录阶段就是在为黑暗铺路。先规划它最终停下的位置，再考虑自己如何避开轨迹并抵达祭坛。',
    clue: directionClue,
    clear: '祭坛已被点亮。正如巨石被推上山顶。',
    draw: (level, state, preview, hint) => walkBoard(level, state, preview, hint, true),
    movement: true
  }
};
