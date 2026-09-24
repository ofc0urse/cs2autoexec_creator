'use strict';

// Wyszukiwanie folderu cfg Counter-Strike 2 na podstawie danych Steama.
// Kolejność: rejestr Windows -> domyślne ścieżki Steama -> libraryfolders.vdf
// (wszystkie biblioteki, także na innych dyskach) -> popularne ścieżki na każdym dysku.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const CS2_APPID = '730';
const DEFAULT_INSTALLDIR = 'Counter-Strike Global Offensive';

/** Minimalny parser formatu VDF/KeyValues używanego przez Steama. */
function parseVdf(text) {
  const tokens = [];
  const re = /"((?:[^"\\]|\\.)*)"|([{}])|\/\/[^\n]*/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) tokens.push({ s: m[1].replace(/\\(.)/g, '$1') });
    else if (m[2]) tokens.push(m[2]);
  }
  let i = 0;
  function obj() {
    const o = {};
    while (i < tokens.length) {
      const t = tokens[i++];
      if (t === '}') return o;
      if (typeof t !== 'object') continue;
      const next = tokens[i++];
      if (next === '{') o[t.s.toLowerCase()] = obj();
      else if (next && typeof next === 'object') o[t.s.toLowerCase()] = next.s;
    }
    return o;
  }
  return obj();
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch (_) { return false; }
}

function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return null; }
}

function regQuery(key, value) {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve(null);
    execFile('reg', ['query', key, '/v', value], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const m = /REG_(?:EXPAND_)?SZ\s+(.+?)\s*$/m.exec(stdout);
      resolve(m ? m[1] : null);
    });
  });
}

async function steamRoots() {
  const roots = [];
  const add = p => {
    if (!p) return;
    const norm = path.normalize(p);
    if (!roots.some(r => r.toLowerCase() === norm.toLowerCase())) roots.push(norm);
  };
  add(await regQuery('HKCU\\Software\\Valve\\Steam', 'SteamPath'));
  add(await regQuery('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'));
  add(await regQuery('HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath'));
  if (process.platform === 'win32') {
    add(path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam'));
    add(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Steam'));
  } else {
    const home = process.env.HOME || '';
    add(path.join(home, '.steam', 'steam'));
    add(path.join(home, '.local', 'share', 'Steam'));
  }
  return roots.filter(isDir);
}

/** Zwraca listę bibliotek Steama; te zawierające CS2 (appid 730) są na początku. */
function librariesFromRoot(root) {
  const vdf = readText(path.join(root, 'steamapps', 'libraryfolders.vdf'));
  const libs = [{ path: root, hasCs2: false }];
  if (!vdf) return libs;
  const parsed = parseVdf(vdf);
  const lf = parsed.libraryfolders || {};
  for (const k of Object.keys(lf)) {
    const entry = lf[k];
    if (typeof entry === 'string') {
      // stary format: "1" "D:\\SteamLibrary"
      if (/^\d+$/.test(k)) libs.push({ path: entry, hasCs2: false });
    } else if (entry && entry.path) {
      libs.push({ path: entry.path, hasCs2: !!(entry.apps && CS2_APPID in entry.apps) });
    }
  }
  return libs;
}

function cs2CfgInLibrary(lib) {
  const steamapps = path.join(lib, 'steamapps');
  let installdir = DEFAULT_INSTALLDIR;
  const acf = readText(path.join(steamapps, `appmanifest_${CS2_APPID}.acf`));
  if (acf) {
    const st = parseVdf(acf).appstate;
    if (st && st.installdir) installdir = st.installdir;
  }
  const csgoDir = path.join(steamapps, 'common', installdir, 'game', 'csgo');
  return isDir(csgoDir) ? path.join(csgoDir, 'cfg') : null;
}

/** Automatyczne wykrywanie folderu game\csgo\cfg. Zwraca ścieżkę lub null. */
async function findCs2CfgDir() {
  const seen = new Set();
  const libs = [];
  for (const root of await steamRoots()) {
    for (const lib of librariesFromRoot(root)) {
      const key = path.normalize(lib.path).toLowerCase();
      const existing = libs.find(l => l.key === key);
      if (existing) { existing.hasCs2 = existing.hasCs2 || lib.hasCs2; continue; }
      libs.push({ key, path: path.normalize(lib.path), hasCs2: lib.hasCs2 });
    }
  }
  libs.sort((a, b) => Number(b.hasCs2) - Number(a.hasCs2));
  for (const lib of libs) {
    seen.add(lib.key);
    const cfg = cs2CfgInLibrary(lib.path);
    if (cfg) return cfg;
  }

  // Ostatnia deska ratunku: typowe nazwy bibliotek na każdym dysku.
  if (process.platform === 'win32') {
    for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
      const drive = `${letter}:\\`;
      if (!isDir(drive)) continue;
      for (const sub of ['SteamLibrary', 'Steam', 'Games\\Steam', 'Games\\SteamLibrary', 'Program Files (x86)\\Steam', 'Program Files\\Steam']) {
        const lib = path.join(drive, sub);
        if (seen.has(lib.toLowerCase())) continue;
        const cfg = cs2CfgInLibrary(lib);
        if (cfg) return cfg;
      }
    }
  }
  return null;
}

/**
 * Zamienia folder wskazany ręcznie przez użytkownika na folder cfg.
 * Akceptuje: folder cfg, folder csgo, folder game, folder gry, bibliotekę Steama itd.
 */
function resolveCfgDir(selected) {
  const p = path.normalize(selected);
  const base = path.basename(p).toLowerCase();
  const candidates = [];
  if (base === 'cfg' && path.basename(path.dirname(p)).toLowerCase() === 'csgo') candidates.push(p);
  if (base === 'csgo') candidates.push(path.join(p, 'cfg'));
  if (base === 'game') candidates.push(path.join(p, 'csgo', 'cfg'));
  candidates.push(path.join(p, 'game', 'csgo', 'cfg'));
  candidates.push(path.join(p, DEFAULT_INSTALLDIR, 'game', 'csgo', 'cfg'));
  candidates.push(path.join(p, 'common', DEFAULT_INSTALLDIR, 'game', 'csgo', 'cfg'));
  candidates.push(path.join(p, 'steamapps', 'common', DEFAULT_INSTALLDIR, 'game', 'csgo', 'cfg'));
  for (const c of candidates) {
    // Folder cfg może nie istnieć, ale game\csgo musi – to potwierdza instalację CS2.
    if (isDir(path.dirname(c)) && path.basename(path.dirname(path.dirname(c))).toLowerCase() === 'game') return c;
  }
  return null;
}

module.exports = { parseVdf, findCs2CfgDir, resolveCfgDir, librariesFromRoot, cs2CfgInLibrary };
