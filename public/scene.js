export const VIEW_WIDTH = 800;
export const VIEW_HEIGHT = 520;

export function isoUnit(n) {
  return n >= 7 ? 43 : n === 6 ? 51 : 59;
}

export function isoPoint(n, i) {
  const row = Math.floor(i / n);
  const column = i % n;
  const unit = isoUnit(n);
  return {
    x: VIEW_WIDTH / 2 + (column - row) * unit,
    y: 112 + (row + column) * unit * .53
  };
}

export function sourcePoint(n, source) {
  const unit = isoUnit(n);
  return {
    x: VIEW_WIDTH / 2 + (source[1] - source[0]) * unit,
    y: 112 + (source[0] + source[1]) * unit * .53
  };
}

export const position = point => `left:${point.x / VIEW_WIDTH * 100}%;top:${point.y / VIEW_HEIGHT * 100}%`;

export function defs(prefix, tone = 'jade') {
  const palettes = {
    jade: ['#58706b', '#263a3b', '#101d25', '#91a69a'],
    snow: ['#7e8992', '#404b59', '#202a39', '#b8c2c7'],
    gold: ['#8b7950', '#403924', '#171a25', '#c2ae73'],
    electro: ['#596d66', '#2a403b', '#142526', '#91a493'],
    dream: ['#655b7e', '#302c4d', '#16182f', '#a29abf']
  };
  const colors = palettes[tone] ?? palettes.jade;
  return `<defs>
    <linearGradient id="${prefix}-tile" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset=".48" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient>
    <linearGradient id="${prefix}-edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${colors[1]}"/><stop offset="1" stop-color="#080e16"/></linearGradient>
    <linearGradient id="${prefix}-metal" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#263c40"/><stop offset=".23" stop-color="#adc1b3"/><stop offset=".3" stop-color="#405c59"/><stop offset=".72" stop-color="#172c33"/><stop offset="1" stop-color="#839487"/></linearGradient>
    <linearGradient id="${prefix}-brass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5a4428"/><stop offset=".3" stop-color="#e2c78d"/><stop offset=".48" stop-color="#79603b"/><stop offset=".8" stop-color="#c1a66d"/><stop offset="1" stop-color="#392d24"/></linearGradient>
    <linearGradient id="${prefix}-silver" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3ffff"/><stop offset=".25" stop-color="#84c5c1"/><stop offset=".48" stop-color="#233c50"/><stop offset=".7" stop-color="#d9eee0"/><stop offset="1" stop-color="#42616c"/></linearGradient>
    <radialGradient id="${prefix}-light"><stop stop-color="#f4ffff"/><stop offset=".18" stop-color="#a4fff0" stop-opacity=".95"/><stop offset=".55" stop-color="#56d9c5" stop-opacity=".24"/><stop offset="1" stop-color="#56d9c5" stop-opacity="0"/></radialGradient>
    <radialGradient id="${prefix}-violet"><stop stop-color="#f4eaff"/><stop offset=".2" stop-color="#d6a5ff"/><stop offset=".58" stop-color="#9762ed" stop-opacity=".35"/><stop offset="1" stop-color="#7040c6" stop-opacity="0"/></radialGradient>
    <filter id="${prefix}-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${prefix}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="13"/></filter>
    <filter id="${prefix}-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#02060c" flood-opacity=".75"/></filter>
  </defs>`;
}

function tilePath(point, unit) {
  const {x, y} = point;
  return `M${x} ${y - unit * .53}L${x + unit} ${y}L${x} ${y + unit * .53}L${x - unit} ${y}Z`;
}

export function floorTiles(n, prefix, className = '') {
  const unit = isoUnit(n);
  return `<g class="scene-floor ${className}">${Array.from({length: n * n}, (_, i) => {
    const point = isoPoint(n, i);
    const path = tilePath(point, unit);
    return `<path d="${path}" fill="url(#${prefix}-tile)" stroke="${i % 2 ? '#91b4a52e' : '#bdd0b23b'}" stroke-width="1.2"/>
      <path d="M${point.x - unit + 5} ${point.y + 2}L${point.x} ${point.y + unit * .53 + 9}L${point.x + unit - 5} ${point.y + 2}" fill="none" stroke="#050c14" stroke-opacity=".6" stroke-width="5"/>
      <path d="${path}" fill="none" stroke="#d3dec5" stroke-opacity=".08" stroke-width="5" transform="translate(0 3)"/>`;
  }).join('')}</g>`;
}

