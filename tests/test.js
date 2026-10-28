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
throws('code ligue faux refusé', () => call('register', { phone: '06 12 34 56 78', pseudo: 'Lea', pin: '123456', code: 'FAUX' }), /Code de ligue/);
const lea = call('register', { phone: '06 12 34 56 78', pseudo: 'Lea', pin: '123456', code: 'rhum2026' });
const tom = call('register', { phone: '06 12 34 56 78', pseudo: 'Tom', pin: 'abcd12', code: 'RHUM2026' });
throws('pseudo doublon refusé', () => call('register', { phone: '06 12 34 56 78', pseudo: 'lea', pin: '123456', code: 'RHUM2026' }), /déjà pris/);
throws('jeton falsifié refusé', () => call('me', { token: lea.token.slice(0, -3) + 'AAA' }), /Session expirée/);
throws('jeton d\'un autre refusé (pseudo modifié)', () => { const [p, s] = lea.token.split('.'); const o = JSON.parse(Buffer.from(p, 'base64url')); o.p = 'Malo'; call('me', { token: Buffer.from(JSON.stringify(o)).toString('base64url') + '.' + s }); }, /Session expirée/);

const sk = call('config', {}).skippers;
ok('compte skippers: 8/10/22/49', () => assert.deepEqual([sk.ULTIM, sk.OCEAN50, sk.IMOCA, sk.CLASS40].map(a => a.length), [8, 10, 22, 49]));
const nm = (c, i) => sk[c][i].name;
throws('top incomplet refusé', () => call('savePicks', { token: lea.token, picks: { ULTIM: [nm('ULTIM', 0), nm('ULTIM', 1)] } }), /exactement 5/);
throws('doublon refusé', () => call('savePicks', { token: lea.token, picks: { ULTIM: [0, 0, 1, 2, 3].map(i => nm('ULTIM', i)) } }), /deux fois/);
throws('skipper inconnu refusé', () => call('savePicks', { token: lea.token, picks: { ULTIM: ['Zorro'].concat([0, 1, 2, 3].map(i => nm('ULTIM', i))) } }), /inconnu/);

const U = [0, 1, 2, 3, 4].map(i => nm('ULTIM', i)), C40 = [0, 1, 2, 3, 4].map(i => nm('CLASS40', i));
call('savePicks', { token: lea.token, picks: { ULTIM: U, CLASS40: C40 } });
call('savePicks', { token: tom.token, picks: { ULTIM: U.slice().reverse() } });
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
ok('Lea 1ère: 28 + 38 = 76', () => { assert.equal(b.board[0].pseudo, 'Lea'); assert.equal(b.board[0].total, 76); });
ok('Tom: 13', () => assert.equal(b.board.find(x => x.pseudo === 'Tom').total, 13));
ok('détail visible après départ', () => { const d = call('detail', { token: tom.token, pseudo: 'Lea' }).details; assert.equal(d.ULTIM.pts, 38); });

call('adminSetRanking', { token: adm.token, ranking: { ULTIM: U.slice().reverse() } });
b = call('board', { token: tom.token });
ok('flèches: prevRank mémorisé et cache invalidé', () => { const t = b.board.find(x => x.pseudo === 'Tom'); assert.equal(t.prevRank, 2); assert.ok(t.total > 9); });

ok('parseSource_ JSON objet', () => assert.deepEqual(Object.keys(X.parseSource_(JSON.stringify({ Class40: ['A'], 'Ocean Fifty': ['B'] }))).sort(), ['CLASS40', 'OCEAN50']));
ok('matchSkipper_ tolère accents / ordre', () => { assert.equal(X.matchSkipper_('Axel Trehin', sk.CLASS40), 'Axel TRÉHIN'); assert.equal(X.matchSkipper_('RIOU Vincent', sk.CLASS40), 'Vincent RIOU'); });

