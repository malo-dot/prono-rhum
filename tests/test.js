const assert = require('assert'), load = require('./harness');
const X = load(__dirname + '/Code.gs');
X.setup();
const call = (action, b) => X.handle_(Object.assign({ action }, b));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('✔', name); };
const throws = (name, fn, re) => ok(name, () => assert.throws(fn, re));

ok('scoring: parfait top3 = 28', () => assert.equal(X.scoreClass_(['A', 'B', 'C'], ['A', 'B', 'C'], 3).pts, 28));
ok('scoring: bon skipper mal placé = 2', () => assert.equal(X.scoreClass_(['B', 'A', 'Z'], ['A', 'B', 'C'], 3).pts, 4));
ok('scoring: sans classement = 0', () => assert.equal(X.scoreClass_(['A', 'B', 'C'], [], 3).pts, 0));
ok('scoring: classement partiel sans bonus parfait', () => assert.equal(X.scoreClass_(['A', 'B', 'C'], ['A'], 3).pts, 8));

const adm = call('login', { pseudo: 'malo', pin: 'admin1' });
ok('login admin', () => assert.equal(adm.me.role, 'admin'));
throws('mauvais PIN refusé', () => call('login', { pseudo: 'Malo', pin: 'xxxx' }), /incorrect/);
throws('code ligue faux refusé', () => call('register', { pseudo: 'Lea', pin: '1234', code: 'FAUX' }), /Code de ligue/);
const lea = call('register', { pseudo: 'Lea', pin: '1234', code: 'rhum2026' });
const tom = call('register', { pseudo: 'Tom', pin: 'abcd', code: 'RHUM2026' });
throws('pseudo doublon refusé', () => call('register', { pseudo: 'lea', pin: '1234', code: 'RHUM2026' }), /déjà pris/);
throws('jeton falsifié refusé', () => call('me', { token: lea.token.slice(0, -3) + 'AAA' }), /Session expirée/);
throws('jeton d\'un autre refusé (pseudo modifié)', () => { const [p, s] = lea.token.split('.'); const o = JSON.parse(Buffer.from(p, 'base64url')); o.p = 'Malo'; call('me', { token: Buffer.from(JSON.stringify(o)).toString('base64url') + '.' + s }); }, /Session expirée/);

const sk = call('config', {}).skippers;
ok('compte skippers: 8/10/22/49', () => assert.deepEqual([sk.ULTIM, sk.OCEAN50, sk.IMOCA, sk.CLASS40].map(a => a.length), [8, 10, 22, 49]));
const nm = (c, i) => sk[c][i].name;
throws('top incomplet refusé', () => call('savePicks', { token: lea.token, picks: { ULTIM: [nm('ULTIM', 0), nm('ULTIM', 1)] } }), /exactement 3/);
throws('doublon refusé', () => call('savePicks', { token: lea.token, picks: { ULTIM: [nm('ULTIM', 0), nm('ULTIM', 0), nm('ULTIM', 1)] } }), /deux fois/);
throws('skipper inconnu refusé', () => call('savePicks', { token: lea.token, picks: { ULTIM: ['Zorro', nm('ULTIM', 0), nm('ULTIM', 1)] } }), /inconnu/);

const U = [0, 1, 2].map(i => nm('ULTIM', i)), C40 = [0, 1, 2, 3, 4].map(i => nm('CLASS40', i));
call('savePicks', { token: lea.token, picks: { ULTIM: U, CLASS40: C40 } });
call('savePicks', { token: tom.token, picks: { ULTIM: [U[2], U[1], U[0]] } });
ok('relecture des pronos', () => assert.deepEqual(call('me', { token: lea.token }).picks.ULTIM, U));
ok('re-sauvegarde garde les autres classes', () => { call('savePicks', { token: lea.token, picks: { ULTIM: U } }); assert.equal(call('me', { token: lea.token }).picks.CLASS40.length, 5); });
ok('une seule ligne par joueur dans Picks', () => assert.equal(X.rows_('Picks').length, 2));

ok('avant départ: détails masqués', () => {
  X.setConfig_('lockISO', new Date(Date.now() + 3600e3).toISOString());
  assert.equal(call('board', { token: tom.token }).locked, false);
  assert.equal(call('detail', { token: tom.token, pseudo: 'Lea' }).details, null);
});
throws('non-admin ne peut pas publier', () => call('adminSetRanking', { token: lea.token, ranking: {} }), /admin/);
X.setConfig_('lockISO', new Date(Date.now() - 1000).toISOString());
throws('pronos verrouillés après départ', () => call('savePicks', { token: lea.token, picks: { ULTIM: U } }), /verrouillés/);

call('adminSetRanking', { token: adm.token, ranking: { ULTIM: U, CLASS40: C40 } });
let b = call('board', { token: tom.token });
ok('premier classement: pas de flèches', () => assert.ok(b.board.every(x => x.prevRank === null)));
ok('Lea 1ère: 28 + 38 = 66', () => { assert.equal(b.board[0].pseudo, 'Lea'); assert.equal(b.board[0].total, 66); });
ok('Tom: 9', () => assert.equal(b.board.find(x => x.pseudo === 'Tom').total, 9));
ok('détail visible après départ', () => { const d = call('detail', { token: tom.token, pseudo: 'Lea' }).details; assert.equal(d.ULTIM.pts, 28); });

