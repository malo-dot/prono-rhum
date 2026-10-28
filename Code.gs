/**
 * PRONO DU RHUM — backend Google Apps Script
 * Route du Rhum 2026 : paris sur le classement (Ultim, Ocean Fifty, IMOCA, Class40)
 *
 * MISE EN PLACE (voir README) :
 * 1. Change ADMIN_PSEUDO et ADMIN_PIN ci-dessous
 * 2. Exécute la fonction setup() une fois
 * 3. Déployer > Nouveau déploiement > Application Web (exécuter en tant que moi, accès : tout le monde)
 */

// ====== À MODIFIER AVANT setup() ======
const ADMIN_PSEUDO = 'Malo';
const ADMIN_PIN = 'CHANGE_MOI';          // 4 à 8 chiffres/lettres, modifiable ensuite dans l'app
const DEFAULT_LEAGUE_CODE = 'RHUM2026';  // code à donner aux joueurs
const DEFAULT_LOCK_ISO = '2026-11-01T13:02:00+01:00'; // départ : dimanche 1er nov. 13h02

// ====== BARÈME (modifiable) ======
const SCORING = {
  exact: 5,    // bon skipper à la bonne place
  inTop: 2,    // bon skipper dans le top N mais pas à la bonne place
  winner: 3,   // bonus si tu trouves le vainqueur de la classe
  perfect: 10  // bonus si tout le top N est parfait
};

const CLASSES = [
  { id: 'ULTIM',   label: 'Ultim',       n: 3 },
  { id: 'OCEAN50', label: 'Ocean Fifty', n: 3 },
  { id: 'IMOCA',   label: 'IMOCA',       n: 5 },
  { id: 'CLASS40', label: 'Class40',     n: 5 }
];

