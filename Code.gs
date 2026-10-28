/**
 * MPP RDR 2026 — backend Google Apps Script
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
const DEFAULT_LEAGUE_CODE = 'RHUM2026';  // code de la première ligue (les autres se créent dans l'onglet Admin)
const DEFAULT_LOCK_ISO = '2026-11-01T13:02:00+01:00'; // départ : dimanche 1er nov. 13h02

// ====== BARÈME (modifiable) ======
const SCORING = {
  exact: 5,    // bon skipper à la bonne place
  inTop: 2,    // bon skipper dans le top N mais pas à la bonne place
  winner: 3,   // bonus si tu trouves le vainqueur de la classe
  perfect3: 5, // bonus si le top 3 est parfait
  perfect: 10  // bonus si tout le top N est parfait (en plus du bonus top 3)
};

const CLASSES = [
  { id: 'ULTIM',   label: 'Ultim',       n: 5 },
  { id: 'OCEAN50', label: 'Ocean Fifty', n: 5 },
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
  Users:    ['pseudo', 'salt', 'hash', 'role', 'createdAt', 'active', 'league', 'phone'],
  Leagues:  ['id', 'name', 'code', 'createdAt', 'wa'],
  Requests: ['pseudo', 'note', 'ts'],   // demandes « mot de passe oublié »
  Chat:     ['id', 'league', 'pseudo', 'role', 'text', 'ts'],   // league = id de ligue, ou '*' = annonce pour tous
  Skippers: ['class', 'name', 'boat'],
  Picks:    ['pseudo', 'json', 'updatedAt'],   // 1 ligne par joueur
  Ranking:  ['class', 'rank', 'skipper', 'updatedAt'],
  Prev:     ['scope', 'pseudo', 'rank']
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

// ====== CACHE (partagé entre tous les joueurs : évite de relire le Sheet à chaque requête) ======
function cacheGet_(k) { try { const v = CacheService.getScriptCache().get(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function cachePut_(k, v, ttl) { try { const s = JSON.stringify(v); if (s.length < 90000) CacheService.getScriptCache().put(k, s, ttl); } catch (e) {} }
function cacheDel_() { try { CacheService.getScriptCache().removeAll(Array.prototype.slice.call(arguments)); } catch (e) {} }
function cached_(k, ttl, fn) {
  let v = cacheGet_(k);
  if (v === null) { v = fn(); cachePut_(k, v, ttl); }
  return v;
}

function getConfig_() {
  return cached_('cfg', 300, () => {
    const c = {};
    rows_('Config').forEach(r => (c[r.key] = String(r.value)));
    return c;
  });
}

function setConfig_(key, value) {
  const sh = sheet_('Config');
  const v = sh.getDataRange().getValues();
  let done = false;
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] === key) { sh.getRange(i + 1, 2).setValue(value); done = true; break; }
  }
  if (!done) sh.appendRow([key, value]);
  cacheDel_('cfg', 'cfgpub');
  delBoards_();
}

/** Efface les classements en cache (un par ligue + le général). */
function delBoards_() {
  cacheDel_.apply(null, ['board_all'].concat(Object.keys(leaguesMap_()).map(id => 'board_' + id)));
}

function leaguesMap_() {
  return cached_('leagues', 300, () => {
    const m = {};
    rows_('Leagues').forEach(l => (m[String(l.id)] = { id: String(l.id), name: String(l.name), code: String(l.code), wa: String(l.wa || '') }));
    return m;
  });
}

function fixPhone_(v) {   // Sheets peut avaler le 0 initial : on le remet
  const s = String(v == null ? '' : v).trim();
  return /^\d{9}$/.test(s) ? '0' + s : s;
}

function usersMap_() {
  return cached_('users', 300, () => {
    const m = {};
    rows_('Users').forEach(u => {
      m[String(u.pseudo).toLowerCase()] = { pseudo: String(u.pseudo), salt: String(u.salt), hash: String(u.hash), role: u.role, createdAt: u.createdAt, active: String(u.active), league: String(u.league || ''), phone: fixPhone_(u.phone) };
    });
    return m;
  });
}