call('adminResetPin', { token: adm.token, pseudo: 'Tom', pin: 'neuf99' });
ok('reset PIN → ancien jeton invalide, nouveau PIN OK', () => {
  assert.throws(() => call('me', { token: tom.token }), /Session expirée/);
  assert.equal(call('login', { pseudo: 'Tom', pin: 'neuf99' }).me.pseudo, 'Tom');
});
ok('anti force brute: 8 échecs => blocage', () => {
  for (let i = 0; i < 8; i++) assert.throws(() => call('login', { pseudo: 'Lea', pin: 'bad' + i }), /incorrect/);
  assert.throws(() => call('login', { pseudo: 'Lea', pin: '123456' }), /Trop d'essais/);
  X.cacheDel_('fail_lea'); assert.equal(call('login', { pseudo: 'Lea', pin: '123456' }).me.pseudo, 'Lea');
});
call('adminDeleteUser', { token: adm.token, pseudo: 'Tom' });
ok('suppression joueur: jeton invalide + classement à jour', () => {
  assert.throws(() => call('me', { token: tom.token }), /Session expirée|invalide/);
  assert.equal(call('board', { token: lea.token }).board.length, 1);
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
const zoe = call('register', { phone: '06 12 34 56 78', pseudo: 'Zoe', pin: '432100', code: 'fam26' });
ok('inscription via le code → bonne ligue', () => assert.equal(zoe.me.league.name, 'Famille'));
ok('classement de ligue séparé du général', () => {
  call('savePicks', { token: zoe.token, picks: { ULTIM: U } });
  const own = call('board', { token: zoe.token });
  assert.deepEqual(own.board.map(x => x.pseudo), ['Zoe']);
  assert.equal(own.leagueName, 'Famille');
  const all = call('board', { token: zoe.token, scope: 'all' });
  assert.equal(all.board.length, 2);
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

// ---- chat par ligue ----
const famId = call('adminGet', { token: adm.token }).leagues.find(l => l.name === 'Famille 2').id;
ok('lien WhatsApp: refuse un lien invalide, garde un https', () => {
  assert.throws(() => call('adminLeagueSave', { token: adm.token, id: famId, name: 'Famille 2', code: 'FAM26', wa: 'javascript:alert(1)' }), /invalide/);
  call('adminLeagueSave', { token: adm.token, id: famId, name: 'Famille 2', code: 'FAM26', wa: 'https://chat.whatsapp.com/ABC123' });
  assert.equal(call('me', { token: zoe.token }).me.league.wa, 'https://chat.whatsapp.com/ABC123');
});
call('chatSend', { token: zoe.token, text: 'Salut la famille <b>x</b>' });
X.cacheDel_('rl_zoe');
ok('chat: message visible dans sa ligue, pas dans une autre', () => {
  assert.equal(call('chatGet', { token: zoe.token }).messages.length, 1);
  assert.equal(call('chatGet', { token: lea.token }).messages.length, 0);
});
throws('chat: anti-spam 2 s', () => { call('chatSend', { token: zoe.token, text: 'a' }); call('chatSend', { token: zoe.token, text: 'b' }); }, /Doucement/);
X.cacheDel_('rl_zoe');
throws('chat: message vide refusé', () => call('chatSend', { token: zoe.token, text: '   ' }), /vide/);
ok('chat: 300 caractères max', () => { call('chatSend', { token: zoe.token, text: 'x'.repeat(500) }); const m = call('chatGet', { token: zoe.token }).messages; assert.equal(m[m.length - 1].text.length, 300); });
ok('chat: joueur ne peut pas écrire dans une autre ligue', () => {
  X.cacheDel_('rl_lea'); call('chatSend', { token: lea.token, text: 'hello', league: famId });
  assert.equal(call('chatGet', { token: zoe.token }).messages.some(m => m.pseudo === 'Lea'), false);
});
ok('chat: admin écrit dans une ligue et en annonce à toutes', () => {
  X.cacheDel_('rl_malo'); call('chatSend', { token: adm.token, text: 'Bienvenue', league: famId });
  X.cacheDel_('rl_malo'); call('chatSend', { token: adm.token, text: 'ANNONCE', all: true });
  const f = call('chatGet', { token: zoe.token }).messages, l = call('chatGet', { token: lea.token }).messages;
  assert.ok(f.some(m => m.text === 'Bienvenue' && m.role === 'admin'));
  assert.ok(f.some(m => m.text === 'ANNONCE') && l.some(m => m.text === 'ANNONCE'));
  assert.equal(l.some(m => m.text === 'Bienvenue'), false);
  assert.equal(call('chatGet', { token: adm.token, league: famId }).messages.some(m => m.text === 'Bienvenue'), true);
});
ok('chat: seul l\'admin supprime', () => {
  const m = call('chatGet', { token: zoe.token }).messages[0];
  assert.throws(() => call('chatDelete', { token: zoe.token, id: m.id }), /admin/);
  call('chatDelete', { token: adm.token, id: m.id });
  assert.equal(call('chatGet', { token: zoe.token }).messages.some(x => x.id === m.id), false);
});
ok('chat: since ne renvoie que le nouveau', () => {
  const all = call('chatGet', { token: zoe.token }).messages, last = Number(all[all.length - 1].id.split('-')[0]);
  assert.equal(call('chatGet', { token: zoe.token, since: last }).messages.length, 0);
});

// ---- l'admin ne joue pas ----
throws('admin ne peut pas faire de pronos', () => call('savePicks', { token: adm.token, picks: { ULTIM: U } }), /ne joue pas/);
ok('admin absent des classements et des compteurs', () => {
  assert.equal(call('board', { token: adm.token }).board.some(x => x.pseudo === 'Malo'), false);
  assert.equal(call('board', { token: adm.token, scope: 'all' }).board.some(x => x.pseudo === 'Malo'), false);
  const g = call('adminGet', { token: adm.token });
  assert.equal(g.leagues.reduce((a, l) => a + l.count, 0), g.users.filter(u => u.role !== 'admin').length);
});
ok('admin voit une ligue précise ou le général', () => {
  assert.deepEqual(call('board', { token: adm.token, scope: famId }).board.map(x => x.pseudo), ['Zoe']);
  assert.ok(call('board', { token: adm.token }).board.length >= 2);
});
throws('mot de passe trop court refusé', () => call('register', { phone: '06 12 34 56 78', pseudo: 'Court', pin: '1234', code: 'RHUM2026' }), /6 caractères/);
ok('mot de passe avec espaces et symboles accepté', () => { const r = call('register', { phone: '06 12 34 56 78', pseudo: 'Sym', pin: 'Mon mot de passe !é', code: 'RHUM2026' }); assert.equal(call('login', { pseudo: 'Sym', pin: 'Mon mot de passe !é' }).me.pseudo, 'Sym'); });

// ---- téléphone, mot de passe oublié, changement de mot de passe ----
throws('inscription sans téléphone refusée', () => call('register', { pseudo: 'Sans', pin: '123456', code: 'RHUM2026' }), /téléphone/);
throws('téléphone invalide refusé', () => call('register', { pseudo: 'Sans', pin: '123456', phone: '12ab', code: 'RHUM2026' }), /téléphone/);
ok('admin voit le numéro, pas les autres joueurs', () => {
  const u = call('adminGet', { token: adm.token }).users.find(x => x.pseudo === 'Zoe');
  assert.equal(u.phone, '0612345678');
  assert.equal(JSON.stringify(call('board', { token: zoe.token })).includes('0612345678'), false);
});
ok('mot de passe oublié: demande visible par l\'admin, réponse identique si pseudo inconnu', () => {
  assert.deepEqual(call('forgot', { pseudo: 'Zoe' }), { ok: true });
  assert.deepEqual(call('forgot', { pseudo: 'Inconnu' }), { ok: true });
  const rq = call('adminGet', { token: adm.token }).requests;
  assert.deepEqual(rq.map(r => r.pseudo), ['Zoe']);
});
ok('admin définit un nouveau mot de passe: la demande disparaît', () => {
  call('adminResetPin', { token: adm.token, pseudo: 'Zoe', pin: 'nouveau1' });
  assert.equal(call('adminGet', { token: adm.token }).requests.length, 0);
  assert.equal(call('login', { pseudo: 'Zoe', pin: 'nouveau1' }).me.pseudo, 'Zoe');
});
ok('changement de mot de passe par le joueur', () => {
  const t = call('login', { pseudo: 'Zoe', pin: 'nouveau1' }).token;
  assert.throws(() => call('changePassword', { token: t, pin: 'faux', newPin: 'encore12' }), /actuel incorrect/);
  assert.throws(() => call('changePassword', { token: t, pin: 'nouveau1', newPin: 'court' }), /6 caractères/);
  const r = call('changePassword', { token: t, pin: 'nouveau1', newPin: 'encore12' });
  assert.equal(call('me', { token: r.token }).me.pseudo, 'Zoe');
  assert.equal(call('login', { pseudo: 'Zoe', pin: 'encore12' }).me.pseudo, 'Zoe');
});
console.log('\n' + n + ' tests OK');