// Liste officielle au 25 octobre 2026 (modifiable ensuite dans l'onglet « Skippers » du Sheet)
const SKIPPERS_SEED = {
  ULTIM: [
    ['Alexia BARRIER', 'IDEC SPORT - CIC'], ['Louis BURTON', 'Ultim Armand Thiery'],
    ['Charles CAUDRELIER', 'Maxi Edmond de Rothschild'], ['Thomas COVILLE', 'Sodebo Ultim 3'],
    ['Tom LAPERCHE', 'SVR-Lazartigue'], ['Armel LE CLEAC’H', 'Maxi Banque Populaire XI'],
    ['Anthony MARCHAND', 'Actual Ultim 4'], ['Guirec SOUDÉE', 'Liamm']
  ],
  OCEAN50: [
    ['Luke BERRY', 'Le Rire Médecin Lamotte'], ['Basile BOURGNON', 'Edenred'],
    ['Laurent BOURGUES', 'La French Fab'], ['Baptiste HULIN', 'Viabilis Océans'],
    ['Anne-Claire LE BERRE', 'Upwind by MerConcept'], ['Erwan LE DRAOULEC', 'Lazare x Hellio'],
    ['Léonard LEGRAND', 'Sodebo Fifty'], ['Matthieu PERRAUT', 'Elvest'],
    ['Pierre QUIROGA', 'Wewise'], ['Thibaut VAUCHEL-CAMUS', 'Solidaires en Peloton by Delanchy']
  ],
  IMOCA: [
    ['Fabrice AMEDEO', 'FDJ United - Océan Calling'], ['Pierre-Louis ATTWELL', 'Resilient'],
    ['Davy BEAUDART', 'Bureau Vallée'], ['Ambrogio BECCARIA', 'Allagrande Mapei'],
    ['Jérémie BEYOU', 'Charal'], ['Arnaud BOISSIÈRES', 'April Marine'],
    ['Elodie BONAFOUS', 'Association Petits Princes - Queguiner'], ['Francesca CLAPCICH', '11th Hour Racing'],
    ['Manuel COUSIN', 'Coup de Pouce'], ['Jean-Baptiste DARAMY', 'Anett - Kalhyge'],
    ['Violette DORANGE', 'Initiatives-Coeur'], ['Nicolas D’ESTAIS', 'Café Joyeux'],
    ['Sam GOODCHILD', 'Macif Santé Prévoyance'], ['Boris HERRMANN', 'Malizia 4'],
    ['Corentin HOREAU', 'MACSF'], ['Robin MARAIS', 'Respire-Ma Chance Moi Aussi'],
    ['Sébastien MARSSET', 'Foussier'], ['Nicolas ROUGER', 'Demain c’est loin'],
    ['Sébastien SIMON', 'Groupe Dubreuil - Air Caraïbes'], ['Maxime SOREL', 'Vaincre la Mucoviscidose'],
    ['Masa SUZUKI', 'Milai - Furuno'], ['Armel TRIPON', 'Les P\'tits Doudous']
  ],
  CLASS40: [
    ['Aina BAUZA ROIG', 'Aina B. Ocean Racing'], ['Yohan BERTRAND', 'Yoda'], ['Stéphane BODIN', 'Wasabiii'],
    ['Jules BONNIER', 'Plastic Odyssey'], ['Mathieu CLAVEAU', 'Inherent - Phare40'], ['Pep COSTA', 'VSF Sports'],
    ['Yves COURBON', 'OceanConnect'], ['Fabien DELAHAYE', 'Legallais'], ['Corentin DOUGUET', 'SNSM'],
    ['Sophie FAGUET', 'Défi Solidaire avec Ellye et l\'Arche'], ['Loïc FEQUET', 'Funae'], ['Robin FOLLIN', 'Solano'],
    ['Andrea FORNARO', 'Influence 2'], ['Jonas GERCKENS', 'Belgium Ocean Racing - Curium'],
    ['Marco GUERRA', 'Imagin\'Act-Socomec'], ['Emmanuel HAMEZ', 'Viranga'], ['Rupert HENRY', 'Eora'],
    ['Théa KHELIF', 'Women of Course'], ['Milan KOLACEK', 'Inland Roots Ocean Soul'], ['Sasha LANIECE', 'Alderan'],
    ['Matéo LE CALVIC', 'Fondation ARC'], ['Quentin LE NABOUR', 'Bleu Blanc Planète Location'],
    ['Pierre LEBOUCHER', 'Institut Imagine'], ['Pamela LEE', '#EmpowHer'], ['Ian LIPINSKI', 'Crédit Mutuel'],
    ['Alexis LOISON', 'Groupe Réel'], ['Thomas LURTON', 'Sireco-OSE'],
    ['Guillaume L’HOSTIS', 'Alternative Sailing / Constructions du Belon'], ['Goulven MARIE', 'Qwanza'],
    ['William MATHELIN MOREAUX', 'Patapain Les Invincibles'], ['Mikael MERGUI', 'Hirsch-Centrakor'],
    ['Achille NEBOUT', 'Amarris'], ['Kéni PIPEROL', 'Drépavoile'], ['Guillaume PIROUELLE', 'Sogestran Seafrigo'],
    ['Thimoté POLET', 'Team Zeiss'], ['Ulysse POZZOLI', 'Renovatec Sailing Team'], ['Christophe RATEAU', 'Gustave Roussy'],
    ['Yannick REBUFFAT', 'Mussulo40'], ['Vincent RIOU', 'Pierreval-Fondation GoodPlanet'],
    ['Luca ROSETTI', 'Maccaferri Futura'], ['Rodolphe SEPHO', 'CANBT-OTI / Rêve de Large 5'],
    ['Matteo SERICANO', 'Lucente'], ['Benoit SINEAU', 'Ekinox'], ['Lomano TAKASI', 'Réauté Chocolat'],
    ['Djemila TASSIN', 'Djemila Sailing-Belgium Ocean Racing'], ['Jean-Baptiste TERNON', 'MIC Odyssey'],
    ['Alexis THOMAS', 'AfterData-Elcia'], ['Gaëtan THOMAS', 'Barco Brésil'], ['Axel TRÉHIN', 'Exalt']
  ]
};

