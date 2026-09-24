/*
 * CS2 Autoexec Creator – pure logic shared by the page, the Electron app and
 * the Node tests: state, file generation, import parser, share links.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.CS2Core = factory(root.CS2Data);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  const STATE_VERSION = 2;

  /* ============================================================ helpers */

  const decimals = step => (String(step).split('.')[1] || '').length;

  function clampSetting(def, v) {
    if (def.type === 'bool') {
      if (typeof v === 'string') v = v.trim().toLowerCase();
      return v === true || v === 1 || v === '1' || v === 'true';
    }
    if (def.type === 'switch') {
      if (typeof v === 'string') v = v.trim().toLowerCase();
      return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
    }
    if (def.type === 'select') {
      const n = Number(v);
      return def.options.includes(n) ? n : def.def;
    }
    let n = Number(v);
    if (!Number.isFinite(n)) return def.def;
    n = Math.min(def.max, Math.max(def.min, n));
    return Number((Math.round((n - def.min) / def.step) * def.step + def.min).toFixed(decimals(def.step)));
  }

  function fmt(n) {
    const s = Number(n).toFixed(4);
    return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
  }

  function formatValue(def, v) {
    if (def.type === 'bool') return v ? 'true' : 'false';
    if (def.type === 'switch') return v ? '1' : '0';
    return fmt(v);
  }

  // CS2 key names contain no spaces, quotes or semicolons.
  function sanitizeKey(k) {
    if (typeof k !== 'string') return '';
    k = k.trim().toLowerCase();
    return /^[a-z0-9_\-=\[\]\\',.\/`]{1,20}$/.test(k) ? k : '';
  }

  // A bind command must stay on one line and inside one pair of quotes.
  function sanitizeCommand(c) {
    if (typeof c !== 'string') return '';
    c = c.replace(/[\r\n"]/g, ' ').replace(/\s+/g, ' ').trim();
    return c.length > 200 ? '' : c;
  }

  function stripDiacritics(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
  }

  function hexToRgb(hex) {
    const n = parseInt(String(hex).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Number(x).toString(16).padStart(2, '0')).join('');
  }

  /* ============================================================ state */

  function defaultLaunch() {
    const l = {};
    for (const o of D.LAUNCH_OPTIONS) l[o.id] = o.def;
    return l;
  }

  function defaultState() {
    const settings = {};
    for (const s of D.SETTINGS) if (!s.ui) settings[s.key] = s.def;
    const sections = {};
    for (const id of D.FILE_SECTIONS) sections[id] = true;
    return { v: STATE_VERSION, settings, sections, binds: { x: 'r_cleardecals' }, launch: defaultLaunch(), dpi: 800 };
  }

  /** Turns any (possibly untrusted) object into a complete, valid state. */
  function sanitizeState(input) {
    const s = defaultState();
    if (!input || typeof input !== 'object') return s;
    if (input.settings && typeof input.settings === 'object') {
      for (const key of Object.keys(s.settings)) {
        if (key in input.settings) s.settings[key] = clampSetting(D.SETTING_MAP[key], input.settings[key]);
      }
    }
    if (input.sections && typeof input.sections === 'object') {
      for (const id of Object.keys(s.sections)) if (id in input.sections) s.sections[id] = !!input.sections[id];
    }
    if (input.binds && typeof input.binds === 'object') {
      s.binds = {};
      for (const [k, c] of Object.entries(input.binds)) {
        const key = sanitizeKey(k), cmd = sanitizeCommand(c);
        if (key && cmd) s.binds[key] = cmd;
      }
    }
    if (input.launch && typeof input.launch === 'object') {
      for (const o of D.LAUNCH_OPTIONS) {
        if (!(o.id in input.launch)) continue;
        const v = input.launch[o.id];
        if (o.type === 'check') s.launch[o.id] = !!v;
        else if (o.type === 'select') s.launch[o.id] = o.options.includes(v) ? v : o.def;
        else if (o.type === 'res') s.launch[o.id] = /^\d{3,4}x\d{3,4}$/.test(v) ? v : '';
      }
    }
    if (Number.isFinite(+input.dpi) && +input.dpi > 0 && +input.dpi <= 64000) s.dpi = Math.round(+input.dpi);
    return s;
  }

  /** Applies a preset on top of the given state (returns a new state). */
  function applyPreset(state, preset) {
    const next = sanitizeState(JSON.parse(JSON.stringify(state)));
    for (const [k, v] of Object.entries(preset.settings || {})) {
      if (D.SETTING_MAP[k]) next.settings[k] = clampSetting(D.SETTING_MAP[k], v);
    }
    for (const [k, c] of Object.entries(preset.binds || {})) next.binds[k] = c;
    Object.assign(next.launch, preset.launch || {});
    return sanitizeState(next);
  }

  /* ============================================================ binds */

  const PLAYER_ACTION = /^[+-][a-z_0-9]+$/i;

  /** Warnings for a bind command. */
  function bindWarnings(cmd) {
    const parts = String(cmd).split(';').map(p => p.trim()).filter(Boolean);
    const warnings = [];
    const actions = parts.filter(p => PLAYER_ACTION.test(p.split(/\s+/)[0]));
    if (parts.length > 1 && actions.length >= 1) warnings.push('multi_action');
    else if (parts.length > 1) warnings.push('multi_command');
    if (parts.some(p => /^alias\b/i.test(p))) warnings.push('alias');
    return warnings;
  }

  function isBlockedBind(cmd) {
    return bindWarnings(cmd).includes('multi_action') || !!MYTH_BY_NAME[String(cmd).trim().split(/[\s;]/)[0].toLowerCase()];
  }

  function actionForCommand(cmd) {
    const c = String(cmd).trim().toLowerCase();
    return D.ACTIONS.find(a => a.cmd.toLowerCase() === c) || null;
  }

  /* ============================================================ generation */

  function isAdvancedDefault(def, value) {
    return def.adv && value === def.def;
  }

  /**
   * Generates autoexec.cfg.
   * @param state   full state
   * @param t       translator (key, vars) -> string, used only for comments
   */
  function generateCfg(state, t) {
    t = t || (k => k);
    const c = s => stripDiacritics(s);
    const L = [
      '// ============================================================',
      '//  autoexec.cfg - Counter-Strike 2',
      `//  ${c(t('cfg.generated'))}: ${new Date().toISOString().slice(0, 10)} (CS2 Autoexec Creator)`,
      `//  ${c(t('cfg.place'))}: ...\\Counter-Strike Global Offensive\\game\\csgo\\cfg\\`,
      `//  ${c(t('cfg.launch'))}: +exec autoexec`,
      '// ============================================================',
    ];
    let any = false;
    for (const cat of D.FILE_SECTIONS) {
      if (!state.sections[cat]) continue;
      const lines = [];
      if (cat === 'binds') {
        for (const key of Object.keys(state.binds).sort()) {
          if (isBlockedBind(state.binds[key])) continue; // CS2 blocks these – never write them
          lines.push(`bind "${key}" "${state.binds[key]}"`);
        }
      } else {
        for (const def of D.SETTINGS) {
          if (def.cat !== cat || def.ui || def.status !== 'works') continue;
          const v = state.settings[def.key];
          if (isAdvancedDefault(def, v)) continue; // advanced options only when changed
          lines.push(`${def.key} ${formatValue(def, v)}`);
        }
      }
      if (!lines.length) continue;
      any = true;
      const header = (D.CATEGORIES.find(x => x.id === cat) || {}).header || cat.toUpperCase();
      L.push('', `// ---------- ${header} ----------`, ...lines);
    }
    if (!any) L.push('', `// ${c(t('cfg.empty'))}`);
    L.push('', `echo "${c(t('cfg.loaded'))}"`, '');
    return L.join('\n');
  }

  function launchOptions(state) {
    const out = [];
    for (const o of D.LAUNCH_OPTIONS) {
      const v = state.launch[o.id];
      if (o.type === 'check' && v) out.push(o.arg);
      else if (o.type === 'select' && v) out.push(v);
      else if (o.type === 'res' && v) {
        const [w, h] = v.split('x');
        out.push(`-w ${w} -h ${h}`);
      }
    }
    return out.join(' ');
  }

  /* ============================================================ import */

  /** Splits one cfg line into commands (respecting quotes) and tokens. */
  function splitCommands(line) {
    const cmds = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { q = !q; cur += ch; continue; }
      if (!q && ch === '/' && line[i + 1] === '/') break;
      if (!q && ch === ';') { cmds.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cmds.push(cur);
    return cmds.map(s => s.trim()).filter(Boolean);
  }

  function tokenize(cmd) {
    const out = [];
    const re = /"([^"]*)"?|(\S+)/g;
    let m;
    while ((m = re.exec(cmd))) out.push(m[1] !== undefined ? m[1] : m[2]);
    return out;
  }

  const MYTH_BY_NAME = {};
  for (const m of D.MYTHS) for (const n of m.names) MYTH_BY_NAME[n.toLowerCase()] = m;

  /**
   * Parses an autoexec.cfg / config.cfg text.
   * Returns { settings, binds, report } – settings/binds contain only valid
   * values; the report lists what was skipped and why.
   */
  function parseCfg(text) {
    const settings = {}, binds = {};
    const report = { applied: [], binds: [], legacy: [], myths: [], unknown: [], warnings: [], ignored: [] };
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    lines.forEach((raw, idx) => {
      for (const cmd of splitCommands(raw)) {
        const tok = tokenize(cmd);
        if (!tok.length) continue;
        const name = tok[0].toLowerCase();
        const line = idx + 1;
        if (name === 'bind' && tok.length >= 3) {
          const key = sanitizeKey(tok[1]);
          const command = sanitizeCommand(tok.slice(2).join(' '));
          if (!key || !command) { report.unknown.push({ line, text: cmd }); continue; }
          const warns = bindWarnings(command);
          // Blocked or broken binds are reported and never imported.
          if (warns.includes('multi_action') || MYTH_BY_NAME[command.split(/[\s;]/)[0].toLowerCase()]) {
            report.warnings.push({ line, code: warns.includes('multi_action') ? 'multi_action' : 'alias', key, skipped: true });
            continue;
          }
          if (binds[key] && binds[key] !== command) report.warnings.push({ line, code: 'duplicate_key', key });
          for (const w of warns) report.warnings.push({ line, code: w, key });
          binds[key] = command;
          report.binds.push({ line, key, command });
          continue;
        }
        if (['echo', 'exec', 'unbindall', 'host_writeconfig', 'alias', 'unbind', 'clear'].includes(name)) {
          report.ignored.push({ line, text: cmd });
          continue;
        }
        const def = D.SETTING_MAP[name];
        if (def && !def.ui) {
          if (tok.length < 2) { report.unknown.push({ line, text: cmd }); continue; }
          settings[name] = clampSetting(def, tok[1]);
          report.applied.push({ line, name, value: settings[name] });
          continue;
        }
        if (D.LEGACY_CROSSHAIR[name] || (MYTH_BY_NAME[name] && MYTH_BY_NAME[name].id === 'old_crosshair')) {
          report.legacy.push({ line, name, replacement: D.LEGACY_CROSSHAIR[name] || null });
          continue;
        }
        if (MYTH_BY_NAME[name]) { report.myths.push({ line, name, myth: MYTH_BY_NAME[name].id }); continue; }
        report.unknown.push({ line, text: cmd });
      }
    });
    return { settings, binds, report };
  }

  /** Merges a parse result into a state (binds from the file replace existing ones on the same keys). */
  function mergeImport(state, parsed, replaceBinds) {
    const next = sanitizeState(JSON.parse(JSON.stringify(state)));
    Object.assign(next.settings, parsed.settings);
    next.binds = Object.assign(replaceBinds ? {} : next.binds, parsed.binds);
    return sanitizeState(next);
  }

  /* ============================================================ share links */

  function toBase64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let b64;
    if (typeof btoa === 'function') {
      let bin = '';
      bytes.forEach(b => { bin += String.fromCharCode(b); });
      b64 = btoa(bin);
    } else {
      b64 = Buffer.from(bytes).toString('base64');
    }
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(s) {
    const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
    let bytes;
    if (typeof atob === 'function') {
      const bin = atob(b64);
      bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    } else {
      bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
    }
    return new TextDecoder().decode(bytes);
  }

  /** Encodes only what differs from the defaults, to keep links short. */
  function encodeShare(state) {
    const d = defaultState();
    const diff = { v: STATE_VERSION };
    const s = {};
    for (const [k, v] of Object.entries(state.settings)) if (v !== d.settings[k]) s[k] = v;
    if (Object.keys(s).length) diff.s = s;
    if (JSON.stringify(state.binds) !== JSON.stringify(d.binds)) diff.b = state.binds;
    const off = Object.keys(state.sections).filter(id => !state.sections[id]);
    if (off.length) diff.x = off;
    const l = {};
    for (const [k, v] of Object.entries(state.launch)) if (v !== d.launch[k]) l[k] = v;
    if (Object.keys(l).length) diff.l = l;
    return toBase64Url(JSON.stringify(diff));
  }

  function decodeShare(code) {
    const diff = JSON.parse(fromBase64Url(code));
    if (!diff || typeof diff !== 'object') throw new Error('bad share code');
    const d = defaultState();
    const sections = {};
    for (const id of Object.keys(d.sections)) sections[id] = !(Array.isArray(diff.x) && diff.x.includes(id));
    return sanitizeState({
      settings: Object.assign({}, d.settings, diff.s || {}),
      binds: diff.b || d.binds,
      sections,
      launch: Object.assign({}, d.launch, diff.l || {}),
    });
  }

  return {
    STATE_VERSION, clampSetting, formatValue, fmt, sanitizeKey, sanitizeCommand, stripDiacritics,
    hexToRgb, rgbToHex, defaultState, sanitizeState, applyPreset, bindWarnings, isBlockedBind, actionForCommand,
    generateCfg, launchOptions, parseCfg, mergeImport, encodeShare, decodeShare, splitCommands, tokenize,
  };
});
