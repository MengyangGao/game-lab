import {games} from './views.js';
import {campaign} from './campaign.js';
import {readSave, writeSave} from './storage.js';
import {connectGestures, playMotion} from './motion.js';
import {directions, step} from './games/common.js';

const app = document.querySelector('#app');
const settings = document.querySelector('#settings');
const difficulties = ['入门', '进阶', '挑战'];
const gameIds = Object.keys(games);
const data = readSave();

let current;
let hint = 0;
let hintAction;
let selected = null;
let modelView = 0;
let installPrompt;

function save() {
  if (!writeSave(data)) document.querySelector('#offline').textContent = '无法写入本地存档';
}

function done(id) {
  return campaign[id].filter(level => Number.isInteger(data.best[`${id}/${level.id}`])).length;
}

function home() {
  const total = Object.keys(games).reduce((sum, id) => sum + done(id), 0);
  const last = /^#[a-z]+\/(?:[1-9]|random\/[0-2]\/\d{1,10})$/.test(data.last)
    && gameIds.includes(data.last.split('/')[0].slice(1)) ? data.last : null;
  const totalLevels = Object.values(campaign).reduce((sum, levels) => sum + levels.length, 0);
  app.innerHTML = `<section class="hero"><div class="hero-copy">
    <span class="eyebrow"><span>✦</span> 休闲益智合集</span>
    <h1>留一点时间<br>给<span>好奇心。</span></h1>
    <p>从一束光、一抹颜色或一盏灯开始。<br>几分钟一题，想玩就打开。</p>
    <a class="primary" href="${last || '#mirror/1'}">${last ? '继续上次的谜题' : '开始第一题'}</a>
  </div><div class="hero-art" aria-hidden="true">
    <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
    <div class="art-tile art-purple">✦</div><div class="art-tile art-orange">◒</div>
    <div class="art-tile art-green">◈</div><i class="art-spark">✦</i><i class="art-dot"></i>
  </div></section>
  <section aria-labelledby="collection"><div class="section-heading">
    <div><h2 id="collection">选择一间实验室</h2><p>每种玩法都有固定关卡和随机挑战。</p></div>
    <span class="progress-pill">已完成 ${total} / ${totalLevels}</span>
  </div><div class="cards">${Object.entries(games).map(([id, game]) => {
    const sample = campaign[id][4];
    return `<article class="card ${id}"><a href="#${id}/${campaign[id].find(level => data.best[`${id}/${level.id}`] === undefined)?.id ?? 1}">
      <div class="card-preview" aria-hidden="true">${game.draw(sample, sample.initial, true)}</div>
      <div class="card-info"><div class="card-meta"><span>${game.english}</span><span>${game.tags}</span></div>
      <h3>${game.title}</h3><p>${game.summary}</p>
      <div class="card-bottom"><span>已完成 ${done(id)} / 9</span><span class="card-enter">进入实验室</span></div></div>
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
    return;
  }
  const game = games[id];
  const random = selection === 'random' && /^[0-2]$/.test(tier) && /^\d{1,10}$/.test(code) && Number(code) <= 0xffffffff;
  const found = campaign[id].find(level => level.id === selection);
  const level = random ? {...game.engine.generate(Number(code), Number(tier)), title: '随机实验'} : found ?? campaign[id][0];
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
    ? (hintAction ? game.clue(level, hintAction) : '从当前局面无法到达目标。可以撤销几步或重置。') : '';
  const next = random ? `#${id}/random/${level.difficulty}/${seed()}` : Number(level.id) < 9 ? `#${id}/${Number(level.id) + 1}` : `#${id}/random/0/${seed()}`;
  const [filled, all] = id === 'flood' ? game.engine.coverage(level, state) : [];
  const remaining = level.par + 1 - moves;
  const limited = id === 'flood';
  const failed = state.failed || (limited && remaining <= 0 && !solved);
  const failure = state.failed ? '撞上了回声。撤销一步，再试一条路线。' : '颜料用完了。撤销一步再试。';
  const measure = limited ? `颜料余量 <strong>${Math.max(remaining, 0)}</strong> · 目标色 ${filled}/${all}`
    : `<strong>${moves}</strong> 步 <span>·</span> 最少 ${level.par} 步`;
  app.innerHTML = `<div class="game-nav"><a href="#">全部实验室</a><span>/</span><span>${game.title}</span></div>
  <div class="workbench ${id}">
    <section class="play-panel ${solved ? 'cleared' : failed ? 'failed' : ''}" aria-labelledby="game-title">
      <div class="game-heading"><div><div class="game-kicker">${game.title}</div><h1 id="game-title" tabindex="-1">${level.title}</h1></div><span class="progress-pill">${difficulties[level.difficulty]}</span></div>
      <p class="rules">${game.rule}</p>
      <div class="board-area">${game.draw(level, state, false, hint > 1 ? hintAction : null, selected, modelView)}</div>
      <div class="stats">${limited ? `<span class="steps"><strong>${moves}</strong> 步</span> <span>·</span> ` : ''}${measure}${Number.isInteger(data.best[slot]) ? ` · 最佳 ${data.best[slot]} 步` : ''}</div>
      <div class="controls">
        <button class="quiet" data-command="undo" ${moves ? '' : 'disabled'}>撤销</button>
        <button class="quiet" data-command="reset" ${moves ? '' : 'disabled'}>重置</button>
        <button class="quiet" data-command="hint" ${solved || failed || (hint === 2 && !hintAction) ? 'disabled' : ''}>${['提示', '标出位置', hintAction ? '执行提示' : '无可用提示'][hint]}</button>
      </div>
      <div class="feedback" role="status">${solved ? `<strong>实验完成！</strong><a class="primary" href="${next}">${random ? '再来一题' : '下一题'}</a>` : failed ? failure : hintText || announcement || ''}</div>
    </section>
    <aside class="level-panel" aria-label="选择关卡">
      <h2>关卡选择</h2>
      ${difficulties.map((name, tier) => `<div class="tier"><h3>${name}</h3><div class="level-grid">
        ${campaign[id].filter(item => item.difficulty === tier).map(item => {
          const cleared = Number.isInteger(data.best[`${id}/${item.id}`]);
          return `<a href="#${id}/${item.id}" ${!random && item.id === level.id ? 'aria-current="page"' : ''} aria-label="${item.id}. ${item.title}${cleared ? '，已完成' : ''}">${item.id}${cleared ? '<small aria-hidden="true">✓</small>' : ''}</a>`;
        }).join('')}</div></div>`).join('')}
      <form id="random-form"><label for="difficulty">随机实验</label><select id="difficulty">
      ${difficulties.map((label, i) => `<option value="${i}" ${i === level.difficulty ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <button class="primary">生成新关卡</button></form>
      <p class="keyboard">${game.movement ? '滑动棋盘、点相邻格或用方向键移动。' : id === 'mosaic' ? '拖动画片或依次选两格。' : 'Tab 切换控件，Enter 或空格操作。'}</p>
    </aside>
  </div>`;
  if (refocus) {
    const target = app.querySelector(refocus);
    const fallback = app.querySelector('.feedback a') ?? app.querySelector('[data-cell], [data-color], [data-move], [data-cube], [data-piece]');
    (target?.disabled ? fallback : target)?.focus({preventScroll: true});
  }
}

function update(action, refocus) {
  const {game, level, history, slot, identity, random} = current;
  const state = history.at(-1) ?? level.initial;
  if (action === 'undo') history.pop();
  else if (action === 'reset') history.length = 0;
  else {
    if (state.failed || game.engine.won(level, state) || (current.id === 'flood' && history.length >= level.par + 1)) return;
    const next = game.engine.reduce(level, state, action);
    if (next === state) {
      if (game.movement) play(refocus, '这一步无法移动。');
      return;
    }
    history.push(next);
    if (!random && game.engine.won(level, next)) data.best[slot] = Math.min(data.best[slot] ?? Infinity, history.length);
  }
  if (action === 'undo' || action === 'reset' || action.type === 'swap' || action.type === 'paint') selected = null;
  data.sessions[slot] = {identity, history};
  hint = 0;
  hintAction = null;
  save();
  play(refocus, action === 'undo' ? '已撤销一步。' : action === 'reset' ? '已重置关卡。' : '');
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
  if (!current || suppressClick()) return;
  const button = event.target.closest('button');
  if (!button) return;
  const {cell, color, command, cube, move, piece, turn, view} = button.dataset;
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
      selected = i;
      return play(focus);
    }
    return update(current.game.action(current.level.mirrors?.indexOf(i) ?? i), focus);
  }
  if (color !== undefined) {
    const focus = `[data-color="${color}"]`;
    if (selected === null) return play(focus, '先选一片要染色的区域。');
    return update({type: 'paint', i: selected, color: Number(color)}, focus);
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