// ====== OUTILS FEUILLES ======
const SHEETS = {
  Config:   ['key', 'value'],
  Users:    ['pseudo', 'salt', 'hash', 'role', 'token', 'createdAt', 'active'],
  Skippers: ['class', 'name', 'boat'],
  Picks:    ['pseudo', 'class', 'rank', 'skipper', 'updatedAt'],
  Ranking:  ['class', 'rank', 'skipper', 'updatedAt'],
  Prev:     ['pseudo', 'rank']
};

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Feuille manquante : ' + name + ' (lance setup())');
  return sh;
}

function rows_(name) {
  const sh = sheet_(name);
  const v = sh.getDataRange().getValues();
  const head = v.shift();
  return v.filter(r => r[0] !== '' && r[0] !== null).map(r => {
    const o = {};
    head.forEach((h, i) => (o[h] = r[i]));
    return o;
  });
}

function replaceRows_(name, objs) {
  const sh = sheet_(name);
  const head = SHEETS[name];
  sh.clearContents();
  sh.getRange(1, 1, 1, head.length).setValues([head]);
  if (objs.length) {
    sh.getRange(2, 1, objs.length, head.length).setValues(objs.map(o => head.map(h => o[h] === undefined ? '' : o[h])));
  }
}

function appendRow_(name, obj) {
  const head = SHEETS[name];
  sheet_(name).appendRow(head.map(h => (obj[h] === undefined ? '' : obj[h])));
}

function getConfig_() {
  const c = {};
  rows_('Config').forEach(r => (c[r.key] = String(r.value)));
  return c;
}

function setConfig_(key, value) {
  const sh = sheet_('Config');
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  sh.appendRow([key, value]);
}

// ====== SETUP ======
function setup() {
  Object.keys(SHEETS).forEach(name => {
    let sh = ss_().getSheetByName(name);
    if (!sh) sh = ss_().insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]);
      sh.setFrozenRows(1);
    }
    // Texte brut pour éviter que Sheets convertisse dates / hash / « true » tout seul
    if (name === 'Config' || name === 'Users') sh.getRange(1, 1, sh.getMaxRows(), SHEETS[name].length).setNumberFormat('@');
  });
  const cfg = getConfig_();
  if (!cfg.leagueCode) setConfig_('leagueCode', DEFAULT_LEAGUE_CODE);
  if (!cfg.lockISO) setConfig_('lockISO', DEFAULT_LOCK_ISO);
  if (cfg.manualOnly === undefined) setConfig_('manualOnly', 'true');
  if (cfg.sourceUrl === undefined) setConfig_('sourceUrl', '');

  if (rows_('Skippers').length === 0) {
    const out = [];
    CLASSES.forEach(c => SKIPPERS_SEED[c.id].forEach(s => out.push({ class: c.id, name: s[0], boat: s[1] })));
    replaceRows_('Skippers', out);
  }
  if (!rows_('Users').some(u => u.role === 'admin')) {
    if (ADMIN_PIN === 'CHANGE_MOI') throw new Error('Change ADMIN_PIN en haut du script avant setup().');
    const salt = Utilities.getUuid();
    appendRow_('Users', { pseudo: ADMIN_PSEUDO, salt: salt, hash: hash_(ADMIN_PIN, salt), role: 'admin', token: '', createdAt: new Date().toISOString(), active: 'true' });
  }
  return 'OK : feuilles créées, admin = ' + ADMIN_PSEUDO;
}

/** Planifie la mise à jour auto du classement (toutes les 15 min). À lancer une fois quand le flux live est branché. */
function installTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'refreshRanking').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('refreshRanking').timeBased().everyMinutes(15).create();
}

// ====== AUTH ======
function hash_(pin, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pin, Utilities.Charset.UTF_8);
  return bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function userByToken_(token) {
  if (!token) return null;
  return rows_('Users').find(u => u.token === token && String(u.active) === 'true') || null;
}

function requireUser_(b) {
  const u = userByToken_(b.token);
  if (!u) throw new Error('Session expirée, reconnecte-toi.');
  return u;
}

function requireAdmin_(b) {
  const u = requireUser_(b);
  if (u.role !== 'admin') throw new Error('Réservé à l\'admin.');
  return u;
}

