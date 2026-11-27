import {games} from './views.js';
import {campaign} from './campaign.js';
import {readSave, writeSave} from './storage.js';
import {connectGestures, playMotion} from './motion.js';
import {directions, step} from './games/common.js';

const app = document.querySelector('#app');
const settings = document.querySelector('#settings');
const difficulties = ['简单', '进阶', '困难'];
const gameIds = Object.keys(games);
const data = readSave();

let current;
let hint = 0;
let hintAction;
let selected = null;
let modelView = 0;
let installPrompt;

const icon = name => ({
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H5v-4M5 7c2-3 5-4 8-3 4 1 6 5 5 9s-5 7-9 6c-3-1-5-3-5-6"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11a8 8 0 1 1 2 6M4 5v6h6"/></svg>',
  hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M8 14c-4-5-1-11 4-11s8 6 4 11l-2 2h-4Z"/></svg>',
  levels: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
}[name] ?? '');

function save() {
  if (!writeSave(data)) document.querySelector('#offline').textContent = '无法写入本地存档';
}

function done(id) {
  return campaign[id].filter(level => Number.isInteger(data.best[`${id}/${level.id}`])).length;
}

function home() {
  const total = gameIds.reduce((sum, id) => sum + done(id), 0);
  const last = /^#[a-z]+\/(?:[1-9]|random\/[0-2]\/\d{1,10})$/.test(data.last)
    && gameIds.includes(data.last.split('/')[0].slice(1)) ? data.last : null;
  const totalLevels = Object.values(campaign).reduce((sum, levels) => sum + levels.length, 0);
  app.innerHTML = `<section class="hero">
    <img class="hero-image" src="./assets/optical-archive.webp" alt="光线穿过青铜机关，照亮古老的工造司" fetchpriority="high">
    <div class="hero-shade"></div>
    <div class="hero-copy">
      <p class="hero-kicker"><span></span> GAME LAB · 非官方玩法致敬计划</p>
      <h1>世间万象<br><em>皆有趣法。</em></h1>
      <p class="hero-description">从仙舟光路到稻妻雷石，从色彩扩散到命运回响。<br>以原创场景与关卡，重现那些令人驻足的机关。</p>
      <div class="hero-actions">
        <a class="primary" href="${last || '#mirror/1'}">${last ? '继续游戏' : '开始游戏'}<span>→</span></a>
        <a class="quiet" href="#collection" data-collection>浏览全部玩法</a>
      </div>
      <div class="hero-progress"><span>机关收录 <strong>08</strong></span><i></i><span>原创关卡 <strong>72</strong></span><i></i><span>无需注册 · 本地存档</span></div>
    </div>
    <div class="hero-coordinate" aria-hidden="true">ARCHIVE / 001—008<br>INTERACTIVE MECHANISM COLLECTION</div>
  </section>
  <section aria-labelledby="collection" class="archive"><div class="section-heading">
    <div><p class="section-kicker">MECHANISM ARCHIVE</p><h2 id="collection" tabindex="-1">选择玩法</h2></div>
    <span class="progress-pill"><i></i>总进度 <strong>${total}</strong> / ${totalLevels}</span>
  </div><div class="cards">${Object.entries(games).map(([id, game], index) => {
    const sample = campaign[id][Math.min(4, campaign[id].length - 1)];
    const next = campaign[id].find(level => data.best[`${id}/${level.id}`] === undefined)?.id ?? 1;
    return `<article class="card ${id}"><a href="#${id}/${next}">
      <div class="card-preview" aria-hidden="true"><span class="card-number">${String(index + 1).padStart(2, '0')}</span>${game.draw(sample, sample.initial, true)}<span class="preview-shade"></span></div>
      <div class="card-info"><div class="card-meta"><span>${game.source}</span><span>${game.tags}</span></div>
      <h3>${game.title}<small>${game.english}</small></h3><p>${game.summary}</p>
      <div class="card-bottom"><span class="card-completion"><i style="--progress:${done(id) / campaign[id].length * 100}%"></i>${done(id)} / ${campaign[id].length} 已完成</span><span class="card-enter">进入机关 <b>→</b></span></div></div>
    </a></article>`;
  }).join('')}</div></section>`;
}