export function block(n, i, prefix, kind = 'wall', scale = .82, height = 52) {
  const {x, y} = isoPoint(n, i);
  const w = isoUnit(n) * scale;
  const d = w * .53;
  return `<g class="scene-block ${kind}" filter="url(#${prefix}-shadow)">
    <path d="M${x - w} ${y - height}L${x} ${y - height + d}L${x} ${y + d}L${x - w} ${y}Z" fill="url(#${prefix}-edge)" stroke="#a4b4a62b"/>
    <path d="M${x + w} ${y - height}L${x} ${y - height + d}L${x} ${y + d}L${x + w} ${y}Z" fill="#15232d" stroke="#a4b4a62b"/>
    <path d="M${x} ${y - height - d}L${x + w} ${y - height}L${x} ${y - height + d}L${x - w} ${y - height}Z" fill="url(#${prefix}-tile)" stroke="#b7c4b460" stroke-width="1.5"/>
    <path d="M${x - w + 8} ${y - height + 2}L${x} ${y - height + d - 5}L${x + w - 8} ${y - height + 2}" fill="none" stroke="#d8e0c72e"/>
    <circle cx="${x}" cy="${y - height}" r="3" fill="#0c1820" stroke="#a0ad9e66"/>
  </g>`;
}

export function entity(n, i, kind, content, label, extra = '') {
  const point = typeof i === 'object' ? i : isoPoint(n, i);
  return `<span class="scene-entity ${kind}" style="${position(point)}" data-x="${point.x}" data-y="${point.y}" ${Number.isInteger(i) ? `data-position="${i}"` : ''} ${extra} role="img" aria-label="${label}">${content}</span>`;
}

export function hit(n, i, data, label, className = '') {
  return `<button type="button" class="scene-hit ${className}" style="${position(isoPoint(n, i))}" ${data} aria-label="${label}"></button>`;
}

export function atmosphere(prefix, tone = '#6ed8c4') {
  return `<svg class="scene-atmosphere" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" aria-hidden="true">
    <defs><radialGradient id="${prefix}-atmo"><stop stop-color="${tone}" stop-opacity=".18"/><stop offset="1" stop-color="${tone}" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="400" cy="280" rx="365" ry="220" fill="url(#${prefix}-atmo)"/>
    <path d="M45 355V85h90v250M665 350V65h88v290" fill="#071019" opacity=".35"/>
    <path d="M60 105h62M60 140h62M678 96h62M678 133h62" stroke="#9ec6b7" stroke-opacity=".08" stroke-width="7"/>
    <path d="M20 432H780" stroke="#acc5b8" stroke-opacity=".1"/>
  </svg>`;
}

export function sceneSvg(prefix, tone, content, className = '') {
  return `<svg class="scene-svg ${className}" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" aria-hidden="true">${defs(prefix, tone)}${content}</svg>`;
}

export function crystal(prefix, violet = false) {
  return `<svg viewBox="-60 -125 120 135" aria-hidden="true">
    <ellipse cx="0" cy="-1" rx="38" ry="12" fill="#050b13" opacity=".65"/>
    <ellipse cx="0" cy="-42" rx="56" ry="56" fill="url(#${prefix}-${violet ? 'violet' : 'light'})"/>
    <path d="M-32-8-22-28H22L32-8 20 2H-20Z" fill="url(#${prefix}-metal)" stroke="#aec5b766"/>
    <path d="M0-111 25-72 15-30 0-17-15-30-25-72Z" fill="${violet ? '#8656bd' : '#3c9c91'}" stroke="${violet ? '#e3c1ff' : '#b9fff0'}" stroke-width="1.5"/>
    <path d="M0-111 5-36 0-17-15-30-25-72Z" fill="${violet ? '#c59aef' : '#a0e5cf'}" opacity=".55"/>
    <path d="M0-111 25-72 5-61 5-36Z" fill="#efffff" opacity=".22"/>
    <path d="M-12-73 0-96 7-73 0-53Z" fill="#f4ffff" opacity=".72" filter="url(#${prefix}-glow)"/>
    <path d="M-36-19H36M-28-28H28" stroke="url(#${prefix}-brass)" stroke-width="5"/>
  </svg>`;
}

export function person(prefix, shadow = false) {
  const main = shadow ? '#12172b' : '#e8d5a1';
  const mid = shadow ? '#353553' : '#8f6c37';
  const glow = shadow ? '#7e78c5' : '#ffd778';
  return `<svg viewBox="-55 -130 110 140" aria-hidden="true">
    <ellipse cx="0" cy="0" rx="28" ry="9" fill="#030811" opacity=".65"/>
    ${shadow ? '<ellipse cx="0" cy="-58" rx="45" ry="58" fill="url(#' + prefix + '-violet)" opacity=".4"/>' : ''}
    <path d="M-14-57-27-12-12-4 0-13 12-4 27-12 14-57Z" fill="${mid}" stroke="${glow}" stroke-opacity=".6"/>
    <path d="M-10-55-16-17 0-8 16-17 10-55Z" fill="${main}"/>
    <path d="M-17-66-27-43-19-36-8-54M17-66 27-43 19-36 8-54" fill="${mid}" stroke="${glow}" stroke-opacity=".45"/>
    <circle cx="0" cy="-80" r="18" fill="${main}" stroke="${glow}" stroke-width="2"/>
    <path d="M-18-85-9-108-2-91 9-108 18-85 11-72 0-66-11-72Z" fill="${mid}" stroke="${glow}" stroke-width="2"/>
    <path d="M-9-82-3-79M9-82 3-79" stroke="${shadow ? '#a9a2ff' : '#fff4c9'}" stroke-width="3" stroke-linecap="round" filter="url(#${prefix}-glow)"/>
    <path d="M-17-12-19 0M17-12 19 0" stroke="${mid}" stroke-width="8" stroke-linecap="round"/>
  </svg>`;
}