function isLocked_() {
  const cfg = getConfig_();
  return new Date().getTime() >= new Date(cfg.lockISO).getTime();
}

function cleanPseudo_(p) { return String(p || '').trim().replace(/\s+/g, ' '); }

function register_(b) {
  const pseudo = cleanPseudo_(b.pseudo);
  const pin = String(b.pin || '');
  if (pseudo.length < 2 || pseudo.length > 20) throw new Error('Pseudo : 2 à 20 caractères.');
  if (!/^[A-Za-z0-9]{4,8}$/.test(pin)) throw new Error('Code PIN : 4 à 8 caractères (lettres/chiffres).');
  if (String(b.code || '').trim().toUpperCase() !== getConfig_().leagueCode.toUpperCase()) throw new Error('Code de ligue incorrect.');
  const users = rows_('Users');
  if (users.some(u => u.pseudo.toLowerCase() === pseudo.toLowerCase())) throw new Error('Ce pseudo est déjà pris.');
  const salt = Utilities.getUuid();
  const token = Utilities.getUuid();
  appendRow_('Users', { pseudo: pseudo, salt: salt, hash: hash_(pin, salt), role: 'player', token: token, createdAt: new Date().toISOString(), active: 'true' });
  return { token: token, me: { pseudo: pseudo, role: 'player' } };
}

function login_(b) {
  const pseudo = cleanPseudo_(b.pseudo).toLowerCase();
  const users = rows_('Users');
  const u = users.find(x => x.pseudo.toLowerCase() === pseudo && String(x.active) === 'true');
  if (!u || hash_(String(b.pin || ''), u.salt) !== u.hash) throw new Error('Pseudo ou PIN incorrect.');
  const token = Utilities.getUuid();
  u.token = token;
  replaceRows_('Users', users.map(x => (x.pseudo === u.pseudo ? u : x)));
  return { token: token, me: { pseudo: u.pseudo, role: u.role } };
}

// ====== DONNÉES ======
function skippersByClass_() {
  const out = {};
  CLASSES.forEach(c => (out[c.id] = []));
  rows_('Skippers').forEach(s => { if (out[s.class]) out[s.class].push({ name: s.name, boat: s.boat }); });
  return out;
}

function classById_(id) { return CLASSES.find(c => c.id === id); }

function rankingByClass_() {
  const out = {}, upd = {};
  CLASSES.forEach(c => (out[c.id] = []));
  rows_('Ranking').sort((a, b) => a.rank - b.rank).forEach(r => {
    if (out[r.class]) { out[r.class].push(r.skipper); upd[r.class] = r.updatedAt; }
  });
  return { ranking: out, updatedAt: upd };
}

function picksByUser_() {
  const out = {};
  rows_('Picks').forEach(p => {
    out[p.pseudo] = out[p.pseudo] || {};
    out[p.pseudo][p.class] = out[p.pseudo][p.class] || [];
    out[p.pseudo][p.class][p.rank - 1] = p.skipper;
  });
  return out;
}

function config_() {
  const cfg = getConfig_();
  const finals = {};
  CLASSES.forEach(c => (finals[c.id] = cfg['final_' + c.id] === 'true'));
  return {
    classes: CLASSES, skippers: skippersByClass_(), lockISO: cfg.lockISO,
    serverNow: new Date().toISOString(), scoring: SCORING, finals: finals
  };
}

// ====== SCORES ======
function scoreClass_(picks, actual, n) {
  const res = { pts: 0, detail: [] };
  if (!picks || !actual.length) {
    for (let i = 0; i < n; i++) res.detail.push({ skipper: picks ? picks[i] || '' : '', status: 'wait', pts: 0 });
    return res;
  }
  let perfect = true;
  for (let p = 1; p <= n; p++) {
    const s = picks[p - 1] || '';
    const r = actual.indexOf(s) + 1;
    let pts = 0, status = 'miss';
    if (s && r === p) { pts = SCORING.exact; status = 'exact'; if (p === 1) pts += SCORING.winner; }
    else {
      perfect = false;
      if (s && r > 0 && r <= n) { pts = SCORING.inTop; status = 'top'; }
    }
    res.pts += pts;
    res.detail.push({ skipper: s, status: status, pts: pts, actualRank: r || null });
  }
  if (perfect && actual.length >= n && picks.filter(Boolean).length === n) res.pts += SCORING.perfect;
  return res;
}

