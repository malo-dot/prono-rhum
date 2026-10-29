const fs = require('fs'), load = require('./harness'), { chromium } = require('playwright');
const X = load(__dirname + '/Code.gs'); X.setup();
const call = (a, b) => X.handle_(Object.assign({ action: a }, b));
const sk = call('config', {}).skippers, nm = (c, i) => sk[c][i].name;
X.setConfig_('lockISO', new Date(Date.now() + 3 * 86400e3).toISOString());
const t = call('register', { pseudo: 'Dan', pin: '123456', phone: '0612345678', code: 'RHUM2026' }).token;
const orig = [0,1,2,3,4].map(i => nm('ULTIM', i));
call('savePicks', { token: t, picks: { ULTIM: orig } });
const order = async p => p.$$eval('.slot[data-c="ULTIM"] .t b', a => a.map(x => x.textContent));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const mode of ['touch', 'mouse']) {
    call('savePicks', { token: t, picks: { ULTIM: orig } });
    const ctx = await b.newContext(mode === 'touch' ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 900, height: 900 } });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route('https://mock.test/**', async r => { const body = JSON.parse(r.request().postData()); const out = JSON.parse(X.doPost({ postData: { contents: JSON.stringify(body) } }).t); await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) }); });
    await p.route('**/index.html', r => r.fulfill({ contentType: 'text/html', body: fs.readFileSync('index.html', 'utf8').replace(/const API_URL = '[^']*'/, "const API_URL = 'https://mock.test/exec'") }));
    await p.route(/fonts\./, r => r.abort());
    await p.goto('http://localhost/index.html'); await p.waitForSelector('.hero');
    await p.fill('#a_pseudo', 'Dan'); await p.fill('#a_pin', '123456'); await p.click('#a_go'); await p.waitForSelector('.slot.filled');
    await p.evaluate(() => document.querySelector('.slot[data-c="ULTIM"]').closest('.card').scrollIntoView({block:'start'})); await p.waitForTimeout(200);
    const slots = await p.$$('.slot[data-c="ULTIM"]'); const bx = await Promise.all(slots.map(s => s.boundingBox()));
    const cx = bx[0].x + bx[0].width / 2, y0 = bx[0].y + bx[0].height / 2, y2 = bx[2].y + bx[2].height / 2 + 5;
    
    const cdp = mode === 'touch' ? await ctx.newCDPSession(p) : null;
    const tp = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: cx, y }] });
    // 1) appui long sur le 1er, glisse vers la 3e place
    if (cdp) { await tp('touchStart', y0); await p.waitForTimeout(600); for (let k = 1; k <= 6; k++) { await tp('touchMove', y0 + (y2 - y0) * k / 6); await p.waitForTimeout(40); } await tp('touchEnd'); }
    else { await p.mouse.move(cx, y0); await p.mouse.down(); await p.waitForTimeout(600); for (let k = 1; k <= 6; k++) { await p.mouse.move(cx, y0 + (y2 - y0) * k / 6); await p.waitForTimeout(40); } await p.mouse.up(); }
    await p.waitForTimeout(300);
    await p.waitForTimeout(400); const o1 = await order(p); const exp1 = [orig[1], orig[2], orig[0], orig[3], orig[4]];
    console.log(mode, 'glisser 1→3', same(o1, exp1) ? '✔' : '✘ ' + JSON.stringify(o1)); if (!same(o1, exp1)) fail++;
    const noPicker = !(await p.$('.sheet')); console.log(mode, 'pas de fenêtre de choix après glisser', noPicker ? '✔' : '✘'); if (!noPicker) fail++;
    // 2) tap court : ouvre toujours le choix
    if (cdp) { await p.tap('.slot[data-c="ULTIM"] >> nth=0'); } else await p.click('.slot[data-c="ULTIM"] >> nth=0');
    await p.waitForSelector('.sheet', { timeout: 3000 }).then(() => console.log(mode, 'tap court ouvre le choix ✔'), () => { console.log(mode, 'tap court ✘'); fail++; });
    await p.click('#x');
    // 3) enregistrer
    await p.click('#save'); await p.waitForFunction(() => /enregistrés/.test(document.querySelector('#toast').textContent));
    const saved = call('me', { token: t }).picks.ULTIM; console.log(mode, 'enregistré en base', same(saved, exp1) ? '✔' : '✘ ' + JSON.stringify(saved)); if (!same(saved, exp1)) fail++;
    // 4) 5e → 1re
    await p.evaluate(() => document.querySelector('.slot[data-c="ULTIM"]').closest('.card').scrollIntoView({block:'start'})); await p.waitForTimeout(200);
    const bx2 = await Promise.all((await p.$$('.slot[data-c="ULTIM"]')).map(s => s.boundingBox()));
    const ya = bx2[4].y + bx2[4].height / 2, yb = bx2[0].y + 5;
    if (cdp) { await tp('touchStart', ya); await p.waitForTimeout(600); for (let k = 1; k <= 6; k++) { await tp('touchMove', ya + (yb - ya) * k / 6); await p.waitForTimeout(40); } await tp('touchEnd'); }
    else { await p.mouse.move(cx, ya); await p.mouse.down(); await p.waitForTimeout(600); for (let k = 1; k <= 6; k++) { await p.mouse.move(cx, ya + (yb - ya) * k / 6); await p.waitForTimeout(40); } await p.mouse.up(); }
    await p.waitForTimeout(300);
    const exp2 = [orig[4], orig[1], orig[2], orig[0], orig[3]]; const o2 = await order(p);
    console.log(mode, 'glisser 5→1', same(o2, exp2) ? '✔' : '✘ ' + JSON.stringify(o2)); if (!same(o2, exp2)) fail++;
    // 5) défilement normal (mouvement rapide) ne déplace rien
    if (cdp) { await tp('touchStart', ya); for (let k = 1; k <= 4; k++) { await tp('touchMove', ya - 30 * k); await p.waitForTimeout(30); } await tp('touchEnd'); await p.waitForTimeout(300); const o3 = await order(p); console.log(mode, 'défilement rapide ne déplace rien', same(o3, exp2) ? '✔' : '✘'); if (!same(o3, exp2)) fail++; }
    if (errs.length) { fail++; console.log('✘ erreurs JS', errs); }
    await ctx.close();
  }
  await b.close(); console.log(fail ? 'ÉCHECS: ' + fail : 'TOUT OK');
})().catch(e => { console.log('TEST FAIL', e.message.split('\n')[0]); process.exit(1); });
