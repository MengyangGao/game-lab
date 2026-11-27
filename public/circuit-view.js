import * as circuit from './games/circuit.js';
import {bit, popcount} from './games/common.js';
import {atmosphere, crystal, entity, floorTiles, isoPoint, position, sceneSvg} from './scene.js';

function draw(level, state, preview, hint) {
  const {lit, edges} = circuit.network(level, state);
  const prefix = 'electro';
  const wires = edges.map(([a, b]) => {
    const p = isoPoint(level.n, a);
    const q = isoPoint(level.n, b);
    return `<line x1="${p.x}" y1="${p.y - 43}" x2="${q.x}" y2="${q.y - 43}" pathLength="1"/>`;
  }).join('');
  const node = (i, kind, index) => {
    const powered = lit.has(i);
    const occupied = index !== undefined && Boolean(state & bit(index));
    const content = kind === 'socket' && !occupied ? '' : crystal(prefix, true);
    const classes = `circuit-node ${kind} ${powered ? 'powered' : ''} ${occupied ? 'conducts' : ''} ${hint?.i === index && index !== undefined ? 'marked' : ''}`;
    const extra = `data-circuit-kind="${kind}"`;
    if (preview || index === undefined) return entity(level.n, i, classes, content, kind === 'source' ? '放电石' : '聚电石', extra);
    return `<button type="button" class="scene-entity ${classes}" style="${position(isoPoint(level.n, i))}" data-relay="${index}" data-circuit-kind="${kind}" aria-pressed="${occupied}" aria-label="${occupied ? '取回此处的继电石' : '在此放置继电石'}">${content}<i class="socket-ring"></i></button>`;
  };
  const content = `${floorTiles(level.n, prefix)}<g class="circuit-wires" filter="url(#${prefix}-glow)">${wires}</g>`;
  return `<div class="circuit-shell"><div class="board scene-board circuit-board" style="--n:${level.n}">${atmosphere(prefix, '#a27de0')}${sceneSvg(prefix, 'electro', content)}${node(level.source, 'source')}${level.targets.map(i => node(i, 'receiver')).join('')}${level.sockets.map((i, index) => node(i, 'socket', index)).join('')}<span class="scene-caption">稻妻 · 导电机关</span></div>${preview ? '' : `<div class="circuit-inventory"><span>继电石</span><strong>${level.capacity - popcount(state)}</strong><small>/ ${level.capacity} 可放置</small><i></i><span>聚电石导通</span><strong>${level.targets.filter(i => lit.has(i)).length} / ${level.targets.length}</strong></div>`}</div>`;
}

export const circuitGame = {
  engine: circuit, title: '继电石', english: 'RELAY STONE', source: '原神',
  location: '稻妻 · 导电机关', tags: '电路连接', summary: '布设继电石，将放电石的电流传导至聚电石。',
  objective: '移动继电石，让放电石放出的电流顺利传导至所有聚电石。',
  rule: '点击圆形基座放置或取回继电石。距离足够近的放电石、继电石与聚电石会自动连通。',
  tip: '先观察最远的聚电石。合理的中继位置可以同时连接两条支路，节省有限的继电石。',
  clue: (_, action) => `调整描边基座上的继电石，观察紫色电流是否向聚电石延伸。`,
  clear: '电流已顺利传导，所有聚电石均被点亮。',
  draw
};