function leaderboard_() {
  const users = rows_('Users').filter(u => String(u.active) === 'true');
  const picks = picksByUser_();
  const rk = rankingByClass_().ranking;
  const list = users.map(u => {
    const byClass = {};
    let total = 0, exacts = 0;
    CLASSES.forEach(c => {
      const sc = scoreClass_((picks[u.pseudo] || {})[c.id], rk[c.id].slice(0, c.n), c.n);
      byClass[c.id] = sc;
      total += sc.pts;
      exacts += sc.detail.filter(d => d.status === 'exact').length;
    });
    return { pseudo: u.pseudo, total: total, exacts: exacts, byClass: byClass, hasPicks: !!picks[u.pseudo] };
  });
  list.sort((a, b) => b.total - a.total || b.exacts - a.exacts || a.pseudo.localeCompare(b.pseudo));
  list.forEach((x, i) => {
    const prev = list[i - 1];
    x.rank = prev && prev.total === x.total && prev.exacts === x.exacts ? prev.rank : i + 1;
  });
  return list;
}

function snapshotPrev_() {
  replaceRows_('Prev', leaderboard_().map(x => ({ pseudo: x.pseudo, rank: x.rank })));
}

// ====== ACTIONS JOUEUR ======
function savePicks_(b) {
  const u = requireUser_(b);
  if (isLocked_()) throw new Error('Les pronos sont verrouillés (la course a démarré).');
  const sk = skippersByClass_();
  const incoming = b.picks || {};
  let all = rows_('Picks').filter(p => p.pseudo !== u.pseudo);
  const mine = rows_('Picks').filter(p => p.pseudo === u.pseudo);
  const now = new Date().toISOString();
  const kept = [];
  CLASSES.forEach(c => {
    const arr = incoming[c.id];
    if (arr === undefined) { mine.filter(p => p.class === c.id).forEach(p => kept.push(p)); return; }
    const filled = arr.filter(Boolean);
    if (filled.length === 0) return;
    if (filled.length !== c.n || arr.length !== c.n) throw new Error(c.label + ' : il faut choisir exactement ' + c.n + ' skippers.');
    if (new Set(filled).size !== filled.length) throw new Error(c.label + ' : un skipper est choisi deux fois.');
    filled.forEach(s => { if (!sk[c.id].some(x => x.name === s)) throw new Error(c.label + ' : skipper inconnu (' + s + ').'); });
    arr.forEach((s, i) => kept.push({ pseudo: u.pseudo, class: c.id, rank: i + 1, skipper: s, updatedAt: now }));
  });
  replaceRows_('Picks', all.concat(kept));
  return { ok: true };
}

function me_(b) {
  const u = requireUser_(b);
  const picks = picksByUser_()[u.pseudo] || {};
  return { me: { pseudo: u.pseudo, role: u.role }, picks: picks };
}

function board_(b) {
  requireUser_(b);
  const locked = isLocked_();
  const prev = {};
  rows_('Prev').forEach(p => (prev[p.pseudo] = Number(p.rank)));
  const picks = picksByUser_();
  const rk = rankingByClass_();
  const list = leaderboard_().map(x => {
    const out = {
      pseudo: x.pseudo, rank: x.rank, total: x.total, prevRank: prev[x.pseudo] || null,
      pointsByClass: {}
    };
    CLASSES.forEach(c => (out.pointsByClass[c.id] = x.byClass[c.id].pts));
    // les pronos des autres ne sont visibles qu'après verrouillage
    out.details = locked ? x.byClass : null;
    return out;
  });
  return { locked: locked, board: list, ranking: rk.ranking, updatedAt: rk.updatedAt, finals: config_().finals };
}

