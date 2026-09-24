'use strict';

const test = require('node:test');
const assert = require('node:assert');
const D = require('../assets/data.js');
const C = require('../assets/core.js');
const I = require('../assets/i18n.js');

const MYTH_NAMES = D.MYTHS.flatMap(m => m.names).map(n => n.toLowerCase());
const commandsOf = cfg => cfg.split('\n').filter(l => l && !l.startsWith('//'));

test('crosshair commands match the in-game console dump (Rush Hour)', () => {
  // Names confirmed by `find crosshair` after the Sept 2026 update.
  const consoleNames = new Set([
    'cl_crosshair_drawoutline', 'cl_crosshair_dynamic_maxdist_splitratio', 'cl_crosshair_dynamic_splitalpha_innermod',
    'cl_crosshair_dynamic_splitalpha_outermod', 'cl_crosshair_dynamic_splitdist', 'cl_crosshair_dynamic_spread_limit',
    'cl_crosshair_friendly_warning', 'cl_crosshair_gap', 'cl_crosshair_length', 'cl_crosshair_recoil',
    'cl_crosshair_sniper_width', 'cl_crosshair_t', 'cl_crosshair_thickness', 'cl_crosshaircolor_a',
    'cl_crosshaircolor_b', 'cl_crosshaircolor_g', 'cl_crosshaircolor_r', 'cl_crosshairdot', 'cl_crosshairstyle',
    'cl_grenadecrosshair_decoy', 'cl_grenadecrosshair_explosive', 'cl_grenadecrosshair_fire', 'cl_grenadecrosshair_flash',
    'cl_grenadecrosshair_keepusercrosshair', 'cl_grenadecrosshair_smoke', 'cl_grenadecrosshairdelay_decoy',
    'cl_grenadecrosshairdelay_explosive', 'cl_grenadecrosshairdelay_fire', 'cl_grenadecrosshairdelay_flash',
    'cl_grenadecrosshairdelay_smoke', 'cl_ironsight_usecrosshaircolor', 'cl_observed_bot_crosshair',
    'cl_show_observer_crosshair', 'cl_teamid_overhead_fade_near_crosshair', 'crosshair',
    'cl_ping_fade_deadzone', 'cl_ping_fade_distance',
  ]);
  for (const s of D.SETTINGS.filter(s => s.src === 'console')) {
    if (s.ui) continue;
    assert.ok(consoleNames.has(s.key), `${s.key} is not in the console dump`);
  }
  // Defaults from the console dump.
  const expect = { cl_crosshairstyle: 7, cl_crosshair_length: 8, cl_crosshair_gap: 4, cl_crosshair_thickness: 2,
    cl_crosshair_drawoutline: 1, cl_crosshair_recoil: true, cl_crosshair_dynamic_spread_limit: 255,
    cl_crosshair_dynamic_splitdist: 3, cl_crosshair_dynamic_maxdist_splitratio: 1,
    cl_crosshair_dynamic_splitalpha_innermod: 0, cl_crosshair_dynamic_splitalpha_outermod: 1, cl_crosshair_sniper_width: 1 };
  for (const [k, v] of Object.entries(expect)) assert.strictEqual(D.SETTING_MAP[k].def, v, k);
  // Explicit console ranges.
  assert.deepStrictEqual(D.SETTING_MAP.cl_crosshairstyle.options, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepStrictEqual(D.SETTING_MAP.cl_crosshair_drawoutline.options, [0, 1, 2]);
  assert.strictEqual(D.SETTING_MAP.cl_crosshair_dynamic_splitalpha_outermod.min, 0.3);
  assert.strictEqual(D.SETTING_MAP.cl_crosshair_thickness.min, 1);
});

test('no myth or legacy command is a setting', () => {
  for (const s of D.SETTINGS) assert.ok(!MYTH_NAMES.includes(s.key), s.key);
  for (const k of Object.keys(D.LEGACY_CROSSHAIR)) assert.ok(!D.SETTING_MAP[k], k);
});

test('generated file contains only working commands', () => {
  let state = C.defaultState();
  for (const p of D.PRESETS) state = C.applyPreset(state, p);
  state.binds.c = '+jump; -attack';     // blocked multi-action bind
  state.binds.v = '+jumpthrow';         // needs an alias – blocked
  const cfg = C.generateCfg(state);
  const lines = commandsOf(cfg);
  for (const l of lines) {
    const name = l.split(/\s+/)[0];
    if (name === 'bind' || name === 'echo') continue;
    assert.ok(D.SETTING_MAP[name] && D.SETTING_MAP[name].status === 'works', `unexpected command ${name}`);
  }
  assert.ok(!/jumpthrow|-attack/.test(cfg));
  for (const n of MYTH_NAMES) assert.ok(!lines.some(l => l.split(/\s+/)[0] === n), n);
});

test('advanced options are written only when changed', () => {
  const s = C.defaultState();
  assert.ok(!/cl_grenadecrosshair_smoke/.test(C.generateCfg(s)));
  s.settings.cl_grenadecrosshair_smoke = false;
  assert.match(C.generateCfg(s), /cl_grenadecrosshair_smoke false/);
});

test('skipped sections are not written', () => {
  const s = C.defaultState();
  s.sections.crosshair = false;
  assert.ok(!/cl_crosshair/.test(C.generateCfg(s)));
});

test('values are clamped and typed', () => {
  const def = D.SETTING_MAP.cl_crosshair_dynamic_splitalpha_outermod;
  assert.strictEqual(C.clampSetting(def, 0.1), 0.3);
  assert.strictEqual(C.clampSetting(D.SETTING_MAP.cl_crosshairstyle, 9), 7);
  assert.strictEqual(C.clampSetting(D.SETTING_MAP.cl_crosshair_t, 'true'), true);
  assert.strictEqual(C.clampSetting(D.SETTING_MAP.cl_radar_rotate, 'false'), 0);
  assert.strictEqual(C.clampSetting(D.SETTING_MAP.sensitivity, '1.234'), 1.23);
  assert.strictEqual(C.clampSetting(D.SETTING_MAP.sensitivity, 'abc'), 1.25);
});

test('import → generate round trip', () => {
  const s = C.defaultState();
  s.settings.sensitivity = 2.1;
  s.settings.cl_crosshairstyle = 2;
  s.settings.cl_crosshair_t = true;
  s.settings.cl_crosshair_dynamic_splitdist = 7;
  s.binds = { mouse4: 'slot7', kp_enter: 'sv_rethrow_last_grenade' };
  const parsed = C.parseCfg(C.generateCfg(s));
  const back = C.mergeImport(C.defaultState(), parsed, true);
  assert.deepStrictEqual(back.settings, s.settings);
  assert.deepStrictEqual(back.binds, s.binds);
});

test('import reports legacy, myths, blocked binds and unknown lines', () => {
  const text = [
    'sensitivity "1.5" // comment',
    'cl_crosshairsize 3; cl_crosshairgap -2',
    'vprof_off',
    'mat_queue_mode 2',
    'alias "+jumpthrow" "+jump;-attack"',
    'bind "mouse4" "+jumpthrow"',
    'bind "c" "+jump; -attack"',
    'bind "v" "slot7"',
    'bind "v" "slot8"',
    'something_else 1',
  ].join('\r\n');
  const { settings, binds, report } = C.parseCfg(text);
  assert.deepStrictEqual(settings, { sensitivity: 1.5 });
  assert.deepStrictEqual(binds, { v: 'slot8' });
  assert.deepStrictEqual(report.legacy.map(l => [l.name, l.replacement]),
    [['cl_crosshairsize', 'cl_crosshair_length'], ['cl_crosshairgap', 'cl_crosshair_gap']]);
  assert.deepStrictEqual(report.myths.map(m => m.name), ['vprof_off', 'mat_queue_mode']);
  assert.deepStrictEqual(report.warnings.map(w => w.code), ['alias', 'multi_action', 'duplicate_key']);
  assert.deepStrictEqual(report.unknown.map(u => u.text), ['something_else 1']);
  assert.strictEqual(report.ignored.length, 1); // alias line
});

test('bind warnings', () => {
  assert.deepStrictEqual(C.bindWarnings('slot7'), []);
  assert.deepStrictEqual(C.bindWarnings('+jump; -attack'), ['multi_action']);
  assert.deepStrictEqual(C.bindWarnings('buy vesthelm; buy defuser'), ['multi_command']);
  assert.ok(C.isBlockedBind('+jumpthrow'));
  assert.ok(!C.isBlockedBind('toggle volume 0.1 0.5'));
});

test('share links round trip and reject junk safely', () => {
  let s = C.applyPreset(C.defaultState(), D.PRESETS[0]);
  s.sections.audio = false;
  s.launch.vulkan = true;
  s.launch.res = '1920x1080';
  const back = C.decodeShare(C.encodeShare(s));
  assert.deepStrictEqual(back, C.sanitizeState(s));
  assert.throws(() => C.decodeShare('%%%'));
  // Untrusted values are sanitised.
  const evil = Buffer.from(JSON.stringify({ s: { sensitivity: 999 }, b: { 'x"; quit': 'noclip', ok: 'say "hi"\nquit' } })).toString('base64url');
  const st = C.decodeShare(evil);
  assert.strictEqual(st.settings.sensitivity, 8);
  assert.ok(!('x"; quit' in st.binds));
  assert.strictEqual(st.binds.ok, 'say hi quit');
});

test('launch options builder', () => {
  const s = C.defaultState();
  assert.strictEqual(C.launchOptions(s), '+exec autoexec');
  s.launch.display = '-fullscreen'; s.launch.res = '1280x960'; s.launch.console = true;
  assert.strictEqual(C.launchOptions(s), '+exec autoexec -console -fullscreen -w 1280 -h 960');
});

test('every text exists in English and Polish', () => {
  const keys = [];
  for (const c of D.CATEGORIES) keys.push('cat.' + c.id);
  for (const s of D.SETTINGS) {
    if (s.hidden) continue;
    keys.push(`set.${s.key}.l`, `set.${s.key}.d`, 'grp.' + s.group);
    if (s.type === 'select') for (const o of s.options) keys.push(`opt.${s.key}.${o}`);
  }
  for (const a of D.ACTIONS) keys.push('act.' + a.id);
  for (const c of D.ACTION_CATEGORIES) keys.push('acat.' + c);
  for (const m of D.MYTHS) keys.push(`myth.${m.id}.d`, 'verdict.' + m.verdict);
  for (const o of D.LAUNCH_OPTIONS) {
    keys.push(`launch.${o.id}.l`, `launch.${o.id}.d`);
    if (o.options) for (const v of o.options) keys.push(`launch.${o.id}.opt.${v}`);
  }
  for (const p of D.PRESETS) keys.push(`preset.${p.id}.name`, `preset.${p.id}.desc`);
  for (const v of new Set(Object.values(D.CS2_DEFAULT_BINDS))) keys.push('defbind.' + v);
  for (const k of keys) {
    assert.ok(k in I.en, `missing EN: ${k}`);
    assert.ok(k in I.pl, `missing PL: ${k}`);
  }
  assert.deepStrictEqual(Object.keys(I.en).filter(k => !(k in I.pl)), [], 'keys missing in PL');
  assert.deepStrictEqual(Object.keys(I.pl).filter(k => !(k in I.en)), [], 'keys missing in EN');
});

test('the app uses only translation keys that exist', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require.resolve('../assets/app.js'), 'utf8');
  const used = [...src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map(m => m[1]);
  for (const k of used.filter(k => !k.endsWith('.'))) assert.ok(k in I.en, `app.js uses unknown key ${k}`);
});
