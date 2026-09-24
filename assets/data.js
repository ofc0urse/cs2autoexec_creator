/*
 * CS2 Autoexec Creator – command catalog.
 *
 * Every entry here is something that goes into the generated file (or into the
 * Steam launch options). Labels and descriptions live in i18n.js.
 *
 * Status of each command:
 *   works  – works in the current CS2 build
 *   cheat  – works only with sv_cheats 1 (own/offline server)
 *   server – works only on a server you host (no sv_cheats needed)
 * Commands that are placebo or do not exist in CS2 are NOT here – they are in
 * MYTHS and never written to the file.
 *
 * src: 'console' – name, default and range confirmed from the in-game
 *                  `find crosshair` output after the Rush Hour update (Sept 2026)
 *      'cs2'     – long-standing CS2 command, not part of that console dump
 * uiRange: true  – the game does not publish a range; min/max are only the
 *                  editor's slider limits.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CS2Data = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CATEGORIES = [
    { id: 'start', kind: 'start', icon: 'M3 11l9-8 9 8M5 10v10h14V10' },
    { id: 'mouse', header: 'MOUSE', icon: 'M12 3a6 6 0 0 0-6 6v6a6 6 0 0 0 12 0V9a6 6 0 0 0-6-6zM12 3v6' },
    { id: 'crosshair', header: 'CROSSHAIR', preview: 'crosshair', icon: 'M12 2v7M12 15v7M2 12h7M15 12h7' },
    { id: 'viewmodel', header: 'VIEWMODEL', icon: 'M3 17l6-6 4 4 8-8M14 7h7v7' },
    { id: 'binds', kind: 'binds', header: 'BINDS', icon: 'M3 6h18v12H3zM7 10h1M11 10h1M15 10h1M8 14h8' },
    { id: 'audio', header: 'AUDIO', icon: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6' },
    { id: 'hud', header: 'HUD / RADAR', preview: 'hud', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 12l5-3' },
    { id: 'perf', kind: 'perf', header: 'PERFORMANCE', icon: 'M13 2L4 14h7l-1 8 9-12h-7z' },
    { id: 'myths', kind: 'myths', icon: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' },
    { id: 'install', kind: 'install', icon: 'M12 3v12M6 10l6 6 6-6M4 21h16' },
  ];

  // Categories whose settings are written into the file (in this order).
  const FILE_SECTIONS = ['mouse', 'crosshair', 'viewmodel', 'binds', 'audio', 'hud', 'perf'];

  const NUM = (key, cat, group, def, min, max, step, extra) =>
    Object.assign({ key, cat, group, type: 'range', def, min, max, step, status: 'works' }, extra);
  const BOOL = (key, cat, group, def, extra) =>          // written as true/false
    Object.assign({ key, cat, group, type: 'bool', def, status: 'works' }, extra);
  const SW = (key, cat, group, def, extra) =>            // written as 1/0
    Object.assign({ key, cat, group, type: 'switch', def, status: 'works' }, extra);
  const SEL = (key, cat, group, def, options, extra) =>
    Object.assign({ key, cat, group, type: 'select', def, options, status: 'works' }, extra);

  const DYNAMIC_STYLES = [0, 1, 7];
  const isStyle = list => s => list.includes(Number(s.cl_crosshairstyle));

  const SETTINGS = [
    // ------------------------------------------------------------ Mouse
    NUM('sensitivity', 'mouse', 'mouse', 1.25, 0.05, 8, 0.01, { src: 'cs2' }),
    NUM('zoom_sensitivity_ratio', 'mouse', 'mouse', 1, 0.1, 3, 0.01, { src: 'cs2' }),

    // ------------------------------------------------------------ Crosshair (Rush Hour, Sept 2026)
    SEL('cl_crosshairstyle', 'crosshair', 'shape', 7, [0, 1, 2, 3, 4, 5, 6, 7, 8], { src: 'console', isNew: true }),
    NUM('cl_crosshair_length', 'crosshair', 'shape', 8, 0, 64, 1, { src: 'console', unit: 'px', uiRange: true, isNew: true,
      showIf: s => Number(s.cl_crosshairstyle) !== 6 }),
    NUM('cl_crosshair_thickness', 'crosshair', 'shape', 2, 1, 16, 1, { src: 'console', unit: 'px', uiRange: true, isNew: true }),
    NUM('cl_crosshair_gap', 'crosshair', 'shape', 4, 0, 32, 1, { src: 'console', unit: 'px', uiRange: true, isNew: true,
      showIf: s => Number(s.cl_crosshairstyle) !== 6 }),
    BOOL('cl_crosshair_t', 'crosshair', 'shape', false, { src: 'console', showIf: isStyle([0, 2, 4, 5]) }),
    BOOL('cl_crosshairdot', 'crosshair', 'shape', false, { src: 'console' }),

    { key: '_color', cat: 'crosshair', group: 'color', type: 'color', ui: true, status: 'works', src: 'console',
      cvarLabel: 'cl_crosshaircolor_r / _g / _b' },
    NUM('cl_crosshaircolor_r', 'crosshair', 'color', 0, 0, 255, 1, { src: 'console', hidden: true }),
    NUM('cl_crosshaircolor_g', 'crosshair', 'color', 255, 0, 255, 1, { src: 'console', hidden: true }),
    NUM('cl_crosshaircolor_b', 'crosshair', 'color', 0, 0, 255, 1, { src: 'console', hidden: true }),
    NUM('cl_crosshaircolor_a', 'crosshair', 'color', 255, 0, 255, 1, { src: 'console', isNew: true }),
    SEL('cl_crosshair_drawoutline', 'crosshair', 'color', 1, [0, 1, 2], { src: 'console', isNew: true }),

    BOOL('cl_crosshair_recoil', 'crosshair', 'dynamic', true, { src: 'console' }),
    NUM('cl_crosshair_dynamic_spread_limit', 'crosshair', 'dynamic', 255, 0, 512, 1,
      { src: 'console', unit: 'px', uiRange: true, adv: true, isNew: true, showIf: isStyle(DYNAMIC_STYLES) }),
    NUM('cl_crosshair_dynamic_splitdist', 'crosshair', 'dynamic', 3, 0, 64, 1,
      { src: 'console', unit: 'px', uiRange: true, adv: true, showIf: isStyle([2]) }),
    NUM('cl_crosshair_dynamic_maxdist_splitratio', 'crosshair', 'dynamic', 1, 0, 1, 0.05,
      { src: 'console', adv: true, showIf: isStyle([2]) }),
    NUM('cl_crosshair_dynamic_splitalpha_innermod', 'crosshair', 'dynamic', 0, 0, 1, 0.05,
      { src: 'console', adv: true, showIf: isStyle([2]) }),
    NUM('cl_crosshair_dynamic_splitalpha_outermod', 'crosshair', 'dynamic', 1, 0.3, 1, 0.05,
      { src: 'console', adv: true, showIf: isStyle([2]) }),

    BOOL('crosshair', 'crosshair', 'misc', true, { src: 'console', adv: true }),
    SW('cl_crosshair_friendly_warning', 'crosshair', 'misc', 1, { src: 'console', adv: true }),
    SEL('cl_show_observer_crosshair', 'crosshair', 'misc', 2, [0, 1, 2], { src: 'console', adv: true }),
    SEL('cl_observed_bot_crosshair', 'crosshair', 'misc', 2, [0, 1, 2], { src: 'console', adv: true }),

    NUM('cl_crosshair_sniper_width', 'crosshair', 'scopes', 1, 1, 8, 1, { src: 'console', unit: 'px', uiRange: true, adv: true }),
    BOOL('cl_ironsight_usecrosshaircolor', 'crosshair', 'scopes', false, { src: 'console', adv: true }),

    BOOL('cl_grenadecrosshair_explosive', 'crosshair', 'grenade', true, { src: 'console', adv: true }),
    BOOL('cl_grenadecrosshair_flash', 'crosshair', 'grenade', true, { src: 'console', adv: true }),
    BOOL('cl_grenadecrosshair_smoke', 'crosshair', 'grenade', true, { src: 'console', adv: true }),
    BOOL('cl_grenadecrosshair_fire', 'crosshair', 'grenade', true, { src: 'console', adv: true }),
    BOOL('cl_grenadecrosshair_decoy', 'crosshair', 'grenade', true, { src: 'console', adv: true }),
    BOOL('cl_grenadecrosshair_keepusercrosshair', 'crosshair', 'grenade', true, { src: 'console', adv: true }),
    NUM('cl_grenadecrosshairdelay_explosive', 'crosshair', 'grenade', 2, 0, 5, 0.1, { src: 'console', uiRange: true, adv: true }),
    NUM('cl_grenadecrosshairdelay_flash', 'crosshair', 'grenade', 2, 0, 5, 0.1, { src: 'console', uiRange: true, adv: true }),
    NUM('cl_grenadecrosshairdelay_smoke', 'crosshair', 'grenade', 2, 0, 5, 0.1, { src: 'console', uiRange: true, adv: true }),
    NUM('cl_grenadecrosshairdelay_fire', 'crosshair', 'grenade', 2, 0, 5, 0.1, { src: 'console', uiRange: true, adv: true }),
    NUM('cl_grenadecrosshairdelay_decoy', 'crosshair', 'grenade', 2, 0, 5, 0.1, { src: 'console', uiRange: true, adv: true }),

    // ------------------------------------------------------------ Viewmodel
    NUM('viewmodel_fov', 'viewmodel', 'viewmodel', 60, 54, 68, 1, { src: 'cs2' }),
    NUM('viewmodel_offset_x', 'viewmodel', 'viewmodel', 1, -2.5, 2.5, 0.1, { src: 'cs2' }),
    NUM('viewmodel_offset_y', 'viewmodel', 'viewmodel', 1, -2, 2, 0.1, { src: 'cs2' }),
    NUM('viewmodel_offset_z', 'viewmodel', 'viewmodel', -1, -2, 2, 0.1, { src: 'cs2' }),

    // ------------------------------------------------------------ Audio
    NUM('volume', 'audio', 'audio', 0.5, 0, 1, 0.01, { src: 'cs2' }),
    NUM('snd_menumusic_volume', 'audio', 'music', 0, 0, 1, 0.01, { src: 'cs2' }),
    NUM('snd_roundstart_volume', 'audio', 'music', 0, 0, 1, 0.01, { src: 'cs2', adv: true }),
    NUM('snd_roundend_volume', 'audio', 'music', 0, 0, 1, 0.01, { src: 'cs2', adv: true }),
    NUM('snd_mvp_volume', 'audio', 'music', 0.2, 0, 1, 0.01, { src: 'cs2', adv: true }),
    NUM('snd_tensecondwarning_volume', 'audio', 'music', 0.3, 0, 1, 0.01, { src: 'cs2', adv: true }),
    NUM('snd_deathcamera_volume', 'audio', 'music', 0, 0, 1, 0.01, { src: 'cs2', adv: true }),
    SW('snd_mute_losefocus', 'audio', 'audio', 1, { src: 'cs2' }),

    // ------------------------------------------------------------ HUD / radar
    NUM('hud_scaling', 'hud', 'hud', 0.85, 0.5, 0.95, 0.05, { src: 'cs2' }),
    SEL('cl_hud_color', 'hud', 'hud', 0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { src: 'cs2' }),
    NUM('cl_teamid_overhead_fade_near_crosshair', 'hud', 'hud', 0.5, 0, 1, 0.05, { src: 'console', adv: true }),
    NUM('cl_ping_fade_deadzone', 'hud', 'hud', 60, 0, 500, 5, { src: 'console', unit: 'px', uiRange: true, adv: true }),
    NUM('cl_ping_fade_distance', 'hud', 'hud', 300, 0, 1000, 10, { src: 'console', unit: 'px', uiRange: true, adv: true }),
    NUM('cl_hud_radar_scale', 'hud', 'radar', 1, 0.8, 1.3, 0.05, { src: 'cs2' }),
    NUM('cl_radar_scale', 'hud', 'radar', 0.7, 0.25, 1, 0.05, { src: 'cs2' }),
    SW('cl_radar_rotate', 'hud', 'radar', 1, { src: 'cs2' }),
    SW('cl_radar_always_centered', 'hud', 'radar', 1, { src: 'cs2' }),
    SW('cl_radar_square_with_scoreboard', 'hud', 'radar', 1, { src: 'cs2', adv: true }),

    // ------------------------------------------------------------ Performance
    NUM('fps_max', 'perf', 'fps', 0, 0, 1000, 1, { src: 'cs2', quick: [0, 144, 240, 300, 400] }),
  ];

  const SETTING_MAP = Object.fromEntries(SETTINGS.map(s => [s.key, s]));

  /* ------------------------------------------------------------------ Binds
   * One action per bind – CS2 blocks binds that perform several player
   * actions at once (jump-throw, snap-tap/null binds …).
   */
  const ACTION_CATEGORIES = ['weapons', 'buy', 'movement', 'comms', 'toggles', 'training', 'utility'];
  const ACTIONS = [
    { id: 'slot1', cat: 'weapons', cmd: 'slot1' },
    { id: 'slot2', cat: 'weapons', cmd: 'slot2' },
    { id: 'slot3', cat: 'weapons', cmd: 'slot3' },
    { id: 'slot4', cat: 'weapons', cmd: 'slot4' },
    { id: 'slot5', cat: 'weapons', cmd: 'slot5' },
    { id: 'slot6', cat: 'weapons', cmd: 'slot6' },
    { id: 'slot7', cat: 'weapons', cmd: 'slot7' },
    { id: 'slot8', cat: 'weapons', cmd: 'slot8' },
    { id: 'slot9', cat: 'weapons', cmd: 'slot9' },
    { id: 'slot10', cat: 'weapons', cmd: 'slot10' },
    { id: 'lastinv', cat: 'weapons', cmd: 'lastinv' },
    { id: 'drop', cat: 'weapons', cmd: 'drop' },
    { id: 'inspect', cat: 'weapons', cmd: '+lookatweapon' },
    { id: 'reload', cat: 'weapons', cmd: '+reload' },

    { id: 'buymenu', cat: 'buy', cmd: 'buymenu' },
    { id: 'buy_vesthelm', cat: 'buy', cmd: 'buy vesthelm' },
    { id: 'buy_vest', cat: 'buy', cmd: 'buy vest' },
    { id: 'buy_defuser', cat: 'buy', cmd: 'buy defuser' },
    { id: 'buy_smoke', cat: 'buy', cmd: 'buy smokegrenade' },
    { id: 'buy_flash', cat: 'buy', cmd: 'buy flashbang' },
    { id: 'buy_he', cat: 'buy', cmd: 'buy hegrenade' },
    { id: 'buy_molotov', cat: 'buy', cmd: 'buy molotov' },
    { id: 'buy_inc', cat: 'buy', cmd: 'buy incgrenade' },
    { id: 'buy_ak47', cat: 'buy', cmd: 'buy ak47' },
    { id: 'buy_awp', cat: 'buy', cmd: 'buy awp' },

    { id: 'jump', cat: 'movement', cmd: '+jump' },
    { id: 'duck', cat: 'movement', cmd: '+duck' },
    { id: 'walk', cat: 'movement', cmd: '+sprint' },

    { id: 'voice', cat: 'comms', cmd: '+voicerecord' },
    { id: 'ping', cat: 'comms', cmd: 'player_ping' },
    { id: 'chat_all', cat: 'comms', cmd: 'messagemode' },
    { id: 'chat_team', cat: 'comms', cmd: 'messagemode2' },
    { id: 'spray', cat: 'comms', cmd: '+spray_menu' },
    { id: 'scores', cat: 'comms', cmd: '+showscores' },

    { id: 'tgl_volume', cat: 'toggles', cmd: 'toggle volume 0.1 0.5' },
    { id: 'tgl_radar', cat: 'toggles', cmd: 'toggle cl_radar_scale 0.4 1' },
    { id: 'tgl_crosshair', cat: 'toggles', cmd: 'toggle crosshair' },
    { id: 'tgl_recoil', cat: 'toggles', cmd: 'toggle cl_crosshair_recoil' },

    { id: 'noclip', cat: 'training', cmd: 'noclip', status: 'cheat' },
    { id: 'god', cat: 'training', cmd: 'god', status: 'cheat' },
    { id: 'rethrow', cat: 'training', cmd: 'sv_rethrow_last_grenade', status: 'cheat' },
    { id: 'spread', cat: 'training', cmd: 'toggle weapon_debug_spread_show', status: 'cheat', src: 'console' },
    { id: 'bot_place', cat: 'training', cmd: 'bot_place', status: 'cheat' },
    { id: 'restart', cat: 'training', cmd: 'mp_restartgame 1', status: 'server' },
    { id: 'bot_kick', cat: 'training', cmd: 'bot_kick', status: 'server' },

    { id: 'cleardecals', cat: 'utility', cmd: 'r_cleardecals' },
    { id: 'console', cat: 'utility', cmd: 'toggleconsole' },
    { id: 'reload_cfg', cat: 'utility', cmd: 'exec autoexec' },
    { id: 'disconnect', cat: 'utility', cmd: 'disconnect' },
  ];

  // Keys that CS2 binds by default (value = label id in i18n "defbind.*").
  // An autoexec bind on one of these keys replaces the default action.
  const CS2_DEFAULT_BINDS = {
    w: 'move', a: 'move', s: 'move', d: 'move', space: 'jump', ctrl: 'duck', shift: 'walk',
    r: 'reload', e: 'use', g: 'drop', b: 'buymenu', q: 'lastinv', f: 'inspect', tab: 'scores',
    y: 'chat', u: 'chat', 1: 'weapon', 2: 'weapon', 3: 'weapon', 4: 'weapon', 5: 'weapon',
    mouse1: 'attack', mouse2: 'attack', mouse3: 'ping', mwheelup: 'weapon', mwheeldown: 'weapon',
    escape: 'menu', '`': 'console',
  };

  /* ------------------------------------------------------------------ Launch options (Steam) */
  const LAUNCH_OPTIONS = [
    { id: 'exec', type: 'check', def: true, arg: '+exec autoexec', status: 'works' },
    { id: 'console', type: 'check', def: false, arg: '-console', status: 'works' },
    { id: 'display', type: 'select', def: '', options: ['', '-fullscreen', '-windowed'], status: 'works' },
    { id: 'res', type: 'res', def: '', status: 'works' },
    { id: 'vulkan', type: 'check', def: false, arg: '-vulkan', status: 'works' },
    { id: 'high', type: 'check', def: false, arg: '-high', status: 'works' },
    { id: 'thirdparty', type: 'check', def: false, arg: '-allow_third_party_software', status: 'works', warn: true },
  ];

  /* ------------------------------------------------------------------ Myths
   * Never written to the file. Also used by the importer to explain why a
   * line from an old config was skipped.
   */
  const MYTHS = [
    { id: 'vprof_off', names: ['vprof_off'], verdict: 'placebo' },
    { id: 'iv_off', names: ['iv_off'], verdict: 'nonexistent' },
    { id: 'r_dynamic', names: ['r_dynamic'], verdict: 'removed' },
    { id: 'mat_queue_mode', names: ['mat_queue_mode'], verdict: 'removed' },
    { id: 'cl_forcepreload', names: ['cl_forcepreload'], verdict: 'removed' },
    { id: 'func_break_max_pieces', names: ['func_break_max_pieces'], verdict: 'removed' },
    { id: 'r_drawparticles', names: ['r_drawparticles'], verdict: 'removed' },
    { id: 'netcode', names: ['cl_interp', 'cl_interp_ratio', 'cl_updaterate', 'cl_cmdrate'], verdict: 'removed' },
    { id: 'rawinput', names: ['m_rawinput', 'm_customaccel', 'm_mouseaccel1', 'm_mouseaccel2'], verdict: 'removed' },
    { id: 'snd_mixahead', names: ['snd_mixahead'], verdict: 'removed' },
    { id: 'net_graph', names: ['net_graph'], verdict: 'removed' },
    { id: 'zoom_ratio_mouse', names: ['zoom_sensitivity_ratio_mouse'], verdict: 'renamed', replacement: 'zoom_sensitivity_ratio' },
    { id: 'old_crosshair', verdict: 'renamed',
      names: ['cl_crosshairsize', 'cl_crosshairthickness', 'cl_crosshairgap', 'cl_crosshairalpha', 'cl_crosshairusealpha',
        'cl_crosshaircolor', 'cl_crosshair_outlinethickness', 'cl_crosshairgap_useweaponvalue', 'cl_crosshairscale', 'cl_fixedcrosshairgap'] },
    { id: 'jumpthrow', names: ['+jumpthrow', '-jumpthrow'], verdict: 'blocked', kind: 'bind' },
    { id: 'snaptap', names: [], verdict: 'blocked', kind: 'bind' },
    { id: 'novid', names: ['-novid'], verdict: 'placebo', kind: 'launch' },
    { id: 'tickrate', names: ['-tickrate'], verdict: 'placebo', kind: 'launch' },
    { id: 'threads', names: ['-threads'], verdict: 'placebo', kind: 'launch' },
    { id: 'd3d9ex', names: ['-d3d9ex', '-nod3d9ex'], verdict: 'removed', kind: 'launch' },
    { id: 'csgo_launch', names: ['-limitvsconst', '-softparticlesdefaultoff', '-forcenovsync'], verdict: 'removed', kind: 'launch' },
  ];

  // Old (pre-Rush Hour) crosshair names -> new names. Values are NOT converted:
  // the old scale was not pixels, so a 1:1 copy would give a different crosshair.
  const LEGACY_CROSSHAIR = {
    cl_crosshairsize: 'cl_crosshair_length',
    cl_crosshairthickness: 'cl_crosshair_thickness',
    cl_crosshairgap: 'cl_crosshair_gap',
    cl_crosshairalpha: 'cl_crosshaircolor_a',
  };

  /* ------------------------------------------------------------------ Presets
   * Applied on top of the current settings (mouse sensitivity is kept).
   */
  const PRESETS = [
    {
      id: 'competitive',
      settings: {
        cl_crosshairstyle: 4, cl_crosshair_length: 6, cl_crosshair_thickness: 2, cl_crosshair_gap: 3,
        cl_crosshairdot: false, cl_crosshair_t: false, cl_crosshair_drawoutline: 1, cl_crosshair_recoil: false,
        cl_crosshaircolor_r: 0, cl_crosshaircolor_g: 255, cl_crosshaircolor_b: 255, cl_crosshaircolor_a: 255,
        viewmodel_fov: 68, viewmodel_offset_x: 2.5, viewmodel_offset_y: 0, viewmodel_offset_z: -1.5,
        snd_menumusic_volume: 0, snd_roundstart_volume: 0, snd_roundend_volume: 0, snd_mvp_volume: 0,
        snd_tensecondwarning_volume: 0.4, snd_deathcamera_volume: 0, snd_mute_losefocus: 1,
        hud_scaling: 0.85, cl_hud_radar_scale: 1.15, cl_radar_scale: 0.4, cl_radar_rotate: 1,
        cl_radar_always_centered: 0, cl_radar_square_with_scoreboard: 1,
      },
      binds: { x: 'r_cleardecals', mwheeldown: '+jump' },
    },
    {
      id: 'maxfps',
      settings: { fps_max: 0, snd_menumusic_volume: 0 },
      launch: { exec: true, high: false, vulkan: false },
    },
    {
      id: 'beginner',
      settings: {
        cl_crosshairstyle: 7, cl_crosshair_length: 8, cl_crosshair_thickness: 2, cl_crosshair_gap: 4,
        cl_crosshair_drawoutline: 1, cl_crosshair_recoil: true, cl_crosshairdot: false,
        cl_crosshaircolor_r: 0, cl_crosshaircolor_g: 255, cl_crosshaircolor_b: 0, cl_crosshaircolor_a: 255,
        viewmodel_fov: 60, viewmodel_offset_x: 1, viewmodel_offset_y: 1, viewmodel_offset_z: -1,
        cl_radar_scale: 0.5, cl_radar_always_centered: 0, cl_hud_radar_scale: 1.1,
        snd_tensecondwarning_volume: 0.5,
      },
      binds: { x: 'r_cleardecals', n: 'noclip', kp_enter: 'sv_rethrow_last_grenade' },
    },
  ];

  const HUD_COLORS = ['#e6e9ec', '#ffffff', '#8fd3ff', '#3b82f6', '#a36bff', '#ff4d4d', '#ff9a3c', '#ffe14d', '#57e36b', '#45e0d0', '#ff7ac8'];

  return {
    CATEGORIES, FILE_SECTIONS, SETTINGS, SETTING_MAP, ACTION_CATEGORIES, ACTIONS, CS2_DEFAULT_BINDS,
    LAUNCH_OPTIONS, MYTHS, LEGACY_CROSSHAIR, PRESETS, HUD_COLORS, DYNAMIC_STYLES,
    SHARE_BASE_URL: 'https://ofc0urse.github.io/cs2autoexec_creator/',
  };
});