// ====== ACTIONS ADMIN ======
function adminGet_(b) {
  requireAdmin_(b);
  const cfg = getConfig_();
  const users = rows_('Users').map(u => ({ pseudo: u.pseudo, role: u.role, createdAt: u.createdAt, active: String(u.active) === 'true' }));
  return { settings: { leagueCode: cfg.leagueCode, lockISO: cfg.lockISO, manualOnly: cfg.manualOnly === 'true', sourceUrl: cfg.sourceUrl || '' }, users: users, finals: config_().finals };
}

function adminSettings_(b) {
  requireAdmin_(b);
  const s = b.settings || {};
  if (s.leagueCode !== undefined) setConfig_('leagueCode', String(s.leagueCode).trim());
  if (s.lockISO !== undefined) {
    if (isNaN(new Date(s.lockISO).getTime())) throw new Error('Date de verrouillage invalide.');
    setConfig_('lockISO', s.lockISO);
  }
  if (s.manualOnly !== undefined) setConfig_('manualOnly', s.manualOnly ? 'true' : 'false');
  if (s.sourceUrl !== undefined) setConfig_('sourceUrl', String(s.sourceUrl).trim());
  return { ok: true };
}

/** map = { CLASS40: ['Prénom NOM', ...top N], ... }  — met à jour le classement et mémorise l'ancien classement des joueurs. */
function applyRanking_(map, finals) {
  const cur = rankingByClass_().ranking;
  let changed = false;
  CLASSES.forEach(c => {
    if (map[c.id] && JSON.stringify(map[c.id]) !== JSON.stringify(cur[c.id])) changed = true;
  });
  if (changed) {
    snapshotPrev_();
    const now = new Date().toISOString();
    const out = [];
    CLASSES.forEach(c => {
      const list = map[c.id] !== undefined ? map[c.id] : cur[c.id];
      list.forEach((s, i) => out.push({ class: c.id, rank: i + 1, skipper: s, updatedAt: now }));
    });
    replaceRows_('Ranking', out);
  }
  if (finals) CLASSES.forEach(c => { if (finals[c.id] !== undefined) setConfig_('final_' + c.id, finals[c.id] ? 'true' : 'false'); });
  return changed;
}

function adminSetRanking_(b) {
  requireAdmin_(b);
  const sk = skippersByClass_();
  const map = {};
  CLASSES.forEach(c => {
    const arr = (b.ranking || {})[c.id];
    if (arr === undefined) return;
    const list = arr.filter(Boolean);
    if (new Set(list).size !== list.length) throw new Error(c.label + ' : un skipper apparaît deux fois.');
    list.forEach(s => { if (!sk[c.id].some(x => x.name === s)) throw new Error(c.label + ' : skipper inconnu (' + s + ').'); });
    map[c.id] = list.slice(0, c.n);
  });
  return { changed: applyRanking_(map, b.finals) };
}

function adminResetPin_(b) {
  requireAdmin_(b);
  const pin = String(b.pin || '');
  if (!/^[A-Za-z0-9]{4,8}$/.test(pin)) throw new Error('PIN : 4 à 8 caractères.');
  const users = rows_('Users');
  const u = users.find(x => x.pseudo === b.pseudo);
  if (!u) throw new Error('Joueur introuvable.');
  u.salt = Utilities.getUuid(); u.hash = hash_(pin, u.salt); u.token = '';
  replaceRows_('Users', users);
  return { ok: true };
}

function adminDeleteUser_(b) {
  const me = requireAdmin_(b);
  if (b.pseudo === me.pseudo) throw new Error('Tu ne peux pas te supprimer toi-même.');
  replaceRows_('Users', rows_('Users').filter(u => u.pseudo !== b.pseudo));
  replaceRows_('Picks', rows_('Picks').filter(p => p.pseudo !== b.pseudo));
  return { ok: true };
}

// ====== MISE À JOUR AUTO DU CLASSEMENT LIVE ======
/**
 * Déclenchée toutes les 15 min par installTrigger(). Ne fait rien tant que « manualOnly » est vrai.
 * TODO (dimanche, une fois le tracker en route) : adapter parseSource_() au vrai format du flux de classement.
 */