call('adminSetRanking', { token: adm.token, ranking: { ULTIM: [U[2], U[1], U[0]] } });
b = call('board', { token: tom.token });
ok('flèches: prevRank mémorisé et cache invalidé', () => { const t = b.board.find(x => x.pseudo === 'Tom'); assert.equal(t.prevRank, 2); assert.ok(t.total > 9); });

ok('parseSource_ JSON objet', () => assert.deepEqual(Object.keys(X.parseSource_(JSON.stringify({ Class40: ['A'], 'Ocean Fifty': ['B'] }))).sort(), ['CLASS40', 'OCEAN50']));
ok('matchSkipper_ tolère accents / ordre', () => { assert.equal(X.matchSkipper_('Axel Trehin', sk.CLASS40), 'Axel TRÉHIN'); assert.equal(X.matchSkipper_('RIOU Vincent', sk.CLASS40), 'Vincent RIOU'); });

call('adminResetPin', { token: adm.token, pseudo: 'Tom', pin: 'neuf9' });
ok('reset PIN → ancien jeton invalide, nouveau PIN OK', () => {
  assert.throws(() => call('me', { token: tom.token }), /Session expirée/);
  assert.equal(call('login', { pseudo: 'Tom', pin: 'neuf9' }).me.pseudo, 'Tom');
});
ok('anti force brute: 8 échecs => blocage', () => {
  for (let i = 0; i < 8; i++) assert.throws(() => call('login', { pseudo: 'Lea', pin: 'bad' + i }), /incorrect/);
  assert.throws(() => call('login', { pseudo: 'Lea', pin: '1234' }), /Trop d'essais/);
  X.cacheDel_('fail_lea'); assert.equal(call('login', { pseudo: 'Lea', pin: '1234' }).me.pseudo, 'Lea');
});
call('adminDeleteUser', { token: adm.token, pseudo: 'Tom' });
ok('suppression joueur: jeton invalide + classement à jour', () => {
  assert.throws(() => call('me', { token: tom.token }), /Session expirée|invalide/);
  assert.equal(call('board', { token: lea.token }).board.length, 2);
});
ok('doPost: format JSON + BUSY géré', () => {
  const r = JSON.parse(X.doPost({ postData: { contents: JSON.stringify({ action: 'config' }) } }).t);
  assert.equal(r.ok, true);
  const e = JSON.parse(X.doPost({ postData: { contents: JSON.stringify({ action: 'nimporte' }) } }).t);
  assert.equal(e.ok, false);
});

// ---- ligues (un joueur = une ligue) ----
X.setConfig_('lockISO', new Date(Date.now() + 3600e3).toISOString());
const lg = call('adminLeagueSave', { token: adm.token, name: 'Famille', code: 'FAM26' });
throws('code de ligue en doublon refusé', () => call('adminLeagueSave', { token: adm.token, name: 'Autre', code: 'fam26' }), /déjà utilisé/);
throws('non-admin ne crée pas de ligue', () => call('adminLeagueSave', { token: lea.token, name: 'X', code: 'XXXX' }), /admin/);
const zoe = call('register', { pseudo: 'Zoe', pin: '4321', code: 'fam26' });
ok('inscription via le code → bonne ligue', () => assert.equal(zoe.me.league.name, 'Famille'));
ok('classement de ligue séparé du général', () => {
  call('savePicks', { token: zoe.token, picks: { ULTIM: U } });
  const own = call('board', { token: zoe.token });
  assert.deepEqual(own.board.map(x => x.pseudo), ['Zoe']);
  assert.equal(own.leagueName, 'Famille');
  const all = call('board', { token: zoe.token, scope: 'all' });
  assert.equal(all.board.length, 3);
  assert.equal(call('board', { token: lea.token }).board.some(x => x.pseudo === 'Zoe'), false);
});
ok('déplacer un joueur met les classements à jour', () => {
  const L1 = call('adminGet', { token: adm.token }).leagues.find(l => l.name !== 'Famille').id;
  call('adminMoveUser', { token: adm.token, pseudo: 'Zoe', league: L1 });
  assert.equal(call('board', { token: lea.token }).board.some(x => x.pseudo === 'Zoe'), true);
  call('adminMoveUser', { token: adm.token, pseudo: 'Zoe', league: lg ? call('adminGet', { token: adm.token }).leagues.find(l => l.name === 'Famille').id : '' });
});
throws('supprimer une ligue non vide refusé', () => call('adminLeagueDelete', { token: adm.token, id: call('adminGet', { token: adm.token }).leagues.find(l => l.name === 'Famille').id }), /encore des joueurs/);
ok('renommer une ligue', () => {
  const id = call('adminGet', { token: adm.token }).leagues.find(l => l.name === 'Famille').id;
  call('adminLeagueSave', { token: adm.token, id: id, name: 'Famille 2', code: 'FAM26' });
  assert.equal(call('me', { token: zoe.token }).me.league.name, 'Famille 2');
});
console.log('\n' + n + ' tests OK');
