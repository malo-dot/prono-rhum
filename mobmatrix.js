const fs = require('fs'), load = require('./harness'), { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-claude/05d6d47b-1e69-5e0d-91f0-69cf0640d937/scratchpad/';
const X = load(__dirname + '/Code.gs'); X.setup();
const call = (a, b) => X.handle_(Object.assign({ action: a }, b));
const sk = call('config', {}).skippers, nm = (c, i) => sk[c][i].name;
X.setConfig_('lockISO', new Date(Date.now() + 3 * 86400e3).toISOString());
call('adminLeagueSave', { token: call('login', { pseudo: 'Malo', pin: 'admin1' }).token, name: 'Famille Sillon', code: 'SILLON26' });
['Lea', 'Tom', 'Yann'].forEach((p, i) => { const t = call('register', { pseudo: p, pin: '123456', phone: '0612345678', code: 'RHUM2026' }).token; call('savePicks', { token: t, picks: { ULTIM: [0,1,2,3,4].map(k => nm('ULTIM', (k + i) % 8)) } }); });
call('forgot', { pseudo: 'Tom' });
const devices = [['SE1 320', 320, 568], ['SE2 375', 375, 667], ['iPhone14 390', 390, 844], ['Pixel7 412', 412, 915], ['Android 360', 360, 740]];
let problems = 0;
const report = (dev, step, arr) => { if (arr && arr.length) { problems += arr.length; console.log('✘', dev, step, JSON.stringify(arr).slice(0, 600)); } };
async function audit(p) {
  return p.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    document.querySelectorAll('body *').forEach(e => {
      if (e.closest('svg') || e.closest('.seg')) return;
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      if (!r.width || cs.visibility === 'hidden' || cs.display === 'none') return;
      if (r.right > W + 1 || r.left < -1) bad.push('OVERFLOW ' + e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 30) + ' "' + e.textContent.trim().slice(0,25) + '" parent=' + e.parentElement.className + ' ' + Math.round(r.left) + '→' + Math.round(r.right));
      if ((e.tagName === 'INPUT' || e.tagName === 'SELECT') && e.type !== 'checkbox' && parseFloat(cs.fontSize) < 16) bad.push('IOS-ZOOM ' + e.id + ' fs=' + cs.fontSize);
      if ((e.tagName === 'BUTTON' || e.tagName === 'A' && e.className.includes('btn')) && r.height < 30 && !e.closest('.seg')) bad.push('SMALLTAP ' + e.textContent.trim().slice(0, 20) + ' h=' + Math.round(r.height));
    });
    if (document.documentElement.scrollWidth > W) bad.push('PAGE-SCROLLX ' + document.documentElement.scrollWidth + '>' + W);
    return bad;
  });
}
(async () => {
  const b = await chromium.launch();
  for (const [dev, w, h] of devices.filter(d => !process.argv[2] || d[1] == process.argv[2])) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.route('https://mock.test/**', async r => { const body = JSON.parse(r.request().postData()); const out = JSON.parse(X.doPost({ postData: { contents: JSON.stringify(body) } }).t); await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) }); });
    await p.route('**/index.html', r => r.fulfill({ contentType: 'text/html', body: fs.readFileSync('index.html', 'utf8').replace(/const API_URL = '[^']*'/, "const API_URL = 'https://mock.test/exec'") }));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.goto('http://localhost/index.html'); await p.waitForSelector('.hero');
    report(dev, 'auth-login', await audit(p));
    await p.tap('.tabsw button[data-m=register]'); await p.waitForSelector('#a_phone');
    report(dev, 'auth-register', await audit(p));
    // inscription
    const pseudo = 'Mob' + w;
    await p.fill('#a_pseudo', pseudo); await p.fill('#a_pin', 'secret12 '); await p.fill('#a_phone', '06 12 34 56 78'); await p.fill('#a_code', 'sillon26'); await p.tap('#a_go');
    console.log('step picks'); await p.waitForSelector('.slot', {timeout:8000}); report(dev, 'picks', await audit(p));
    await p.tap('.slot >> nth=0'); await p.waitForSelector('.sheet'); report(dev, 'picker', await audit(p));
    await p.tap('.opt:not([disabled]) >> nth=0'); await p.waitForTimeout(200);
    for (let i = 1; i < 5; i++) { await p.tap('.slot >> nth=' + i); await p.waitForSelector('.sheet'); await p.tap('.opt:not([disabled]) >> nth=0'); }
    await p.tap('#save'); await p.waitForFunction(() => /enregistrés/.test(document.querySelector('#toast').textContent), null, { timeout: 8000 });
    for (const t of ['board', 'chat', 'race']) {
      await p.tap('nav.tabs button[data-t=' + t + ']'); await p.waitForTimeout(700);
      if (t === 'chat') { await p.fill('#c_in', 'Salut depuis ' + dev); await p.tap('#c_go'); await p.waitForFunction(() => /Salut depuis/.test(document.querySelector('#msgs').textContent)); }
      report(dev, t, await audit(p));
    }
    // changer mot de passe : modal visible et dans l'écran
    console.log('step modal'); await p.tap('#chpw'); await p.waitForSelector('.dlg');
    const box = await p.evaluate(() => { const r = document.querySelector('.dlg').getBoundingClientRect(); return { ok: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, r: [r.left, r.top, r.right, r.bottom].map(Math.round) }; });
    if (!box.ok) report(dev, 'modal-offscreen', [box]);
    report(dev, 'modal', await audit(p));
    await p.tap('.dlg [data-x="0"]'); 
    console.log('step admin');
    await p.tap('#out'); await p.waitForSelector('.hero');
    await p.tap('.tabsw button[data-m=login]'); await p.fill('#a_pseudo', 'Malo'); await p.fill('#a_pin', 'admin1'); await p.tap('#a_go'); await p.waitForSelector('#s_ld'); await p.waitForTimeout(500);
    report(dev, 'admin', await audit(p));
    await p.tap('[data-rq]'); await p.waitForSelector('.dlg'); report(dev, 'admin-modal', await audit(p)); await p.tap('.dlg [data-x="0"]');
    await p.screenshot({ path: OUT + 'mm_' + w + '.png', fullPage: false });
    if (errs.length) { problems += errs.length; console.log('✘', dev, 'JS errors', errs.slice(0, 4)); }
    console.log('✔ fait', dev);
    await ctx.close();
  }
  await b.close(); console.log(problems ? '\nPROBLÈMES: ' + problems : '\nAUCUN PROBLÈME DÉTECTÉ');
})().catch(e => { console.log('TEST FAIL', e.message.split('\n')[0]); process.exit(1); });
