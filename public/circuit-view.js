import * as circuit from './games/circuit.js';
import {bit, popcount} from './games/common.js';

function draw(level, state, preview, hint) {
  const {lit, edges} = circuit.network(level, state);
  const at = i => [i % level.n + .5, Math.floor(i / level.n) + .5];
  const wires = edges.map(([a, b]) => {
    const [x1, y1] = at(a);
    const [x2, y2] = at(b);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('');
  const node = (i, kind, index) => {
    const [x, y] = at(i);
    const powered = lit.has(i) ? 'powered' : '';
    const occupied = index !== undefined && Boolean(state & bit(index));
    const attrs = `class="circuit-node ${kind} ${powered} ${occupied ? 'conducts' : ''} ${hint?.i === index && index !== undefined ? 'marked' : ''}" style="--x:${x};--y:${y}"`;
    if (preview || index === undefined) return `<span ${attrs} aria-hidden="true"></span>`;
    return `<button type="button" ${attrs} data-relay="${index}" aria-pressed="${occupied}" aria-label="第 ${y + .5} 行第 ${x + .5} 列继电支座"></button>`;
  };
  return `<div class="board circuit-board" style="--n:${level.n}">
    <svg class="circuit-wires" viewBox="0 0 ${level.n} ${level.n}" aria-hidden="true">${wires}</svg>
    ${node(level.source, 'source')}${level.targets.map(i => node(i, 'receiver')).join('')}
    ${level.sockets.map((i, index) => node(i, 'socket', index)).join('')}
  </div>${preview ? '' : `<div class="circuit-inventory">继电石余量 <strong>${level.capacity - popcount(state)}</strong><span></span> 已点亮 <strong>${level.targets.filter(i => lit.has(i)).length}/${level.targets.length}</strong></div>`}`;
}

export const circuitGame = {
  engine: circuit, title: '继电石', english: 'RELAY CIRCUIT', source: '原神', tags: '连通规划',
  summary: '在石台之间架起电路，点亮所有收束端。',
  rule: '铜色六边形是电源。点击圆形支座放置或取回继电石。足够近的节点会连通，导通所有菱形收束端即可完成。',
  tip: '继电石数量有限。先看最远的收束端，再找能同时服务两条支路的位置。',
  clue: (_, action) => `查看描边的支座。${action ? '这里是下一处应调整的继电石。' : ''}`,
  draw
};
