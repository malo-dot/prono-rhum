const load = require('./harness');
const X = load(__dirname + '/../Code.gs'); X.setup();
const call = (a, b) => X.handle_(Object.assign({ action: a }, b));
const sk = call('config', {}).skippers;
const pick = (c, n) => { const a = sk[c].map(s => s.name).sort(() => Math.random() - .5).slice(0, n); return a; };
const N = 200, toks = [];
function measure(label, fn, times) {
  const r0 = X.ops.reads, w0 = X.ops.writes, t0 = process.hrtime.bigint();
  for (let i = 0; i < times; i++) fn(i);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(label.padEnd(44), 'lectures Sheet/appel:', ((X.ops.reads - r0) / times).toFixed(2).padStart(6), '| écritures/appel:', ((X.ops.writes - w0) / times).toFixed(2).padStart(5), '| CPU/appel:', (ms / times).toFixed(2) + ' ms');
}
console.log('=== ' + N + ' joueurs, Sheet qui grossit ===');
measure('inscription (écriture, sous verrou)', i => toks.push(call('register', { pseudo: 'Joueur' + i, pin: 'pin' + (1000 + i), code: 'RHUM2026' }).token), N);
measure('enregistrer ses pronos (4 classes)', i => call('savePicks', { token: toks[i], picks: { ULTIM: pick('ULTIM', 3), OCEAN50: pick('OCEAN50', 3), IMOCA: pick('IMOCA', 5), CLASS40: pick('CLASS40', 5) } }), N);
measure('connexion (avant: réécrivait toute la table)', i => call('login', { pseudo: 'Joueur' + i, pin: 'pin' + (1000 + i) }), N);
measure('ouvrir l\'app (config + me)', i => { call('config', {}); call('me', { token: toks[i] }); }, N);
X.setConfig_('lockISO', new Date(Date.now() - 1000).toISOString());
const adm = call('login', { pseudo: 'Malo', pin: 'admin1' });
call('adminSetRanking', { token: adm.token, ranking: { ULTIM: pick('ULTIM', 3), IMOCA: pick('IMOCA', 5), CLASS40: pick('CLASS40', 5), OCEAN50: pick('OCEAN50', 3) } });
measure('rafraîchir le classement (' + N + ' joueurs x 10 fois)', i => call('board', { token: toks[i % N] }), N * 10);
measure('ouvrir le détail d\'un joueur', i => call('detail', { token: toks[i], pseudo: 'Joueur' + ((i + 7) % N) }), N);
const lb = call('board', { token: toks[0] });
console.log('\nTaille de la réponse du classement :', (JSON.stringify(lb).length / 1024).toFixed(1), 'Ko pour', lb.board.length, 'joueurs (limite du cache : 100 Ko)');
const t0 = Date.now(); X.cacheDel_('board', 'rank', 'picks', 'users'); call('board', { token: toks[0] });
console.log('Recalcul complet à froid (cache vide) :', X.ops.reads, 'lectures cumulées, 1 recalcul =', (Date.now() - t0), 'ms CPU local');