function refreshRanking() {
  const cfg = getConfig_();
  if (cfg.manualOnly === 'true' || !cfg.sourceUrl) return { skipped: true };
  const resp = UrlFetchApp.fetch(cfg.sourceUrl, { muteHttpExceptions: true, followRedirects: true });
  if (resp.getResponseCode() !== 200) throw new Error('Source classement : HTTP ' + resp.getResponseCode());
  const parsed = parseSource_(resp.getContentText());
  const map = {};
  const sk = skippersByClass_();
  CLASSES.forEach(c => {
    if (!parsed[c.id]) return;
    const names = [];
    parsed[c.id].forEach(raw => {
      const m = matchSkipper_(raw, sk[c.id]);
      if (m && names.indexOf(m) === -1) names.push(m);
    });
    map[c.id] = names.slice(0, c.n);
  });
  return { changed: applyRanking_(map, null) };
}

function adminRefresh_(b) { requireAdmin_(b); return refreshRanking(); }

/**
 * Convertit le contenu de la source en { ULTIM:[noms classés], OCEAN50:[...], IMOCA:[...], CLASS40:[...] }.
 * Formats gérés par défaut : JSON { "CLASS40": ["Prénom NOM", ...] } ou tableau [{class, rank, name|skipper}].
 * À ADAPTER au format réel du classement officiel dès qu'il est publié.
 */
function parseSource_(text) {
  const data = JSON.parse(text);
  const out = {};
  const alias = { ultim: 'ULTIM', ocean50: 'OCEAN50', oceanfifty: 'OCEAN50', multi50: 'OCEAN50', imoca: 'IMOCA', class40: 'CLASS40' };
  const key = k => alias[String(k).toLowerCase().replace(/[^a-z0-9]/g, '')];
  if (Array.isArray(data)) {
    data.slice().sort((a, b) => a.rank - b.rank).forEach(r => {
      const id = key(r.class || r.classe || r.category);
      if (!id) return;
      (out[id] = out[id] || []).push(r.name || r.skipper || r.nom);
    });
  } else {
    Object.keys(data).forEach(k => { const id = key(k); if (id) out[id] = data[k].map(x => (typeof x === 'string' ? x : x.name || x.skipper)); });
  }
  return out;
}

function norm_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchSkipper_(raw, list) {
  const n = norm_(raw);
  if (!n) return null;
  let hit = list.find(s => norm_(s.name) === n);
  if (hit) return hit.name;
  const tokens = n.split(' ');
  hit = list.find(s => { const t = norm_(s.name).split(' '); return t.every(x => tokens.indexOf(x) !== -1) || tokens.every(x => t.indexOf(x) !== -1); });
  return hit ? hit.name : null;
}

// ====== ROUTEUR ======
function handle_(b) {
  switch (b.action) {
    case 'config':         return config_();
    case 'register':       return register_(b);
    case 'login':          return login_(b);
    case 'me':             return me_(b);
    case 'savePicks':      return savePicks_(b);
    case 'board':          return board_(b);
    case 'adminGet':       return adminGet_(b);
    case 'adminSettings':  return adminSettings_(b);
    case 'adminSetRanking':return adminSetRanking_(b);
    case 'adminResetPin':  return adminResetPin_(b);
    case 'adminDeleteUser':return adminDeleteUser_(b);
    case 'adminRefresh':   return adminRefresh_(b);
    default: throw new Error('Action inconnue.');
  }
}

const WRITE_ACTIONS = ['register', 'login', 'savePicks', 'adminSettings', 'adminSetRanking', 'adminResetPin', 'adminDeleteUser', 'adminRefresh'];

function doPost(e) {
  let out;
  const lock = LockService.getScriptLock();
  try {
    const b = JSON.parse(e.postData.contents);
    if (WRITE_ACTIONS.indexOf(b.action) !== -1) lock.waitLock(20000);
    out = { ok: true, data: handle_(b) };
  } catch (err) {
    out = { ok: false, error: String(err.message || err) };
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: 'MPP RDR 2026 API' })).setMimeType(ContentService.MimeType.JSON);
}