function seed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function route() {
  selected = null;
  modelView = 0;
  hint = 0;
  hintAction = null;
  const [id, selection, tier, code] = location.hash.slice(1).split('/');
  current = null;
  if (!gameIds.includes(id)) {
    home();
    if (id === 'collection') app.querySelector('#collection')?.focus();
    return;
  }
  const game = games[id];
  const random = selection === 'random' && /^[0-2]$/.test(tier) && /^\d{1,10}$/.test(code) && Number(code) <= 0xffffffff;
  const found = campaign[id].find(level => level.id === selection);
  const level = random ? {...game.engine.generate(Number(code), Number(tier)), title: '随机关卡'} : found ?? campaign[id][0];
  const slot = random ? `${id}/random` : `${id}/${level.id}`;
  const identity = random ? `${tier}/${code}` : level.id;
  const record = data.sessions[slot];
  const history = record?.identity === identity && Array.isArray(record.history) ? record.history : [];
  current = {id, game, level, slot, identity, history, random};
  data.last = random ? `#${id}/random/${identity}` : `#${id}/${level.id}`;
  save();
  play();
  app.querySelector('h1').focus();
}

function play(refocus, announcement) {
  const {id, game, level, history, random, slot} = current;
  const state = history.at(-1) ?? level.initial;
  const moves = history.length;
  const solved = game.engine.won(level, state);
  const hintText = hint === 1 ? game.tip : hint === 2
    ? (hintAction ? game.clue(level, hintAction) : '当前局面已无法抵达目标。可以撤销几步，或重置后重新尝试。') : '';
  const next = random ? `#${id}/random/${level.difficulty}/${seed()}` : Number(level.id) < campaign[id].length ? `#${id}/${Number(level.id) + 1}` : `#${id}/random/0/${seed()}`;
  const [filled, all] = id === 'flood' ? game.engine.coverage(level, state) : [];
  const remaining = level.par + 1 - moves;
  const limited = id === 'flood';
  const failed = state.failed || (limited && remaining <= 0 && !solved);
  const failure = state.failed ? '你触碰了黑暗。撤销一步，错开两条轨迹后再试。' : '步数已用尽。撤销一步调整染色顺序，或重置后再试。';
  const objective = typeof game.objective === 'function' ? game.objective(level) : game.objective;
  const best = Number.isInteger(data.best[slot]) ? data.best[slot] : '—';
  const clear = solved ? `<div class="clear-overlay"><div class="clear-sigil"><i></i><b>✓</b></div><p>MECHANISM COMPLETE</p><h2>挑战成功</h2><span>${game.clear}</span><a class="primary" href="${next}">${random ? '新的挑战' : Number(level.id) < campaign[id].length ? '下一关' : '继续挑战'}<b>→</b></a></div>` : '';
  app.innerHTML = `<div class="game-nav"><a href="#">${icon('levels')}游戏大厅</a><span>/</span><span>${game.source}</span><span>/</span><strong>${game.title}</strong></div>
  <div class="workbench ${id}">
    <section class="play-panel ${solved ? 'cleared' : failed ? 'failed' : ''}" aria-labelledby="game-title">
      <div class="game-heading"><div><div class="game-kicker"><span>${game.location}</span><i></i>${game.english}</div><h1 id="game-title" tabindex="-1">${game.title}<small>${random ? '随机关卡' : `第${['一','二','三','四','五','六','七','八','九'][Number(level.id) - 1]}关 · ${level.title}`}</small></h1></div><span class="difficulty-badge">${difficulties[level.difficulty]}模式</span></div>
      <div class="board-area"><div class="board-content">${game.draw(level, state, false, hint > 1 ? hintAction : null, selected, modelView)}</div>${clear}<span class="corner-mark top-left"></span><span class="corner-mark top-right"></span><span class="corner-mark bottom-left"></span><span class="corner-mark bottom-right"></span></div>
      <div class="play-status"><div class="stats"><span>当前操作 <strong>${moves}</strong> 步</span><i></i><span>最佳记录 <strong>${best}</strong></span>${limited ? `<i></i><span>剩余步数 <strong>${Math.max(remaining, 0)}</strong></span><i></i><span>目标色格 <strong>${filled}/${all}</strong></span>` : `<i></i><span>参考步数 <strong>${level.par}</strong></span>`}</div><span class="autosave">进度已自动保存</span></div>
      <div class="controls">
        <button class="quiet" data-command="undo" ${moves ? '' : 'disabled'}>${icon('undo')}撤销</button>
        <button class="quiet" data-command="reset" ${moves ? '' : 'disabled'}>${icon('reset')}重置</button>
        <button class="quiet hint-button" data-command="hint" ${solved || failed || (hint === 2 && !hintAction) ? 'disabled' : ''}>${icon('hint')}${['玩法提示', '标出位置', hintAction ? '执行提示' : '无可用提示'][hint]}</button>
      </div>
      <div class="feedback" role="status">${failed ? failure : hintText || announcement || (solved ? '机关已完成，进度与最佳记录已保存。' : '')}</div>
    </section>
    <aside class="level-panel" aria-label="玩法目标与关卡选择">
      <section class="objective-panel"><p class="panel-kicker">OBJECTIVE</p><h2>玩法目标</h2><p>${objective}</p><div class="rule-details"><span>操作说明</span><p>${game.rule}</p></div></section>
      <section class="levels-section"><div class="level-title"><h2>关卡选择</h2><span>${done(id)} / ${campaign[id].length}</span></div>
      ${difficulties.map((name, tier) => `<div class="tier"><h3><span>0${tier + 1}</span>${name}模式</h3><div class="level-grid">
        ${campaign[id].filter(item => item.difficulty === tier).map(item => {
          const cleared = Number.isInteger(data.best[`${id}/${item.id}`]);
          return `<a href="#${id}/${item.id}" ${!random && item.id === level.id ? 'aria-current="page"' : ''} aria-label="${item.id}. ${item.title}${cleared ? '，已完成' : ''}"><span>${String(item.id).padStart(2, '0')}</span>${cleared ? '<small aria-hidden="true">✓</small>' : ''}</a>`;
        }).join('')}</div></div>`).join('')}</section>
      <form id="random-form"><div><span>无尽推演</span><small>使用随机种子生成全新关卡</small></div><div class="random-controls"><select id="difficulty" aria-label="随机关卡难度">${difficulties.map((label, i) => `<option value="${i}" ${i === level.difficulty ? 'selected' : ''}>${label}模式</option>`).join('')}</select><button class="primary">生成关卡</button></div></form>
      <p class="keyboard">${game.movement ? '方向键 / 滑动 / 点击相邻格移动' : id === 'mosaic' ? '鼠标或触屏拖拽 · 点击两格交换' : '鼠标 / 触屏直接操作 · Tab 切换控件'}</p>
    </aside>
  </div>`;
  if (refocus) {
    const target = app.querySelector(refocus);
    const fallback = app.querySelector('.clear-overlay a') ?? app.querySelector('[data-cell], [data-color], [data-move], [data-cube], [data-piece], [data-relay]');
    (target?.disabled ? fallback : target)?.focus({preventScroll: true});
  }
}