// ====== SETUP ======
function setup() {
  Object.keys(SHEETS).forEach(name => {
    let sh = ss_().getSheetByName(name);
    if (!sh) sh = ss_().insertSheet(name);
    const head = SHEETS[name];
    const cur = sh.getLastRow() > 0 ? sh.getRange(1, 1, 1, head.length).getValues()[0] : [];
    const same = cur.join('|') === head.join('|');
    // Migration douce : une feuille qui gagne une colonne en fin de ligne d'en-tête garde ses données
    const k = cur.filter(x => x !== '').length;
    const addedCol = !same && k > 0 && k < head.length && cur.slice(0, k).join('|') === head.slice(0, k).join('|');
    if (addedCol) {
      sh.getRange(1, 1, 1, head.length).setValues([head]);
    } else if (!same) {   // première install ou ancien format : on repart propre
      sh.clearContents();
      sh.getRange(1, 1, 1, head.length).setValues([head]);
      sh.setFrozenRows(1);
    }
    // Texte brut pour éviter que Sheets convertisse dates / hash / codes / « true » tout seul
    if (name === 'Config' || name === 'Users' || name === 'Leagues' || name === 'Chat') sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
  });
  cacheDel_('cfg', 'cfgpub', 'users', 'skp', 'picks', 'rank', 'leagues');
  secret_();
  const cfg = getConfig_();
  if (!cfg.lockISO) setConfig_('lockISO', DEFAULT_LOCK_ISO);
  if (cfg.manualOnly === undefined) setConfig_('manualOnly', 'true');
  if (cfg.sourceUrl === undefined) setConfig_('sourceUrl', '');

  if (rows_('Leagues').length === 0) {   // ligue par défaut (reprend l'ancien code de ligue s'il existait)
    appendRow_('Leagues', { id: 'L1', name: 'Ligue principale', code: cfg.leagueCode || DEFAULT_LEAGUE_CODE, createdAt: new Date().toISOString() });
  }
  cacheDel_('leagues');
  const firstLeague = Object.keys(leaguesMap_())[0];

  if (rows_('Skippers').length === 0) {
    const out = [];
    CLASSES.forEach(c => SKIPPERS_SEED[c.id].forEach(s => out.push({ class: c.id, name: s[0], boat: s[1] })));
    replaceRows_('Skippers', out);
  }
  if (!rows_('Users').some(u => u.role === 'admin')) {
    if (ADMIN_PIN === 'CHANGE_MOI') throw new Error('Change ADMIN_PIN en haut du script avant setup().');
    const salt = Utilities.getUuid();
    appendRow_('Users', { pseudo: ADMIN_PSEUDO, salt: salt, hash: hash_(ADMIN_PIN, salt), role: 'admin', createdAt: new Date().toISOString(), active: 'true', league: firstLeague });
  }
  const users = rows_('Users');
  if (users.some(u => !u.league)) {   // joueurs existants sans ligue => ligue par défaut
    users.forEach(u => { if (!u.league) u.league = firstLeague; });
    replaceRows_('Users', users);
  }
  cacheDel_('users', 'cfg', 'cfgpub', 'skp', 'leagues');
  delBoards_();
  return 'OK : feuilles prêtes, admin = ' + ADMIN_PSEUDO;
}

/** Planifie la mise à jour auto du classement (toutes les 15 min). À lancer une fois quand le flux live est branché. */
function installTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'refreshRanking').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('refreshRanking').timeBased().everyMinutes(15).create();
}

// ====== AUTH (jetons signés : aucune écriture dans le Sheet à la connexion) ======
function hash_(pin, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pin, Utilities.Charset.UTF_8);
  return bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function secret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SECRET', s); }
  return s;
}

