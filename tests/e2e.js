const fs = require('fs'), load = require('./harness'), { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-claude/05d6d47b-1e69-5e0d-91f0-69cf0640d937/scratchpad/';
const X = load(__dirname + '/Code.gs'); X.setup();
const call = (a, b) => X.handle_(Object.assign({ action: a }, b));
const sk = call('config', {}).skippers, nm = (c, i) => sk[c][i].name;
X.setConfig_('lockISO', new Date(Date.now() + 3 * 86400e3).toISOString());
// quelques joueurs déjà inscrits
['Lea', 'Tom', 'Yann', 'Gwen', 'Maelle'].forEach((p, i) => { const t = call('register', { phone: '06 12 34 56 78', pseudo: p, pin: '123456', code: 'RHUM2026' }).token; call('savePicks', { token: t, picks: { ULTIM: [0, 1, 2, 3, 4].map(k => nm('ULTIM', (k + i) % 8)), CLASS40: [0, 1, 2, 3, 4].map(k => nm('CLASS40', (k * 3 + i) % 49)) } }); });
let busyLeft = 0, calls = 0;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERR', e.message, (e.stack||'').split('\n').slice(0,6).join(' | ')));
  await p.route('https://mock.test/**', async r => {
    const body = JSON.parse(r.request().postData()); calls++;
    let out;
    if (body.action === 'savePicks' && busyLeft > 0) { busyLeft--; out = { ok: false, error: 'BUSY : Trop de monde en même temps, réessaie dans quelques secondes.' }; }
    else out = JSON.parse(X.doPost({ postData: { contents: JSON.stringify(body) } }).t);
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
  });
  await p.route('**/index.html', r => r.fulfill({ contentType: 'text/html', body: fs.readFileSync('index.html', 'utf8').replace(/const API_URL = '[^']*'/, "const API_URL = 'https://mock.test/exec'") }));
  await p.goto('http://localhost/index.html'); await p.waitForSelector('.hero');
  // inscription via l'UI
  await p.click('.tabsw button[data-m=register]'); await p.fill('#a_pseudo', 'Malo2'); await p.fill('#a_pin', 'abcd12'); await p.fill('#a_phone', '0612345678'); await p.fill('#a_code', 'rhum2026'); await p.click('#a_go');
  await p.waitForSelector('.slot'); console.log('✔ inscription via l\'UI');
  // remplir ULTIM via le sélecteur
  for (let i = 0; i < 5; i++) { await p.click('.slot >> nth=' + i); await p.waitForSelector('.sheet'); await p.click('.opt:not([disabled]) >> nth=0'); }
  for (let i = 0; i < 5; i++) { await p.click('.slot >> nth=' + (5 + i)); await p.waitForSelector('.sheet'); await p.click('.opt:not([disabled]) >> nth=0'); }
  // serveur saturé : 2 refus BUSY puis OK
  busyLeft = 2; const c0 = calls; await p.click('#save'); await p.waitForFunction(() => /enregistrés/.test(document.querySelector('#toast').textContent), null, { timeout: 15000 });
  console.log('✔ enregistrement réussi malgré 2 réponses « serveur occupé » (appels:', calls - c0, ')');
  // passage au départ + classement
  X.setConfig_('lockISO', new Date(Date.now() - 1000).toISOString());
  const adm = call('login', { pseudo: 'Malo', pin: 'admin1' });
  call('adminSetRanking', { token: adm.token, ranking: { ULTIM: [0, 1, 2, 3, 4].map(i => nm('ULTIM', i)), CLASS40: [0, 3, 6, 9, 12].map(i => nm('CLASS40', i)) } });
  await p.reload(); await p.waitForSelector('.slot'); await p.click('nav.tabs button[data-t=board]'); await p.waitForSelector('.lb');
  await p.click('.lb >> nth=0'); await p.waitForSelector('.det'); console.log('✔ détail chargé à la demande');
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + '7_board_detail.png', fullPage: true });
  // chat joueur
  await p.click('nav.tabs button[data-t=chat]'); await p.waitForSelector('#c_in');
  await p.fill('#c_in', 'Salut <i>tout le monde</i>'); await p.click('#c_go');
  await p.waitForFunction(() => /Salut <i>tout le monde<\/i>/.test(document.querySelector('#msgs').textContent), null, { timeout: 10000 });
  console.log('✔ chat joueur: message envoyé et échappé (pas de HTML injecté)');
  await p.screenshot({ path: OUT + '8_chat_joueur.png', fullPage: true });
  // admin : atterrit sur Admin, pas d'onglet Pronos, absent du classement
  await p.click('#out'); await p.waitForSelector('.hero');
  await p.fill('#a_pseudo', 'Malo'); await p.fill('#a_pin', 'admin1'); await p.click('#a_go');
  await p.waitForSelector('#n_add');
  console.log('✔ admin: arrive sur Admin (carte Ligues visible)', 'pronos-tab:', await p.locator('nav.tabs button[data-t=picks]').count());
  await p.click('nav.tabs button[data-t=board]'); await p.waitForSelector('.lb');
  console.log('✔ admin absent du classement:', (await p.locator('.lb', { hasText: 'Malo' }).count()) === 0);
  await p.click('nav.tabs button[data-t=chat]'); await p.waitForSelector('#c_in');
  await p.waitForSelector('.msg'); await p.fill('#c_in', 'Bienvenue à tous !'); await p.check('#c_all'); await p.click('#c_go');
  await p.waitForFunction(() => /Bienvenue à tous/.test(document.querySelector('#msgs').textContent), null, { timeout: 10000 });
  console.log('✔ admin: annonce publiée');
  await p.screenshot({ path: OUT + '9_chat_admin.png', fullPage: true });
  await p.click('nav.tabs button[data-t=picks]'); await p.waitForSelector('.slot');
  console.log('✔ admin: vue test joueur affichée', (await p.locator('text=Mode test').count()) > 0);
  await p.click('.slot >> nth=0'); await p.waitForSelector('.sheet'); await p.click('.opt:not([disabled]) >> nth=0');
  await p.click('#save'); await p.waitForFunction(() => /Mode test/.test(document.querySelector('#toast').textContent));
  console.log('✔ admin: sauvegarde bloquée en mode test');
  await p.screenshot({ path: OUT + '10_admin_test.png', fullPage: true });
  // expiration de session simulée : jeton invalide => retour connexion
  await p.evaluate(() => localStorage.setItem('prono_token', 'x.y')); await p.reload(); await p.waitForSelector('.hero'); console.log('✔ jeton invalide => retour à la connexion');
  await b.close(); console.log('done');
})().catch(e => { console.log('E2E FAIL', e.message); process.exit(1); });