export function traveler(prefix, rescued = false) {
  return `<svg viewBox="-55 -140 110 150" aria-hidden="true">
    <ellipse cx="0" cy="1" rx="25" ry="8" fill="#030811" opacity=".65"/>
    ${rescued ? `<ellipse cx="0" cy="-65" rx="43" ry="65" fill="url(#${prefix}-light)" opacity=".3"/>` : ''}
    <path d="M-13-37-17-2M13-37 17-2" stroke="#172735" stroke-width="10" stroke-linecap="round"/>
    <path d="M-20-3H-8M8-3H20" stroke="#aab8b4" stroke-width="6" stroke-linecap="round"/>
    <path d="M-18-78-28-35-15-28-8-47 0-30 8-47 15-28 28-35 18-78Z" fill="#d4dedb" stroke="#f0eee0" stroke-width="1.5"/>
    <path d="M-17-72-10-38 0-30 10-38 17-72 8-83H-8Z" fill="#344c5b"/>
    <path d="M-6-78 0-48 6-78" fill="#80c6ba"/>
    <path d="M-18-74-30-47-24-40-12-59M18-74 30-47 24-40 12-59" fill="#c5d3d1" stroke="#edf0df" stroke-width="2"/>
    <path d="M-30-47-27-35M30-47 27-35" stroke="#d2b88c" stroke-width="7" stroke-linecap="round"/>
    <path d="M-10-88V-80H10V-88" fill="#d4b99a"/>
    <ellipse cx="0" cy="-103" rx="17" ry="20" fill="#dbc4aa"/>
    <path d="M-18-106Q-20-132 0-130 23-128 18-102L12-116 3-109-8-119-15-99Z" fill="#233444" stroke="#5c7079" stroke-width="1.5"/>
    <path d="M-15-104-12-91M15-104 12-91" stroke="#233444" stroke-width="5"/>
    <path d="M-8-102-3-101M8-102 3-101" stroke="#304d5c" stroke-width="2" stroke-linecap="round"/>
    <path d="M-17-79 0-71 17-79" fill="none" stroke="#b6e0d3" stroke-width="4"/>
    <path d="M-23-63-31-58M23-63 31-58" stroke="#c9ae76" stroke-width="3"/>
  </svg>`;
}

export function crate(prefix) {
  return `<svg viewBox="-70 -115 140 125" aria-hidden="true">
    <ellipse cx="0" cy="0" rx="51" ry="14" fill="#030911" opacity=".55"/>
    <path d="M-49-76 0-49 49-76 49-18 0 6-49-18Z" fill="#483222" stroke="#1d1a19" stroke-width="2"/>
    <path d="M-49-76 0-103 49-76 0-49Z" fill="#aa8050" stroke="#d1aa70" stroke-width="2"/>
    <path d="M-49-76 0-49 0 6-49-18Z" fill="#795231"/>
    <path d="M49-76 0-49 0 6 49-18Z" fill="#513923"/>
    <path d="M-43-71 0-47 43-71M-43-59 0-35 43-59M-43-24 0-1 43-24" fill="none" stroke="#c09258" stroke-opacity=".55" stroke-width="3"/>
    <path d="M-40-72-5-17M40-72 5-17" stroke="#35271f" stroke-width="9"/>
    <path d="M-40-72-5-17M40-72 5-17" stroke="#a27646" stroke-width="4"/>
    <path d="M-49-76 0-49 49-76M-49-18 0 6 49-18" fill="none" stroke="url(#${prefix}-metal)" stroke-width="7"/>
    <path d="M-48-77V-18M48-77V-18M0-49V5" stroke="url(#${prefix}-metal)" stroke-width="7"/>
    <path d="M-38-79 0-99 38-79" fill="none" stroke="#e1bc7d" stroke-opacity=".45" stroke-width="2"/>
    <circle cx="0" cy="-75" r="7" fill="url(#${prefix}-brass)" stroke="#d5bd8c"/>
  </svg>`;
}