function sign_(msg) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(msg, secret_())); }

function makeToken_(u) {
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify({ p: u.pseudo, s: String(u.salt).slice(0, 8), e: Date.now() + 30 * 86400000 }), Utilities.Charset.UTF_8);
  return payload + '.' + sign_(payload);
}

function userByToken_(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  const parts = String(token).split('.');
  if (sign_(parts[0]) !== parts[1]) return null;
  let o;
  try { o = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()); } catch (e) { return null; }
  if (!o || o.e < Date.now()) return null;
  const u = usersMap_()[String(o.p).toLowerCase()];
  if (!u || u.active !== 'true' || u.salt.slice(0, 8) !== o.s) return null;   // mot de passe réinitialisé ou joueur supprimé => jeton invalide
  return u;
}

function meOf_(u) {
  const lg = leaguesMap_()[u.league];
  return { pseudo: u.pseudo, role: u.role, league: lg ? { id: lg.id, name: lg.name, wa: lg.wa } : null };
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
  return new Date().getTime() >= new Date(getConfig_().lockISO).getTime();
}

function cleanPseudo_(p) { return String(p || '').trim().replace(/\s+/g, ' '); }

function register_(b) {
  const pseudo = cleanPseudo_(b.pseudo);
  const pin = String(b.pin || '');
  if (pseudo.length < 2 || pseudo.length > 20) throw new Error('Pseudo : 2 à 20 caractères.');
  if (pin.length < 6 || pin.length > 64) throw new Error('Mot de passe : 6 caractères minimum.');
  if (/\s/.test(pin)) throw new Error('Le mot de passe ne doit pas contenir d\'espace.');
  const code = String(b.code || '').trim().toUpperCase();
  const lm = leaguesMap_();
  const lg = Object.keys(lm).map(k => lm[k]).find(l => l.code.toUpperCase() === code);
  if (!code || !lg) throw new Error('Code de ligue incorrect.');
  const phone = String(b.phone || '').replace(/[\s.\-()]/g, '');
  if (!/^\+?\d{9,15}$/.test(phone)) throw new Error('Numéro de téléphone invalide (ex. 06 12 34 56 78).');
  if (rows_('Users').some(u => String(u.pseudo).toLowerCase() === pseudo.toLowerCase())) throw new Error('Ce pseudo est déjà pris.');
  const salt = Utilities.getUuid();
  appendRow_('Users', { pseudo: pseudo, salt: salt, hash: hash_(pin, salt), role: 'player', createdAt: new Date().toISOString(), active: 'true', league: lg.id, phone: phone });
  cacheDel_('users');
  delBoards_();
  return { token: makeToken_({ pseudo: pseudo, salt: salt }), me: { pseudo: pseudo, role: 'player', league: { id: lg.id, name: lg.name } } };
}

function login_(b) {
  const key = cleanPseudo_(b.pseudo).toLowerCase();
  const fk = 'fail_' + key.replace(/[^a-z0-9]/g, '_').slice(0, 60);
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get(fk) || 0);
  if (fails >= 8) throw new Error('Trop d\'essais. Réessaie dans 5 minutes.');
  const u = usersMap_()[key];
  if (!u || u.active !== 'true' || hash_(String(b.pin || ''), u.salt) !== u.hash) {
    cache.put(fk, String(fails + 1), 300);
    throw new Error('Pseudo ou mot de passe incorrect.');
  }
  cache.remove(fk);
  return { token: makeToken_(u), me: meOf_(u) };
}

// ====== DONNÉES ======
function skippersByClass_() {
  return cached_('skp', 600, () => {
    const out = {};
    CLASSES.forEach(c => (out[c.id] = []));
    rows_('Skippers').forEach(s => { if (out[s.class]) out[s.class].push({ name: s.name, boat: s.boat }); });
    return out;
  });
}

