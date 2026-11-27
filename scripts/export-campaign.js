import {games} from '../public/views.js';

const levels = Object.entries(games).map(([id, game]) => {
  const records = game.engine.levels().map(level => '    ' + JSON.stringify(level)).join(',\n');
  return `  ${id}: [\n${records}\n  ]`;
});
(globalThis.print ?? console.log)('// Generated with scripts/export-campaign.js.\nexport const campaign = {\n' + levels.join(',\n') + '\n};');