function update(action, refocus) {
  const {id, game, level, history, slot, identity, random} = current;
  const state = history.at(-1) ?? level.initial;
  if (action === 'undo') history.pop();
  else if (action === 'reset') history.length = 0;
  else {
    if (state.failed || game.engine.won(level, state) || (id === 'flood' && history.length >= level.par + 1)) return;
    const next = game.engine.reduce(level, state, action);
    if (next === state) {
      if (game.movement) play(refocus, '这个方向无法移动。换个方向，或先绕到箱子的另一侧。');
      if (current.id === 'circuit') play(refocus, '没有可放置的继电石。点击已放置的继电石可先将其取回。');
      if (current.id === 'flood') play(refocus, '这片画格已经是所选颜色，请选择其他颜色或画格。');
      return;
    }
    history.push(next);
    if (!random && game.engine.won(level, next)) data.best[slot] = Math.min(data.best[slot] ?? Infinity, history.length);
  }
  if (action === 'undo' || action === 'reset' || action.type === 'swap') selected = null;
  data.sessions[slot] = {identity, history};
  hint = 0;
  hintAction = null;
  save();
  play(refocus, action === 'undo' ? '已撤销上一步。' : action === 'reset' ? '机关已恢复到初始状态。' : '');
  if (typeof action === 'object' && !data.preferences.motion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    playMotion(app, level, state, history.at(-1) ?? level.initial, action);
  }
}

const suppressClick = connectGestures(app, {
  swap: (i, j) => update({type: 'swap', i, j}, `[data-piece="${j}"]`),
  move: input => {
    if (!current?.game.movement) return;
    const {level, history} = current;
    const {p} = history.at(-1) ?? level.initial;
    const direction = typeof input === 'string' ? input : directions.find(key => step(p, level.n, key) === input);
    if (direction) update({type: 'move', direction});
  }
});