function rankingByClass_() {
  return cached_('rank', 30, () => {
    const out = {}, upd = {};
    CLASSES.forEach(c => (out[c.id] = []));
    rows_('Ranking').sort((a, b) => a.rank - b.rank).forEach(r => {
      if (out[r.class]) { out[r.class].push(r.skipper); upd[r.class] = r.updatedAt; }
    });
    return { ranking: out, updatedAt: upd };
  });
}

function picksByUser_() {
  return cached_('picks', 60, () => {
    const out = {};
    rows_('Picks').forEach(r => { try { out[r.pseudo] = JSON.parse(r.json); } catch (e) {} });
    return out;
  });
}

function finals_() {
  const cfg = getConfig_(), f = {};
  CLASSES.forEach(c => (f[c.id] = cfg['final_' + c.id] === 'true'));
  return f;
}

function config_() {
  const pub = cached_('cfgpub', 120, () => ({
    classes: CLASSES, skippers: skippersByClass_(), lockISO: getConfig_().lockISO, scoring: SCORING, finals: finals_()
  }));
  return Object.assign({ serverNow: new Date().toISOString() }, pub);
}

// ====== SCORES ======
function scoreClass_(picks, actual, n) {
  const res = { pts: 0, detail: [] };
  if (!picks || !actual.length) {
    for (let i = 0; i < n; i++) res.detail.push({ skipper: picks ? picks[i] || '' : '', status: 'wait', pts: 0 });
    return res;
  }
  let perfect = true, perfect3 = true;
  for (let p = 1; p <= n; p++) {
    const s = picks[p - 1] || '';
    const r = actual.indexOf(s) + 1;
    let pts = 0, status = 'miss';
    if (s && r === p) { pts = SCORING.exact; status = 'exact'; if (p === 1) pts += SCORING.winner; }
    else {
      perfect = false; if (p <= 3) perfect3 = false;
      if (s && r > 0 && r <= n) { pts = SCORING.inTop; status = 'top'; }
    }
    res.pts += pts;
    res.detail.push({ skipper: s, status: status, pts: pts, actualRank: r || null });
  }
  if (n >= 3 && perfect3 && actual.length >= 3 && picks.filter(Boolean).length >= 3) res.pts += SCORING.perfect3;
  if (perfect && actual.length >= n && picks.filter(Boolean).length === n) res.pts += SCORING.perfect;
  return res;
}

function leaderboard_(scope) {
  const um = usersMap_();
  const users = Object.keys(um).map(k => um[k]).filter(u => u.active === 'true' && u.role !== 'admin' && (!scope || scope === 'all' || u.league === scope));
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
    return { pseudo: u.pseudo, total: total, exacts: exacts, byClass: byClass };
  });
  list.sort((a, b) => b.total - a.total || b.exacts - a.exacts || a.pseudo.localeCompare(b.pseudo));
  list.forEach((x, i) => {
    const prev = list[i - 1];
    x.rank = prev && prev.total === x.total && prev.exacts === x.exacts ? prev.rank : i + 1;
  });
  return list;
}

function snapshotPrev_() {
  const out = [];
  ['all'].concat(Object.keys(leaguesMap_())).forEach(sc => leaderboard_(sc).forEach(x => out.push({ scope: sc, pseudo: x.pseudo, rank: x.rank })));
  replaceRows_('Prev', out);
}

