// Faux environnement Google Apps Script (Sheet en mémoire + cache + propriétés) qui COMPTE les opérations
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
module.exports = function load(file) {
  const store = {}, sheets = {}, ops = { reads: 0, writes: 0 }, cacheMem = new Map(), props = {};
  function mk(n) {
    store[n] = store[n] || []; const g = store[n];
    const cell = (r, c) => (g[r - 1] && g[r - 1][c - 1] !== undefined ? g[r - 1][c - 1] : '');
    return {
      getLastRow: () => g.length, getMaxRows: () => 1000, setFrozenRows() {},
      getDataRange: () => ({ getValues: () => { ops.reads++; return g.map(r => r.slice()); } }),
      clearContents: () => { ops.writes++; g.length = 0; },
      appendRow: r => { ops.writes++; g.push(r.slice()); }, deleteRow: r => { ops.writes++; g.splice(r - 1, 1); },
      getRange: (r, c, nr = 1, nc = 1) => ({
        getValues: () => { ops.reads++; const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push(cell(r + i, c + j)); o.push(row); } return o; },
        getValue: () => { ops.reads++; return cell(r, c); },
        setValues: v => { ops.writes++; v.forEach((row, i) => { g[r - 1 + i] = g[r - 1 + i] || []; row.forEach((x, j) => { g[r - 1 + i][c - 1 + j] = x; }); }); },
        setValue: v => { ops.writes++; g[r - 1] = g[r - 1] || []; g[r - 1][c - 1] = v; },
        setNumberFormat() {}
      })
    };
  }
  const bytes = b => Array.from(b).map(x => (x > 127 ? x - 256 : x));
  const ctx = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = mk(n)) }) },
    CacheService: { getScriptCache: () => ({
      get: k => { const e = cacheMem.get(k); return e && e.exp > Date.now() ? e.v : null; },
      put: (k, v, ttl) => cacheMem.set(k, { v, exp: Date.now() + (ttl || 600) * 1000 }),
      remove: k => cacheMem.delete(k), removeAll: ks => ks.forEach(k => cacheMem.delete(k))
    }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeDigest: (a, s) => bytes(crypto.createHash('sha256').update(s).digest()),
      computeHmacSha256Signature: (m, k) => bytes(crypto.createHmac('sha256', k).update(m).digest()),
      base64EncodeWebSafe: x => (typeof x === 'string' ? Buffer.from(x) : Buffer.from(x.map(b => b & 255))).toString('base64url'),
      base64DecodeWebSafe: s => bytes(Buffer.from(s, 'base64url')),
      newBlob: b => ({ getDataAsString: () => Buffer.from(b.map(x => x & 255)).toString('utf8') }),
      DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 }
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { createTextOutput: t => ({ t, setMimeType() { return this; } }), MimeType: { JSON: 1 } },
    ScriptApp: {}, UrlFetchApp: {}
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(file, 'utf8').replace("const ADMIN_PIN = 'CHANGE_MOI'", "const ADMIN_PIN = 'admin1'") +
    '\nthis.__x = { handle_, doPost, scoreClass_, setConfig_, getConfig_, setup, refreshRanking, parseSource_, matchSkipper_, rows_, cacheDel_ };';
  vm.runInContext(code, ctx);
  return Object.assign(ctx.__x, { ops, cacheMem, sheets, ctx });
};