app.addEventListener('click', event => {
  const collection = event.target.closest?.('[data-collection]');
  if (collection) {
    event.preventDefault();
    app.querySelector('#collection').focus();
    return;
  }
  if (!current) return;
  const button = event.target.closest('button');
  if (!button || (button.dataset.piece !== undefined && suppressClick())) return;
  const {cell, color, command, cube, move, piece, turn, view, relay} = button.dataset;
  if (relay !== undefined) return update({type: 'relay', i: Number(relay)}, `[data-relay="${relay}"]`);
  if (view !== undefined) {
    modelView = (modelView + 1) % 4;
    return play('[data-view]');
  }
  if (move !== undefined) return update({type: 'move', direction: move}, `[data-move="${move}"]`);
  if (cube !== undefined) return update({type: 'cube', i: Number(cube)}, `[data-cube="${cube}"]`);
  if (piece !== undefined) {
    const i = Number(piece);
    const focus = `[data-piece="${piece}"]`;
    if (selected !== null && selected !== i) return update({type: 'swap', i: selected, j: i}, focus);
    selected = selected === i ? null : i;
    return play(focus);
  }
  if (turn !== undefined && selected !== null) return update({type: 'turn', i: selected}, '[data-turn]');
  if (cell !== undefined) {
    const i = Number(cell);
    const focus = `[data-cell="${cell}"]`;
    if (current.id === 'flood') {
      if (selected === null) return play(focus, '请先在右侧选择一种颜料，再点击画框中的格子。');
      return update({type: 'paint', i, color: selected}, focus);
    }
    return update(current.game.action(current.level.mirrors?.indexOf(i) ?? i), focus);
  }
  if (color !== undefined) {
    selected = Number(color);
    return play(`[data-color="${color}"]`, `已选择颜料，点击画框中的格子开始染色。`);
  }
  if (command === 'hint') {
    const selector = '[data-command="hint"]';
    if (hint === 2 && hintAction) return update(hintAction, selector);
    if (hint === 0) hint = 1;
    else {
      const {game, level, history} = current;
      hintAction = game.engine.solve(level, history.at(-1) ?? level.initial)?.[0];
      hint = 2;
    }
    play(selector);
  } else if (command) update(command, `[data-command="${command}"]`);
});

document.addEventListener('keydown', event => {
  const offsets = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};
  const delta = offsets[event.key];
  if (current?.game.movement && !settings.open && event.target.tagName !== 'SELECT' && event.target.tagName !== 'INPUT') {
    const direction = delta ? event.key.slice(5).toLowerCase() : event.key === ' ' && current.id === 'echo' && !event.target.closest('button, a') ? 'wait' : null;
    if (direction && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      return update({type: 'move', direction}, `[data-move="${direction}"]`);
    }
  }
  if (!current || !delta) return;
  const {cell, color} = event.target.dataset;
  if (cell === undefined && color === undefined) return;
  event.preventDefault();
  if (color !== undefined) {
    const length = current.level.colors;
    const next = (Number(color) + delta[0] + delta[1] + length) % length;
    app.querySelector(`[data-color="${next}"]`)?.focus();
    return;
  }
  const {n} = current.level;
  let row = Math.floor(Number(cell) / n) + delta[0];
  let column = Number(cell) % n + delta[1];
  while (row >= 0 && row < n && column >= 0 && column < n) {
    const target = app.querySelector(`[data-cell="${row * n + column}"]`);
    if (target) { target.focus(); return; }
    row += delta[0];
    column += delta[1];
  }
});

app.addEventListener('submit', event => {
  if (event.target.id !== 'random-form') return;
  event.preventDefault();
  location.hash = `${current.id}/random/${event.target.querySelector('select').value}/${seed()}`;
});

document.querySelector('#settings-button').onclick = () => settings.showModal();
for (const name of ['motion', 'symbols']) {
  const field = document.querySelector(`#${name}`);
  const apply = () => document.documentElement.dataset[name] = String(field.checked);
  field.checked = data.preferences[name];
  field.onchange = () => { data.preferences[name] = field.checked; apply(); save(); };
  apply();
}

const install = document.querySelector('#install');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  install.hidden = false;
});
install.onclick = async () => {
  await installPrompt?.prompt();
  installPrompt = null;
  install.hidden = true;
};
if (!matchMedia('(display-mode: standalone)').matches) document.querySelector('#install-help').hidden = false;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    document.querySelector('#offline').textContent = '可离线游玩';
  }).catch(() => {});
}

window.addEventListener('hashchange', route);
route();