// ====== ACTIONS JOUEUR ======
function savePicks_(b) {
  const u = requireUser_(b);
  if (u.role === 'admin') throw new Error('Le compte admin ne joue pas : crée un compte joueur pour participer.');
  if (isLocked_()) throw new Error('Les pronos sont verrouillés (la course a démarré).');
  const sk = skippersByClass_();
  const incoming = b.picks || {};
  const sh = sheet_('Picks');
  const last = sh.getLastRow();
  const names = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => r[0]) : [];
  const idx = names.indexOf(u.pseudo);
  let merged = {};
  if (idx >= 0) { try { merged = JSON.parse(sh.getRange(idx + 2, 2).getValue() || '{}'); } catch (e) { merged = {}; } }
  CLASSES.forEach(c => {
    const arr = incoming[c.id];
    if (arr === undefined) return;
    const filled = arr.filter(Boolean);
    if (filled.length === 0) { delete merged[c.id]; return; }
    if (filled.length !== c.n || arr.length !== c.n) throw new Error(c.label + ' : il faut choisir exactement ' + c.n + ' skippers.');
    if (new Set(filled).size !== filled.length) throw new Error(c.label + ' : un skipper est choisi deux fois.');
    filled.forEach(s => { if (!sk[c.id].some(x => x.name === s)) throw new Error(c.label + ' : skipper inconnu (' + s + ').'); });
    merged[c.id] = arr.slice();
  });
  const row = [u.pseudo, JSON.stringify(merged), new Date().toISOString()];
  if (idx >= 0) sh.getRange(idx + 2, 1, 1, 3).setValues([row]); else sh.appendRow(row);
  cacheDel_('picks');
  return { ok: true };
}

function me_(b) {
  const u = requireUser_(b);
  return { me: meOf_(u), picks: picksByUser_()[u.pseudo] || {} };
}

function board_(b) {
  const u = requireUser_(b);
  const lm0 = leaguesMap_();
  // admin : ne joue pas, voit « général » ou la ligue demandée ; joueur : sa ligue, ou le général
  const scope = u.role === 'admin' ? (lm0[b.scope] ? String(b.scope) : 'all') : (b.scope === 'all' || !u.league ? 'all' : u.league);
  const lm = leaguesMap_();
  const s = cached_('board_' + scope, 20, () => {
    const prev = {};
    rows_('Prev').forEach(p => { if (String(p.scope) === scope) prev[p.pseudo] = Number(p.rank); });
    const rk = rankingByClass_();
    return {
      board: leaderboard_(scope).map(x => {
        const pbc = {};
        CLASSES.forEach(c => (pbc[c.id] = x.byClass[c.id].pts));
        return { pseudo: x.pseudo, rank: x.rank, total: x.total, prevRank: prev[x.pseudo] || null, pointsByClass: pbc };
      }),
      ranking: rk.ranking, updatedAt: rk.updatedAt, finals: finals_()
    };
  });
  return Object.assign({ leagues: u.role === 'admin' ? Object.keys(lm).map(k => ({ id: lm[k].id, name: lm[k].name, wa: lm[k].wa })) : undefined, locked: isLocked_(), scope: scope, leagueName: scope !== 'all' && lm[scope] ? lm[scope].name : '', leaguesCount: Object.keys(lm).length }, s);
}

/** Détail des points d'un joueur : visible seulement après le verrouillage. */
function detail_(b) {
  requireUser_(b);
  if (!isLocked_()) return { details: null };
  const picks = picksByUser_()[b.pseudo] || {};
  const rk = rankingByClass_().ranking;
  const details = {};
  CLASSES.forEach(c => (details[c.id] = scoreClass_(picks[c.id], rk[c.id].slice(0, c.n), c.n)));
  return { details: details };
}

// ====== ACTIONS ADMIN ======
function adminGet_(b) {
  requireAdmin_(b);
  const cfg = getConfig_();
  const users = rows_('Users').map(u => ({ pseudo: u.pseudo, role: u.role, createdAt: u.createdAt, active: String(u.active) === 'true', league: String(u.league || ''), phone: fixPhone_(u.phone) }));
  const counts = {};
  users.forEach(u => { if (u.role !== 'admin') counts[u.league] = (counts[u.league] || 0) + 1; });
  const leagues = rows_('Leagues').map(l => ({ id: String(l.id), name: String(l.name), code: String(l.code), count: counts[String(l.id)] || 0, wa: String(l.wa || '') }));
  const requests = rows_('Requests').map(r => ({ pseudo: String(r.pseudo), note: String(r.note || ''), ts: String(r.ts) }));
  return { settings: { lockISO: cfg.lockISO, manualOnly: cfg.manualOnly === 'true', sourceUrl: cfg.sourceUrl || '' }, requests: requests, users: users, leagues: leagues, finals: finals_() };
}

