const ease = 'cubic-bezier(.22,.76,.28,1)';

export function playMotion(root, level, before, after, action) {
  const animate = (selector, frames, duration = 230) => root.querySelector(selector)?.animate(frames, {duration, easing: ease});
  const slide = (selector, from, to) => {
    if (from === to) return;
    const x = (from % level.n - to % level.n) * 100;
    const y = (Math.floor(from / level.n) - Math.floor(to / level.n)) * 100;
    animate(selector, [{translate: `${x}% ${y}%`}, {translate: '0% 0%'}], 215);
  };
  switch (action.type) {
    case 'rotate': {
      const mirror = level.mirrors[action.i];
      const turned = after & (1 << action.i) ? 45 : -45;
      animate(`[data-cell="${mirror}"] .mirror-piece`, [
        {transform: `rotate(${-turned}deg)`}, {transform: `rotate(${turned}deg)`}
      ]);
      break;
    }
    case 'fire': {
      animate('.beam-core', [{strokeDashoffset: '1'}, {strokeDashoffset: '0'}], 560);
      animate('.beam-halo', [{opacity: 0}, {opacity: .55}], 610);
      break;
    }
    case 'paint': {
      const tiles = root.querySelectorAll('.pigment .cell');
      const limit = level.n;
      after.split('').forEach((color, i) => {
        if (color === before[i]) return;
        const old = document.createElement('i');
        old.className = `paint-before c${before[i]}`;
        tiles[i].append(old);
        const delay = 30 * (Math.abs(i % limit - action.i % limit) + Math.abs(Math.floor(i / limit) - Math.floor(action.i / limit)));
        const animation = old.animate([{opacity: 1, clipPath: 'inset(0% round 5px)'}, {opacity: .15, clipPath: 'inset(42% round 30%)'}], {duration: 240, delay, fill: 'backwards', easing: ease});
        animation.onfinish = () => old.remove();
      });
      break;
    }
    case 'move': {
      slide('[data-token="player-token"]', before.p, after.p);
      if (after.shadow !== undefined) slide('[data-token="echo-token"]', before.shadow, after.shadow);
      const pushed = before.boxes?.find(i => !after.boxes.includes(i));
      const moved = after.boxes?.find(i => !before.boxes.includes(i));
      if (pushed !== undefined) slide(`[data-token="crate-token"][data-position="${moved}"]`, pushed, moved);
      if (after.failed) animate('.walk-board', [{filter: 'brightness(1.35) sepia(.9)'}, {filter: 'none'}], 380);
      break;
    }
    case 'swap':
      slide(`[data-piece="${action.i}"]`, action.j, action.i);
      slide(`[data-piece="${action.j}"]`, action.i, action.j);
      break;
    case 'turn': {
      const prior = before[action.i] % 4 * 90;
      animate(`[data-piece="${action.i}"] svg`, [{transform: `rotate(${prior}deg)`}, {transform: `rotate(${prior + 90}deg)`}]);
      break;
    }
    case 'toggle':
      for (let i = 0; i < level.n ** 2; i++) {
        if ((before ^ after) & (1 << i)) animate(`[data-cell="${i}"]`, [{filter: 'brightness(.72)'}, {filter: 'none'}], 280);
      }
      break;
    case 'relay':
      animate(`[data-relay="${action.i}"]`, [{scale: '.84'}, {scale: '1'}], 220);
      animate('.circuit-wires', [{opacity: .2}, {opacity: 1}], 330);
      break;
    case 'cube':
      animate(`[data-cube="${action.i}"]`, [{scale: '.8'}, {scale: '1'}], 200);
      animate(`.isometric [data-voxel="${action.i}"]`, [{opacity: .2}, {opacity: 1}], 260);
      break;
  }
}

export function connectGestures(root, {swap, move}) {
  let gesture;
  let blockClickUntil = 0;

  function finish() {
    if (!gesture) return;
    gesture.piece?.classList.remove('drag-source');
    gesture.ghost?.remove();
    gesture = null;
  }

  root.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const piece = event.target.closest('[data-piece]');
    const board = piece?.closest('.picture') ?? event.target.closest('.workbench .walk-board');
    if (!board) return;
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, board, piece};
  });

  root.addEventListener('pointermove', event => {
    if (!gesture?.piece || event.pointerId !== gesture.id) return;
    if (!gesture.ghost) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 9) return;
      gesture.board.setPointerCapture(event.pointerId);
      const tile = gesture.piece;
      const rect = tile.getBoundingClientRect();
      const ghost = tile.cloneNode(true);
      ghost.removeAttribute('data-piece');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.className = 'drag-ghost';
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      document.body.append(ghost);
      tile.classList.add('drag-source');
      gesture.ghost = ghost;
    }
    gesture.ghost.style.left = `${event.clientX}px`;
    gesture.ghost.style.top = `${event.clientY}px`;
  });

  globalThis.addEventListener?.('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const {piece, ghost, board, x, y} = gesture;
    finish();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (piece) {
      if (!ghost) return;
      blockClickUntil = Date.now() + 100;
      const destination = target?.closest('[data-piece]');
      if (destination && destination !== piece && board.contains(destination)) {
        swap(Number(piece.dataset.piece), Number(destination.dataset.piece));
      }
      return;
    }
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    if (Math.hypot(dx, dy) > 27) {
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    } else {
      const floor = target?.closest('[data-floor]');
      if (floor && board.contains(floor)) move(Number(floor.dataset.floor));
    }
  });
  globalThis.addEventListener?.('pointercancel', finish);
  return () => Date.now() < blockClickUntil;
}