function adminLeagueSave_(b) {
  requireAdmin_(b);
  const name = String(b.name || '').trim(), code = String(b.code || '').trim(), wa = String(b.wa || '').trim();
  if (wa && !/^https:\/\/[A-Za-z0-9.\/_?=&%-]{8,200}$/.test(wa)) throw new Error('Lien du groupe invalide (doit commencer par https://).');
  if (name.length < 2 || name.length > 30) throw new Error('Nom de ligue : 2 à 30 caractères.');
  if (!/^[A-Za-z0-9]{3,20}$/.test(code)) throw new Error('Code : 3 à 20 lettres/chiffres, sans espace.');
  const ls = rows_('Leagues');
  const other = l => String(l.id) !== String(b.id || '');
  if (ls.some(l => other(l) && String(l.code).toUpperCase() === code.toUpperCase())) throw new Error('Ce code est déjà utilisé par une autre ligue.');
  if (ls.some(l => other(l) && String(l.name).toLowerCase() === name.toLowerCase())) throw new Error('Ce nom est déjà pris.');
  if (b.id) {
    const l = ls.find(x => String(x.id) === String(b.id));
    if (!l) throw new Error('Ligue introuvable.');
    l.name = name; l.code = code; l.wa = wa;
  } else {
    let n = 1;
    ls.forEach(l => { n = Math.max(n, Number(String(l.id).slice(1)) + 1); });
    ls.push({ id: 'L' + n, name: name, code: code, createdAt: new Date().toISOString(), wa: wa });
  }
  replaceRows_('Leagues', ls);
  cacheDel_('leagues');
  delBoards_();
  return { ok: true };
}

function adminLeagueDelete_(b) {
  requireAdmin_(b);
  const ls = rows_('Leagues');
  if (!ls.some(l => String(l.id) === String(b.id))) throw new Error('Ligue introuvable.');
  if (ls.length <= 1) throw new Error('Il faut garder au moins une ligue.');
  if (rows_('Users').some(u => String(u.league) === String(b.id))) throw new Error('Cette ligue contient encore des joueurs : déplace-les d\'abord.');
  replaceRows_('Leagues', ls.filter(l => String(l.id) !== String(b.id)));
  cacheDel_('leagues');
  delBoards_();
  return { ok: true };
}

function adminMoveUser_(b) {
  requireAdmin_(b);
  if (!leaguesMap_()[String(b.league)]) throw new Error('Ligue introuvable.');
  const users = rows_('Users');
  const u = users.find(x => x.pseudo === b.pseudo);
  if (!u) throw new Error('Joueur introuvable.');
  u.league = String(b.league);
  replaceRows_('Users', users);
  cacheDel_('users');
  delBoards_();
  return { ok: true };
}

/* ============ CHAT (par ligue) ============ */
const CHAT_KEEP = 150;   // messages renvoyés par ligue
function chatTail_() {   // lit seulement la fin de la feuille (rapide même avec des milliers de messages)
  const sh = sheet_('Chat'), last = sh.getLastRow();
  if (last < 2) return [];
  const from = Math.max(2, last - 399);
  return sh.getRange(from, 1, last - from + 1, SHEETS.Chat.length).getValues()
    .filter(r => r[0] !== '' && r[0] !== null)
    .map(r => ({ id: String(r[0]), league: String(r[1]), pseudo: String(r[2]), role: String(r[3]), text: String(r[4]), ts: String(r[5]) }));
}
function chatDel_() { cacheDel_.apply(null, [].concat(Object.keys(leaguesMap_()).map(id => 'chat_' + id))); }
function chatLeague_(u, b) {
  const lm = leaguesMap_();
  const id = u.role === 'admin' && b.league ? String(b.league) : u.league;
  if (!lm[id]) throw new Error('Ligue introuvable.');
  return id;
}

function chatGet_(b) {
  const u = requireUser_(b);
  const id = chatLeague_(u, b);
  const msgs = cached_('chat_' + id, 8, () => chatTail_().filter(m => m.league === id || m.league === '*').slice(-CHAT_KEEP));
  const since = Number(b.since || 0);
  return { league: id, leagueName: leaguesMap_()[id].name, messages: since ? msgs.filter(m => Number(m.id.split('-')[0]) > since) : msgs, serverNow: Date.now() };
}

function chatSend_(b) {
  const u = requireUser_(b);
  const text = String(b.text || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 300);
  if (!text) throw new Error('Message vide.');
  const rl = 'rl_' + String(u.pseudo).toLowerCase();
  if (cacheGet_(rl)) throw new Error('Doucement : 2 secondes entre deux messages.');
  cachePut_(rl, 1, 2);
  const toAll = u.role === 'admin' && b.all === true;
  const league = toAll ? '*' : chatLeague_(u, b);
  const now = Date.now();
  appendRow_('Chat', { id: now + '-' + Math.floor(Math.random() * 1000), league: league, pseudo: u.pseudo, role: u.role, text: text, ts: new Date(now).toISOString() });
  chatDel_();
  return { ok: true };
}

function chatDelete_(b) {
  requireAdmin_(b);
  const sh = sheet_('Chat'), last = sh.getLastRow();
  const from = Math.max(2, last - 399);
  if (last < 2) throw new Error('Message introuvable.');
  const ids = sh.getRange(from, 1, last - from + 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(b.id)) { sh.deleteRow(from + i); chatDel_(); return { ok: true }; }
  }
  throw new Error('Message introuvable.');
}

function adminSettings_(b) {
  requireAdmin_(b);
  const s = b.settings || {};
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
    if (CLASSES.some(c => cur[c.id].length)) snapshotPrev_();   // pas de flèches ▲▼ au tout premier classement
    const now = new Date().toISOString();
    const out = [];
    CLASSES.forEach(c => {
      const list = map[c.id] !== undefined ? map[c.id] : cur[c.id];
      list.forEach((s, i) => out.push({ class: c.id, rank: i + 1, skipper: s, updatedAt: now }));
    });
    replaceRows_('Ranking', out);
    cacheDel_('rank');
    delBoards_();
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
  if (pin.length < 6 || pin.length > 64) throw new Error('Mot de passe : 6 caractères minimum.');
  if (/\s/.test(pin)) throw new Error('Le mot de passe ne doit pas contenir d\'espace.');
  const users = rows_('Users');
  const u = users.find(x => x.pseudo === b.pseudo);
  if (!u) throw new Error('Joueur introuvable.');
  u.salt = Utilities.getUuid(); u.hash = hash_(pin, u.salt);
  replaceRows_('Users', users);
  const rq = rows_('Requests');
  if (rq.some(r => String(r.pseudo).toLowerCase() === String(u.pseudo).toLowerCase())) replaceRows_('Requests', rq.filter(r => String(r.pseudo).toLowerCase() !== String(u.pseudo).toLowerCase()));
  cacheDel_('users');
  return { ok: true };
}

/** Public : « mot de passe oublié ». Réponse toujours identique (ne révèle pas si le pseudo existe). */
function forgot_(b) {
  const pseudo = cleanPseudo_(b.pseudo), key = pseudo.toLowerCase();
  const note = String(b.note || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 120);
  const u = usersMap_()[key];
  if (u && u.role !== 'admin' && u.active === 'true') {
    const rl = 'fg_' + key.replace(/[^a-z0-9]/g, '_').slice(0, 60);
    if (!cacheGet_(rl)) {
      cachePut_(rl, 1, 60);
      const rq = rows_('Requests');
      if (!rq.some(r => String(r.pseudo).toLowerCase() === key)) appendRow_('Requests', { pseudo: u.pseudo, note: note, ts: new Date().toISOString() });
    }
  }
  return { ok: true };
}

function adminDismissRequest_(b) {
  requireAdmin_(b);
  replaceRows_('Requests', rows_('Requests').filter(r => String(r.pseudo).toLowerCase() !== String(b.pseudo || '').toLowerCase()));
  return { ok: true };
}

function changePassword_(b) {
  const u = requireUser_(b);
  const pin = String(b.newPin || '');
  if (hash_(String(b.pin || ''), u.salt) !== u.hash) throw new Error('Mot de passe actuel incorrect.');
  if (pin.length < 6 || pin.length > 64) throw new Error('Mot de passe : 6 caractères minimum.');
  if (/\s/.test(pin)) throw new Error('Le mot de passe ne doit pas contenir d\'espace.');
  const users = rows_('Users');
  const row = users.find(x => x.pseudo === u.pseudo);
  row.salt = Utilities.getUuid(); row.hash = hash_(pin, row.salt);
  replaceRows_('Users', users);
  cacheDel_('users');
  return { token: makeToken_(row) };
}

function adminDeleteUser_(b) {
  const me = requireAdmin_(b);
  if (b.pseudo === me.pseudo) throw new Error('Tu ne peux pas te supprimer toi-même.');
  replaceRows_('Users', rows_('Users').filter(u => u.pseudo !== b.pseudo));
  replaceRows_('Picks', rows_('Picks').filter(p => p.pseudo !== b.pseudo));
  cacheDel_('users', 'picks');
  delBoards_();
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
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
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
    case 'detail':         return detail_(b);
    case 'adminGet':       return adminGet_(b);
    case 'adminSettings':  return adminSettings_(b);
    case 'adminSetRanking':return adminSetRanking_(b);
    case 'adminResetPin':  return adminResetPin_(b);
    case 'adminDeleteUser':return adminDeleteUser_(b);
    case 'forgot':         return forgot_(b);
    case 'adminDismissRequest': return adminDismissRequest_(b);
    case 'changePassword': return changePassword_(b);
    case 'chatGet':        return chatGet_(b);
    case 'chatSend':       return chatSend_(b);
    case 'chatDelete':     return chatDelete_(b);
    case 'adminLeagueSave':return adminLeagueSave_(b);
    case 'adminLeagueDelete':return adminLeagueDelete_(b);
    case 'adminMoveUser':  return adminMoveUser_(b);
    case 'adminRefresh':   return adminRefresh_(b);
    default: throw new Error('Action inconnue.');
  }
}

// Seules les actions qui ÉCRIVENT passent par le verrou. Les lectures et les connexions ne font jamais la queue.
const WRITE_ACTIONS = ['register', 'savePicks', 'adminSettings', 'adminSetRanking', 'adminResetPin', 'adminDeleteUser', 'adminRefresh', 'adminLeagueSave', 'adminLeagueDelete', 'adminMoveUser', 'chatSend', 'chatDelete', 'forgot', 'adminDismissRequest', 'changePassword'];

function doPost(e) {
  let out, locked = false;
  const lock = LockService.getScriptLock();
  try {
    const b = JSON.parse(e.postData.contents);
    if (WRITE_ACTIONS.indexOf(b.action) !== -1) {
      try { lock.waitLock(25000); locked = true; } catch (x) { throw new Error('BUSY : Trop de monde en même temps, réessaie dans quelques secondes.'); }
    }
    out = { ok: true, data: handle_(b) };
  } catch (err) {
    out = { ok: false, error: String(err.message || err) };
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (x) {} }
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: 'MPP RDR 2026 API' })).setMimeType(ContentService.MimeType.JSON);
}
