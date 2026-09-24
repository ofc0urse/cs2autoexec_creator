/*
 * CS2 Autoexec Creator – user interface. Shared by the web page and the
 * Electron app (the desktop app additionally exposes window.cs2desktop).
 */
(function () {
  'use strict';

  const D = window.CS2Data, C = window.CS2Core, I = window.CS2I18n, P = window.CS2Previews;

  /* ================================================================ storage */

  const KEY_STATE = 'cs2ae:state', KEY_PREFS = 'cs2ae:prefs', KEY_PRESETS = 'cs2ae:presets', KEY_V1 = 'cs2-autoexec-creator:v1';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } },
  };

  // Settings from version 1.0 (only names that still exist are kept).
  function migrateV1(old) {
    const settings = {};
    for (const k of Object.keys(old)) if (D.SETTING_MAP[k] && D.SETTING_MAP[k].cat !== 'crosshair') settings[k] = old[k];
    const binds = {};
    const v1binds = { bind_cleardecals: 'r_cleardecals', bind_noclip: 'noclip', bind_rethrow: 'sv_rethrow_last_grenade', bind_jumpwheel: '+jump' };
    for (const [id, cmd] of Object.entries(v1binds)) if (old[id] && old[id].on && old[id].key) binds[old[id].key] = cmd;
    return { settings, binds, dpi: old._dpi };
  }

  let state = (() => {
    const saved = store.get(KEY_STATE);
    if (saved) return C.sanitizeState(saved);
    const v1 = store.get(KEY_V1);
    return v1 ? C.sanitizeState(migrateV1(v1)) : C.defaultState();
  })();
  const prefs = Object.assign({ lang: 'en', mode: 'simple', cat: 'start' }, store.get(KEY_PREFS) || {});
  if (!I.languages.includes(prefs.lang)) prefs.lang = 'en';
  if (!D.CATEGORIES.some(c => c.id === prefs.cat)) prefs.cat = 'start';
  let customPresets = Array.isArray(store.get(KEY_PRESETS)) ? store.get(KEY_PRESETS) : [];

  let saveTimer = 0;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(KEY_STATE, state), 150);
  }
  const savePrefs = () => store.set(KEY_PREFS, prefs);

  /* ================================================================ helpers */

  function t(key, vars) {
    let s = (I[prefs.lang] && I[prefs.lang][key]) ?? I.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }
  const $ = (sel, root = document) => root.querySelector(sel);
  function el(tag, attrs, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c);
    return n;
  }
  const svgIcon = (d, size = 18) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p);
    return s;
  };

  let toastTimer = 0;
  function toast(msg) {
    const n = $('#toast');
    n.textContent = msg;
    n.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => n.classList.remove('show'), 2800);
  }

  async function copyText(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg || t('toast.copied')); return true; } catch (_) { return false; }
  }

  function badge(kind, text, title) {
    return el('span', { class: 'badge badge-' + kind, title: title || null }, text);
  }
  function statusBadge(status) {
    return badge(status, t('status.' + status));
  }

  /* ================================================================ state changes */

  let refs = [];            // sync functions for controls currently on screen
  let dimRows = [];         // [row, def] for showIf
  function registerSync(fn) { refs.push(fn); fn(); }
  function syncControls() { refs.forEach(fn => fn()); }

  function setSetting(key, value) {
    state.settings[key] = C.clampSetting(D.SETTING_MAP[key], value);
    update();
  }

  function replaceState(next) {
    state = C.sanitizeState(next);
    renderMain();
    update();
  }

  /* ================================================================ header / nav */

  function renderChrome() {
    document.documentElement.lang = prefs.lang;
    document.title = t('app.title');
    $('#tagline').textContent = t('app.tagline');
    const search = $('#search');
    search.placeholder = t('search.placeholder');
    search.setAttribute('aria-label', t('search.placeholder'));

    const modeBox = $('#modeSwitch');
    modeBox.replaceChildren();
    modeBox.setAttribute('aria-label', t('mode.label'));
    for (const m of ['simple', 'advanced']) {
      modeBox.append(el('button', {
        type: 'button', class: prefs.mode === m ? 'active' : '', 'aria-pressed': String(prefs.mode === m),
        onclick: () => { prefs.mode = m; savePrefs(); renderChrome(); renderMain(); },
      }, t('mode.' + m)));
    }
    const langBox = $('#langSwitch');
    langBox.replaceChildren();
    langBox.setAttribute('aria-label', t('lang.label'));
    for (const l of I.languages) {
      langBox.append(el('button', {
        type: 'button', class: prefs.lang === l ? 'active' : '', 'aria-pressed': String(prefs.lang === l), lang: l,
        onclick: () => { prefs.lang = l; savePrefs(); renderAll(); },
      }, l.toUpperCase()));
    }

    const nav = $('#sidebar');
    nav.replaceChildren();
    nav.setAttribute('aria-label', t('menu.label'));
    for (const cat of D.CATEGORIES) {
      const off = D.FILE_SECTIONS.includes(cat.id) && !state.sections[cat.id];
      nav.append(el('button', {
        type: 'button', class: 'nav-item' + (prefs.cat === cat.id && !searchQuery ? ' active' : '') + (off ? ' off' : ''),
        'aria-current': prefs.cat === cat.id && !searchQuery ? 'page' : null,
        onclick: () => { openCategory(cat.id); },
      }, svgIcon(cat.icon), el('span', {}, t('cat.' + cat.id))));
    }

    $('#previewOpenLabel').textContent = t('preview.open');
    $('#previewClose').textContent = t('preview.close');
    $('#previewTitle').textContent = t('preview.title');
    $('#downloadLabel').textContent = t('preview.download');
    $('#saveLabel').textContent = t('preview.save');
    $('#copyBtn').textContent = t('preview.copy');
    $('#shareBtn').textContent = t('preview.share');
    $('#chooseFolderBtn').textContent = t('preview.chooseFolder');
    $('#openFolderBtn').textContent = t('preview.openFolder');
    $('#footerText').textContent = t('footer');
    $('#envLabel').textContent = window.cs2desktop ? t('footer.desktop') : t('footer.web');
  }

  function openCategory(id) {
    prefs.cat = id;
    savePrefs();
    if (searchQuery) { searchQuery = ''; $('#search').value = ''; }
    document.body.classList.remove('show-preview');
    renderChrome();
    renderMain();
    $('#main').focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }

  /* ================================================================ controls */

  function renderSwitch(get, set, labels) {
    const input = el('input', { type: 'checkbox' });
    const txt = el('span', { class: 'state' });
    const sync = () => { input.checked = !!get(); txt.textContent = labels ? labels(input.checked) : ''; };
    input.addEventListener('change', () => { set(input.checked); sync(); });
    const wrap = el('label', { class: 'switch' }, input, el('span', { class: 'track' }), txt);
    registerSync(sync);
    return wrap;
  }

  function renderControl(def) {
    const key = def.key;
    if (def.type === 'range') {
      const range = el('input', { type: 'range', min: def.min, max: def.max, step: def.step, 'aria-label': t(`set.${key}.l`) });
      const num = el('input', { type: 'number', min: def.min, max: def.max, step: def.step, inputmode: 'decimal', 'aria-label': t(`set.${key}.l`) });
      range.addEventListener('input', () => { num.value = range.value; setSetting(key, range.value); });
      num.addEventListener('input', () => {
        if (num.value === '' || !Number.isFinite(+num.value)) return;
        const v = C.clampSetting(def, num.value);
        range.value = v;
        setSetting(key, v);
      });
      num.addEventListener('change', () => { num.value = state.settings[key]; });
      registerSync(() => { range.value = state.settings[key]; if (document.activeElement !== num) num.value = state.settings[key]; });
      const ctrl = el('div', { class: 'ctrl' }, range, num, def.unit ? el('span', { class: 'unit' }, def.unit) : null);
      if (!def.quick) return ctrl;
      const chips = el('div', { class: 'chips' }, def.quick.map(v => el('button', {
        type: 'button', class: 'chip', onclick: () => { setSetting(key, v); syncControls(); },
      }, v === 0 ? t('fps.unlimited') : String(v))));
      return el('div', { class: 'ctrl-stack' }, ctrl, chips);
    }
    if (def.type === 'select') {
      const sel = el('select', { 'aria-label': t(`set.${key}.l`) },
        def.options.map(v => el('option', { value: v }, t(`opt.${key}.${v}`))));
      sel.addEventListener('change', () => setSetting(key, sel.value));
      registerSync(() => { sel.value = state.settings[key]; });
      return el('div', { class: 'ctrl' }, sel);
    }
    if (def.type === 'bool' || def.type === 'switch') {
      const sw = renderSwitch(() => state.settings[key], v => setSetting(key, v),
        v => `${v ? t('on') : t('off')} (${def.type === 'bool' ? (v ? 'true' : 'false') : (v ? '1' : '0')})`);
      return el('div', { class: 'ctrl' }, sw);
    }
    if (def.type === 'color') {
      const PRESETS = ['#ff0000', '#00ff00', '#ffff00', '#0000ff', '#00ffff', '#ff00ff', '#ffffff', '#000000'];
      const input = el('input', { type: 'color', 'aria-label': t('set._color.l') });
      const nums = ['r', 'g', 'b'].map(ch => {
        const k = 'cl_crosshaircolor_' + ch;
        const n = el('input', { type: 'number', min: 0, max: 255, step: 1, class: 'rgb', 'aria-label': ch.toUpperCase() });
        n.addEventListener('input', () => { if (n.value !== '') setSetting(k, n.value); input.value = currentHex(); });
        n.addEventListener('change', () => { n.value = state.settings[k]; });
        registerSync(() => { if (document.activeElement !== n) n.value = state.settings[k]; });
        return el('label', { class: 'rgb-field' }, el('span', {}, ch.toUpperCase()), n);
      });
      const currentHex = () => C.rgbToHex(state.settings.cl_crosshaircolor_r, state.settings.cl_crosshaircolor_g, state.settings.cl_crosshaircolor_b);
      const applyHex = hex => {
        const [r, g, b] = C.hexToRgb(hex);
        state.settings.cl_crosshaircolor_r = r; state.settings.cl_crosshaircolor_g = g; state.settings.cl_crosshaircolor_b = b;
        syncControls(); update();
      };
      input.addEventListener('input', () => applyHex(input.value));
      registerSync(() => { input.value = currentHex(); });
      const chips = el('div', { class: 'chips' }, PRESETS.map(c => el('button', {
        type: 'button', class: 'swatch', style: `--c:${c}`, title: c, 'aria-label': c, onclick: () => applyHex(c),
      })));
      return el('div', { class: 'ctrl-stack' }, el('div', { class: 'ctrl' }, input, nums), chips);
    }
    return el('span');
  }

  function renderRow(def) {
    const badges = el('span', { class: 'badges' },
      statusBadge(def.status),
      def.isNew ? badge('new', t('tag.new')) : null,
      def.src === 'console' ? badge('console', '✓ console', t('tag.console')) : null,
      def.adv ? badge('adv', t('tag.adv')) : null);
    const cvar = def.cvarLabel || def.key;
    const row = el('div', { class: 'row', 'data-key': def.key },
      el('div', { class: 'row-head' },
        el('div', { class: 'row-label' }, t(`set.${def.key}.l`), badges),
        el('code', { class: 'cvar' }, cvar, def.uiRange ? el('span', { class: 'hint', title: t('tag.uiRange'), 'aria-label': t('tag.uiRange') }, ' ⓘ') : null)),
      renderControl(def),
      el('p', { class: 'row-desc' }, t(`set.${def.key}.d`)));
    if (def.showIf) dimRows.push([row, def]);
    return row;
  }

  const visibleInMode = def => !def.hidden && (prefs.mode === 'advanced' || !def.adv);

  function renderGroups(cat) {
    const out = [];
    const groups = [];
    for (const def of D.SETTINGS) if (def.cat === cat && !groups.includes(def.group)) groups.push(def.group);
    for (const g of groups) {
      const defs = D.SETTINGS.filter(d => d.cat === cat && d.group === g && visibleInMode(d));
      if (!defs.length) continue;
      out.push(el('section', { class: 'group' }, el('h3', {}, t('grp.' + g)), defs.map(renderRow)));
    }
    return out;
  }

  /* ================================================================ main panels */

  let searchQuery = '';

  function panelHeader(cat) {
    const head = el('div', { class: 'panel-head' }, el('h2', {}, t('cat.' + cat)));
    if (D.FILE_SECTIONS.includes(cat)) {
      const sw = renderSwitch(() => state.sections[cat], v => { state.sections[cat] = v; update(); renderChrome(); },
        v => (v ? t('section.include') : t('section.excluded')));
      sw.title = t('section.includeTitle');
      sw.classList.add('sec-switch');
      head.append(sw);
    }
    return head;
  }

  function renderMain() {
    refs = []; dimRows = [];
    const main = $('#main');
    main.replaceChildren();
    if (searchQuery) { main.append(renderSearch(searchQuery)); update(); return; }
    const cat = D.CATEGORIES.find(c => c.id === prefs.cat);
    const panel = el('div', { class: 'panel' + (D.FILE_SECTIONS.includes(cat.id) && !state.sections[cat.id] ? ' section-off' : '') });
    panel.append(panelHeader(cat.id));
    if (I.en[`cat.${cat.id}.intro`]) panel.append(el('p', { class: 'intro' }, t(`cat.${cat.id}.intro`)));
    if (prefs.mode === 'advanced' && D.FILE_SECTIONS.includes(cat.id) && cat.id !== 'binds') {
      panel.append(el('p', { class: 'hint-line' }, t('mode.advHint')));
    }

    if (cat.kind === 'start') panel.append(renderStart());
    else if (cat.kind === 'binds') panel.append(renderBinds());
    else if (cat.kind === 'perf') panel.append(...renderGroups('perf'), renderLaunch());
    else if (cat.kind === 'myths') panel.append(renderMyths());
    else if (cat.kind === 'install') panel.append(renderInstall());
    else if (cat.preview === 'crosshair') panel.append(el('div', { class: 'with-preview' }, renderCrosshairPreview(), el('div', {}, renderGroups(cat.id))));
    else if (cat.preview === 'hud') panel.append(el('div', { class: 'with-preview wide' }, renderHudPreview(), el('div', {}, renderGroups(cat.id))));
    else {
      if (cat.id === 'mouse') panel.append(renderEdpi());
      panel.append(...renderGroups(cat.id));
    }
    main.append(panel);
    update();
  }

  /* ---------------------------------------------------------------- search */

  function norm(s) { return C.stripDiacritics(String(s)).toLowerCase(); }

  function renderSearch(q) {
    const nq = norm(q.trim());
    const matches = txt => norm(txt).includes(nq);
    const wrap = el('div', { class: 'panel' });
    const settings = D.SETTINGS.filter(d => !d.hidden && (matches(d.key) || matches(d.cvarLabel || '') ||
      matches(t(`set.${d.key}.l`)) || matches(t(`set.${d.key}.d`))));
    const actions = D.ACTIONS.filter(a => matches(a.cmd) || matches(t('act.' + a.id)));
    const myths = D.MYTHS.filter(m => m.names.some(matches) || matches(t(`myth.${m.id}.d`)));
    const launch = D.LAUNCH_OPTIONS.filter(o => matches(o.arg || '') || matches(t(`launch.${o.id}.l`)));
    const total = settings.length + actions.length + myths.length + launch.length;
    wrap.append(el('div', { class: 'panel-head' }, el('h2', {}, t('search.results', { n: total })),
      el('button', { type: 'button', class: 'btn small', onclick: () => { searchQuery = ''; $('#search').value = ''; renderChrome(); renderMain(); } }, t('search.clear'))));
    if (!total) wrap.append(el('p', { class: 'intro' }, t('search.none', { q })));
    const byCat = {};
    for (const d of settings) (byCat[d.cat] = byCat[d.cat] || []).push(d);
    for (const [cat, defs] of Object.entries(byCat)) {
      wrap.append(el('section', { class: 'group' },
        el('h3', {}, el('button', { type: 'button', class: 'link', onclick: () => openCategory(cat) }, t('cat.' + cat) + ' →')),
        defs.map(renderRow)));
    }
    if (actions.length) {
      wrap.append(el('section', { class: 'group' },
        el('h3', {}, el('button', { type: 'button', class: 'link', onclick: () => openCategory('binds') }, t('cat.binds') + ' →')),
        el('div', { class: 'mini-list' }, actions.map(a => el('div', { class: 'mini-item' },
          el('span', {}, t('act.' + a.id)), el('code', {}, a.cmd), statusBadge(a.status || 'works'))))));
    }
    if (launch.length) {
      wrap.append(el('section', { class: 'group' },
        el('h3', {}, el('button', { type: 'button', class: 'link', onclick: () => openCategory('perf') }, t('perf.launchTitle') + ' →')),
        el('div', { class: 'mini-list' }, launch.map(o => el('div', { class: 'mini-item' },
          el('span', {}, t(`launch.${o.id}.l`)), o.arg ? el('code', {}, o.arg) : null)))));
    }
    if (myths.length) {
      wrap.append(el('section', { class: 'group' },
        el('h3', {}, el('button', { type: 'button', class: 'link', onclick: () => openCategory('myths') }, t('cat.myths') + ' →')),
        myths.map(renderMyth)));
    }
    return wrap;
  }

  /* ---------------------------------------------------------------- start */

  function renderStart() {
    const box = el('div', { class: 'start' });

    // presets
    box.append(el('section', { class: 'group' },
      el('h3', {}, t('start.presets')),
      el('p', { class: 'muted' }, t('start.presetsIntro')),
      el('div', { class: 'preset-grid' }, D.PRESETS.map(p => el('article', { class: 'preset' },
        el('h4', {}, t(`preset.${p.id}.name`)),
        el('p', {}, t(`preset.${p.id}.desc`)),
        el('button', { type: 'button', class: 'btn primary small', onclick: () => {
          replaceState(C.applyPreset(state, p));
          toast(t('toast.presetApplied', { name: t(`preset.${p.id}.name`) }));
        } }, t('preset.apply')))))));

    // custom presets
    const nameInput = el('input', { type: 'text', maxlength: 40, placeholder: t('custom.placeholder'), 'aria-label': t('custom.placeholder') });
    const list = el('div', { class: 'mini-list' });
    const renderCustom = () => {
      list.replaceChildren();
      if (!customPresets.length) list.append(el('p', { class: 'muted' }, t('custom.empty')));
      customPresets.forEach((p, i) => list.append(el('div', { class: 'mini-item' },
        el('span', { class: 'grow' }, p.name),
        el('button', { type: 'button', class: 'btn small', onclick: () => {
          replaceState(p.state); toast(t('toast.presetApplied', { name: p.name }));
        } }, t('custom.load')),
        el('button', { type: 'button', class: 'btn small ghost', onclick: () => {
          if (!confirm(t('confirm.deletePreset', { name: p.name }))) return;
          customPresets.splice(i, 1); store.set(KEY_PRESETS, customPresets); renderCustom();
        } }, t('custom.delete')))));
    };
    renderCustom();
    const saveCustom = () => {
      const name = nameInput.value.trim().slice(0, 40);
      if (!name) { nameInput.focus(); return; }
      const idx = customPresets.findIndex(p => p.name === name);
      const entry = { name, state: JSON.parse(JSON.stringify(state)) };
      if (idx >= 0) customPresets[idx] = entry; else customPresets.push(entry);
      store.set(KEY_PRESETS, customPresets);
      nameInput.value = '';
      renderCustom();
      toast(t('toast.presetSaved', { name }));
    };
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveCustom(); });
    box.append(el('section', { class: 'group' },
      el('h3', {}, t('start.custom')),
      el('p', { class: 'muted' }, t('start.customIntro')),
      el('div', { class: 'inline-form' }, nameInput, el('button', { type: 'button', class: 'btn', onclick: saveCustom }, t('custom.save'))),
      list));

    // import
    const ta = el('textarea', { rows: 6, spellcheck: 'false', placeholder: t('import.placeholder'), 'aria-label': t('start.import') });
    const file = el('input', { type: 'file', accept: '.cfg,.txt,text/plain', class: 'visually-hidden', id: 'importFile' });
    const replace = el('input', { type: 'checkbox', id: 'importReplace' });
    const reportBox = el('div', { class: 'import-report', 'aria-live': 'polite' });
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f || f.size > 512 * 1024) return;
      const r = new FileReader();
      r.onload = () => { ta.value = String(r.result); };
      r.readAsText(f);
    });
    const runImport = () => {
      const parsed = C.parseCfg(ta.value);
      reportBox.replaceChildren(renderImportReport(parsed.report));
      const n = Object.keys(parsed.settings).length, b = Object.keys(parsed.binds).length;
      if (!n && !b) return;
      state = C.mergeImport(state, parsed, replace.checked);
      update();
      renderChrome();
      toast(t('toast.imported', { n, b }));
    };
    box.append(el('section', { class: 'group' },
      el('h3', {}, t('start.import')),
      el('p', { class: 'muted' }, t('start.importIntro')),
      ta,
      el('div', { class: 'inline-form wrap' },
        file, el('label', { for: 'importFile', class: 'btn' }, t('import.file')),
        el('label', { class: 'check' }, replace, t('import.replaceBinds')),
        el('button', { type: 'button', class: 'btn primary', onclick: runImport }, t('import.run'))),
      reportBox));

    // share
    box.append(el('section', { class: 'group' },
      el('h3', {}, t('start.share')),
      el('p', { class: 'muted' }, t('start.shareIntro')),
      el('button', { type: 'button', class: 'btn', onclick: shareLink }, t('share.copy'))));

    // crosshair codes
    box.append(el('section', { class: 'group' },
      el('h3', {}, t('start.code')),
      el('p', { class: 'note info', html: t('start.codeIntro_html') })));

    box.append(el('section', { class: 'group' },
      el('button', { type: 'button', class: 'btn ghost', onclick: () => {
        if (!confirm(t('confirm.reset'))) return;
        replaceState(C.defaultState()); toast(t('toast.reset'));
      } }, t('start.reset'))));
    return box;
  }

  function renderImportReport(r) {
    const box = el('div');
    const list = (title, items, fmt, cls) => {
      if (!items.length) return;
      box.append(el('details', { class: 'report ' + (cls || ''), open: cls === 'warn' || null },
        el('summary', {}, `${title} (${items.length})`),
        el('ul', {}, items.map(i => el('li', {}, el('span', { class: 'muted' }, t('imp.line', { n: i.line }) + ' · '), fmt(i))))));
    };
    box.append(el('p', {}, t('imp.applied', { n: r.applied.length }) + ' · ' + t('imp.binds', { n: r.binds.length })));
    if (!r.applied.length && !r.binds.length) box.append(el('p', { class: 'muted' }, t('imp.nothing')));
    list(t('imp.warnings'), r.warnings, i => (i.skipped ? t('imp.skippedBind', { key: i.key }) + ' ' : '') + t('warn.' + i.code, { key: i.key || '' }), 'warn');
    list(t('imp.legacy'), r.legacy, i => el('span', {}, el('code', {}, i.name), i.replacement ? ' → ' + t('imp.legacyTo', { name: i.replacement }) : ''), 'warn');
    list(t('imp.myths'), r.myths, i => el('span', {}, el('code', {}, i.name), ' – ', t(`myth.${i.myth}.d`)));
    list(t('imp.unknown'), r.unknown, i => el('code', {}, i.text));
    list(t('imp.ignored'), r.ignored, i => el('code', {}, i.text));
    return box;
  }

  function shareUrl() {
    const base = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : D.SHARE_BASE_URL;
    return base + '#cfg=' + C.encodeShare(state);
  }
  async function shareLink() {
    const url = shareUrl();
    if (!(await copyText(url, t('toast.shareCopied')))) prompt(t('preview.share'), url);
  }

  /* ---------------------------------------------------------------- mouse */

  function renderEdpi() {
    const dpi = el('input', { type: 'number', min: 100, max: 64000, step: 50, inputmode: 'numeric', 'aria-label': t('mouse.dpi') });
    const out = el('span', { class: 'edpi' });
    const calc = () => {
      const d = +state.dpi || 0, sens = state.settings.sensitivity;
      out.replaceChildren('eDPI ', el('b', {}, String(Math.round(d * sens))), ' · cm/360° ',
        el('b', {}, d ? (2.54 * 360 / (d * sens * 0.022)).toFixed(1) : '–'));
    };
    dpi.addEventListener('input', () => { state.dpi = Math.max(0, Math.round(+dpi.value || 0)); calc(); persist(); });
    registerSync(() => { if (document.activeElement !== dpi) dpi.value = state.dpi; calc(); });
    return el('section', { class: 'group' }, el('div', { class: 'row' },
      el('div', { class: 'row-head' }, el('div', { class: 'row-label' }, t('mouse.dpi')), el('code', { class: 'cvar' }, t('mouse.dpiNote'))),
      el('div', { class: 'ctrl' }, dpi, out),
      el('p', { class: 'row-desc' }, t('mouse.dpiDesc'))));
  }

  /* ---------------------------------------------------------------- crosshair preview */

  const xp = { bg: 'dust', zoom: 4, sim: 'idle' };
  let xpCanvas = null;

  function segmented(values, get, set, label) {
    const box = el('div', { class: 'seg', role: 'group', 'aria-label': label || null });
    const render = () => {
      box.replaceChildren(...values.map(([v, text]) => el('button', {
        type: 'button', class: get() === v ? 'active' : '', 'aria-pressed': String(get() === v),
        onclick: () => { set(v); render(); },
      }, text)));
    };
    render();
    return box;
  }

  function renderCrosshairPreview() {
    xpCanvas = el('canvas', { class: 'xp-canvas', role: 'img', 'aria-label': t('cat.crosshair') });
    const redraw = () => drawPreviews();
    const quadNote = el('p', { class: 'muted small' }, t('xp.quadNote'));
    registerSync(() => { quadNote.hidden = ![7, 8].includes(Number(state.settings.cl_crosshairstyle)); });
    return el('div', { class: 'preview-box' },
      el('div', { class: 'canvas-wrap' }, xpCanvas),
      el('div', { class: 'ctrl-label' }, t('xp.sim')),
      segmented(P.SIMS.map(s => [s, t('xp.sim.' + s)]), () => xp.sim, v => { xp.sim = v; redraw(); }, t('xp.sim')),
      segmented(P.BACKGROUNDS.map(b => [b, t('xp.bg.' + b)]), () => xp.bg, v => { xp.bg = v; redraw(); }),
      segmented([1, 2, 4, 6].map(z => [z, z + '×']), () => xp.zoom, v => { xp.zoom = v; redraw(); }, t('xp.zoom')),
      el('p', { class: 'muted small' }, t('xp.note')),
      quadNote);
  }

  /* ---------------------------------------------------------------- HUD preview */

  const hp = { tab: false, pos: 'center', yaw: 30 };
  let hpCanvas = null;

  function renderHudPreview() {
    hpCanvas = el('canvas', { class: 'hp-canvas', role: 'img', 'aria-label': t('cat.hud') });
    const yaw = el('input', { type: 'range', min: 0, max: 359, step: 1, value: hp.yaw, 'aria-label': t('hp.yaw') });
    yaw.addEventListener('input', () => { hp.yaw = +yaw.value; drawPreviews(); });
    const tab = el('input', { type: 'checkbox' });
    tab.checked = hp.tab;
    tab.addEventListener('change', () => { hp.tab = tab.checked; drawPreviews(); });
    return el('div', { class: 'preview-box' },
      el('div', { class: 'canvas-wrap' }, hpCanvas),
      el('div', { class: 'ctrl-label' }, t('hp.pos')),
      segmented([['center', t('hp.pos.center')], ['edge', t('hp.pos.edge')]], () => hp.pos, v => { hp.pos = v; drawPreviews(); }, t('hp.pos')),
      el('label', { class: 'ctrl-label' }, t('hp.yaw'), yaw),
      el('label', { class: 'check' }, tab, t('hp.tab')),
      el('p', { class: 'muted small' }, t('hp.note')));
  }

  function drawPreviews() {
    if (xpCanvas && xpCanvas.isConnected) P.drawCrosshair(xpCanvas, state.settings, xp);
    if (hpCanvas && hpCanvas.isConnected) P.drawHud(hpCanvas, state.settings, hp);
  }

  /* ---------------------------------------------------------------- binds */

  const KB_ROWS = [
    [['escape', 'Esc', 1.2], null, ['f1', 'F1'], ['f2', 'F2'], ['f3', 'F3'], ['f4', 'F4'], null, ['f5', 'F5'], ['f6', 'F6'], ['f7', 'F7'], ['f8', 'F8'], null, ['f9', 'F9'], ['f10', 'F10'], ['f11', 'F11'], ['f12', 'F12']],
    [['`', '`'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['0', '0'], ['-', '-'], ['=', '='], ['backspace', '⌫', 2]],
    [['tab', 'Tab', 1.5], ...'qwertyuiop'.split('').map(k => [k, k.toUpperCase()]), ['[', '['], [']', ']'], ['\\', '\\', 1.5]],
    [['capslock', 'Caps', 1.8], ...'asdfghjkl'.split('').map(k => [k, k.toUpperCase()]), ['semicolon', ';'], ["'", "'"], ['enter', 'Enter', 2.2]],
    [['shift', 'Shift', 2.3], ...'zxcvbnm'.split('').map(k => [k, k.toUpperCase()]), [',', ','], ['.', '.'], ['/', '/'], ['rshift', 'Shift', 2.7]],
    [['ctrl', 'Ctrl', 1.5], null, ['alt', 'Alt', 1.5], ['space', 'Space', 6.6], ['ralt', 'Alt', 1.5], null, ['rctrl', 'Ctrl', 1.5]],
  ];
  const NAV_ROWS = [
    [['ins', 'Ins'], ['home', 'Home'], ['pgup', 'PgUp']],
    [['del', 'Del'], ['end', 'End'], ['pgdn', 'PgDn']],
    [null, null, null],
    [null, ['uparrow', '↑'], null],
    [['leftarrow', '←'], ['downarrow', '↓'], ['rightarrow', '→']],
  ];
  const NUM_ROWS = [
    [['kp_slash', '/'], ['kp_multiply', '*'], ['kp_minus', '-']],
    [['kp_home', '7'], ['kp_uparrow', '8'], ['kp_pgup', '9']],
    [['kp_leftarrow', '4'], ['kp_5', '5'], ['kp_rightarrow', '6']],
    [['kp_end', '1'], ['kp_downarrow', '2'], ['kp_pgdn', '3']],
    [['kp_ins', '0', 2], ['kp_del', '.']],
    [['kp_plus', '+'], ['kp_enter', 'Enter', 2]],
  ];
  const MOUSE_KEYS = [['mouse1', 'M1'], ['mouse2', 'M2'], ['mouse3', 'M3'], ['mouse4', 'M4'], ['mouse5', 'M5'], ['mwheelup', '▲ Wheel'], ['mwheeldown', '▼ Wheel']];

  function bindLabel(cmd) {
    const a = C.actionForCommand(cmd);
    return a ? t('act.' + a.id) : cmd;
  }

  function keyButton([key, label, w]) {
    const bound = state.binds[key];
    const def = D.CS2_DEFAULT_BINDS[key];
    const warn = bound && C.bindWarnings(bound).includes('multi_action');
    const title = [key, bound ? '→ ' + bindLabel(bound) : '', def ? '(' + t('picker.defaultBind', { what: t('defbind.' + def) }) + ')' : ''].filter(Boolean).join(' ');
    return el('button', {
      type: 'button', class: 'key' + (bound ? ' bound' : '') + (def ? ' default' : '') + (warn ? ' warn' : ''),
      style: w ? `--w:${w}` : null, title, 'aria-label': title,
      onclick: () => openPicker(key),
    }, el('span', { class: 'key-cap' }, label), bound ? el('span', { class: 'key-act' }, bindLabel(bound)) : null);
  }

  function keyRows(rows, cls) {
    return el('div', { class: 'kb-block ' + (cls || '') }, rows.map(r => el('div', { class: 'kb-row' },
      r.map(k => (k ? keyButton(k) : el('span', { class: 'key-gap' }))))));
  }

  function renderBinds() {
    const box = el('div', { class: 'binds' });
    box.append(el('p', { class: 'note', html: t('binds.note_html') }));

    const capBtn = el('button', { type: 'button', class: 'btn' }, t('binds.capture'));
    capBtn.addEventListener('click', () => captureKey(capBtn, k => openPicker(k)));
    box.append(el('div', { class: 'inline-form wrap' }, capBtn,
      el('span', { class: 'legend' },
        el('span', { class: 'lg bound' }), t('binds.legend.bound'),
        el('span', { class: 'lg default' }), t('binds.legend.default'),
        el('span', { class: 'lg' }), t('binds.legend.free'))));

    box.append(el('h3', { class: 'sub' }, t('binds.keyboard')));
    box.append(el('div', { class: 'kb-scroll' }, el('div', { class: 'kb' },
      keyRows(KB_ROWS, 'main'), keyRows(NAV_ROWS, 'nav'), keyRows(NUM_ROWS, 'num'))));

    box.append(el('h3', { class: 'sub' }, t('binds.mouse')));
    box.append(el('div', { class: 'mouse-keys' }, MOUSE_KEYS.map(keyButton)));

    box.append(el('h3', { class: 'sub' }, t('binds.list')));
    const keys = Object.keys(state.binds).sort();
    if (!keys.length) box.append(el('p', { class: 'muted' }, t('binds.empty')));
    box.append(el('div', { class: 'bind-list' }, keys.map(k => {
      const cmd = state.binds[k];
      const a = C.actionForCommand(cmd);
      const def = D.CS2_DEFAULT_BINDS[k];
      const warns = C.bindWarnings(cmd);
      return el('div', { class: 'bind-item' },
        el('button', { type: 'button', class: 'kbd', onclick: () => openPicker(k) }, k),
        el('div', { class: 'grow' },
          el('div', {}, a ? t('act.' + a.id) : cmd, ' ', statusBadge((a && a.status) || 'works')),
          el('code', { class: 'cvar' }, `bind "${k}" "${cmd}"`),
          def ? el('div', { class: 'muted small' }, t('binds.overrides', { what: t('defbind.' + def) })) : null,
          warns.map(w => el('div', { class: 'warn-text small' }, t('warn.' + w)))),
        el('button', { type: 'button', class: 'btn small ghost', onclick: () => { delete state.binds[k]; renderMain(); } }, t('binds.remove')));
    })));
    return box;
  }

  /* picker dialog */

  function openPicker(key) {
    const dlg = $('#picker');
    const current = state.binds[key];
    const def = D.CS2_DEFAULT_BINDS[key];
    const search = el('input', { type: 'search', placeholder: t('picker.search'), 'aria-label': t('picker.search') });
    const lists = el('div', { class: 'picker-lists' });
    const custom = el('input', { type: 'text', placeholder: t('picker.customPlaceholder'), spellcheck: 'false', 'aria-label': t('picker.custom') });
    const customWarn = el('div', { class: 'warn-text small', 'aria-live': 'polite' });
    if (current && !C.actionForCommand(current)) custom.value = current;

    const assign = cmd => {
      const clean = C.sanitizeCommand(cmd);
      if (!clean || C.isBlockedBind(clean)) { custom.focus(); return; }
      state.binds[key] = clean;
      dlg.close();
      renderMain();
    };
    const renderLists = () => {
      const q = norm(search.value.trim());
      lists.replaceChildren();
      for (const cat of D.ACTION_CATEGORIES) {
        const acts = D.ACTIONS.filter(a => a.cat === cat && (!q || norm(t('act.' + a.id)).includes(q) || norm(a.cmd).includes(q)));
        if (!acts.length) continue;
        lists.append(el('section', {}, el('h4', {}, t('acat.' + cat)),
          el('div', { class: 'act-grid' }, acts.map(a => el('button', {
            type: 'button', class: 'act' + (current === a.cmd ? ' active' : ''), onclick: () => assign(a.cmd),
          }, el('span', {}, t('act.' + a.id)), el('code', {}, a.cmd), a.status ? statusBadge(a.status) : null)))));
      }
    };
    search.addEventListener('input', renderLists);
    const customBtn = el('button', { type: 'button', class: 'btn primary', onclick: () => assign(custom.value) }, t('picker.customBtn'));
    const checkCustom = () => {
      const blocked = C.isBlockedBind(custom.value);
      customBtn.disabled = !custom.value.trim() || blocked;
      customWarn.replaceChildren(...C.bindWarnings(custom.value).map(w => el('div', {}, t('warn.' + w))),
        blocked ? el('div', {}, t('warn.blockedNotSaved')) : null);
    };
    custom.addEventListener('input', checkCustom);
    checkCustom();
    custom.addEventListener('keydown', e => { if (e.key === 'Enter') assign(custom.value); });
    renderLists();

    dlg.replaceChildren(el('div', { class: 'picker' },
      el('div', { class: 'picker-head' },
        el('h3', {}, t('picker.title', { key })),
        el('button', { type: 'button', class: 'btn small ghost', onclick: () => dlg.close() }, t('picker.close'))),
      current ? el('div', { class: 'note warn' }, t('warn.replace', { key, cmd: current }),
        C.bindWarnings(current).map(w => el('div', { class: 'small' }, t('warn.' + w)))) : null,
      def ? el('div', { class: 'note info small' }, t('picker.defaultBind', { what: t('defbind.' + def) })) : null,
      search,
      lists,
      el('div', { class: 'picker-custom' },
        el('h4', {}, t('picker.custom')),
        el('div', { class: 'inline-form' }, custom, customBtn),
        customWarn),
      current ? el('button', { type: 'button', class: 'btn ghost', onclick: () => { delete state.binds[key]; dlg.close(); renderMain(); } }, t('picker.remove')) : null));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    search.focus();
  }

  /* key capture */

  const KEY_CODES = {
    Space: 'space', Tab: 'tab', CapsLock: 'capslock', Enter: 'enter', Backspace: 'backspace',
    ShiftLeft: 'shift', ShiftRight: 'rshift', ControlLeft: 'ctrl', ControlRight: 'rctrl',
    AltLeft: 'alt', AltRight: 'ralt', ArrowUp: 'uparrow', ArrowDown: 'downarrow',
    ArrowLeft: 'leftarrow', ArrowRight: 'rightarrow', Insert: 'ins', Delete: 'del', Home: 'home',
    End: 'end', PageUp: 'pgup', PageDown: 'pgdn', Pause: 'pause', Backquote: '`',
    Numpad0: 'kp_ins', Numpad1: 'kp_end', Numpad2: 'kp_downarrow', Numpad3: 'kp_pgdn',
    Numpad4: 'kp_leftarrow', Numpad5: 'kp_5', Numpad6: 'kp_rightarrow', Numpad7: 'kp_home',
    Numpad8: 'kp_uparrow', Numpad9: 'kp_pgup', NumpadEnter: 'kp_enter', NumpadAdd: 'kp_plus',
    NumpadSubtract: 'kp_minus', NumpadMultiply: 'kp_multiply', NumpadDivide: 'kp_slash',
    NumpadDecimal: 'kp_del', Semicolon: 'semicolon', Minus: '-', Equal: '=', BracketLeft: '[',
    BracketRight: ']', Backslash: '\\', Quote: "'", Comma: ',', Period: '.', Slash: '/',
  };
  function codeToCs2(code) {
    if (KEY_CODES[code]) return KEY_CODES[code];
    let m;
    if ((m = /^Key([A-Z])$/.exec(code))) return m[1].toLowerCase();
    if ((m = /^Digit(\d)$/.exec(code))) return m[1];
    if ((m = /^F(\d{1,2})$/.exec(code))) return 'f' + m[1];
    return '';
  }
  const MOUSE_BUTTONS = { 0: 'mouse1', 1: 'mouse3', 2: 'mouse2', 3: 'mouse4', 4: 'mouse5' };

  let stopCapture = null;
  function captureKey(btn, done) {
    if (stopCapture) stopCapture();
    const original = btn.textContent;
    btn.textContent = t('binds.capturing');
    btn.classList.add('listening');
    let armed = false;
    const finish = k => { stopCapture(); if (k) { toast(t('toast.keySet', { key: k })); done(k); } };
    const onKey = e => {
      e.preventDefault(); e.stopPropagation();
      if (e.code === 'Escape') return finish('');
      const k = codeToCs2(e.code);
      if (k) finish(k); else toast(t('toast.keyUnknown'));
    };
    const onDown = e => { if (!armed) return; e.preventDefault(); e.stopPropagation(); finish(MOUSE_BUTTONS[e.button] || ''); };
    const onWheel = e => { e.preventDefault(); finish(e.deltaY < 0 ? 'mwheelup' : 'mwheeldown'); };
    const onCtx = e => e.preventDefault();
    setTimeout(() => { armed = true; }, 0);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    window.addEventListener('contextmenu', onCtx, true);
    stopCapture = () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('contextmenu', onCtx, true);
      btn.textContent = original;
      btn.classList.remove('listening');
      stopCapture = null;
    };
  }

  /* ---------------------------------------------------------------- performance: launch options */

  function renderLaunch() {
    const out = el('code', { class: 'launch-out' });
    registerSync(() => { out.textContent = C.launchOptions(state) || t('perf.launchEmpty'); });
    const refresh = () => { out.textContent = C.launchOptions(state) || t('perf.launchEmpty'); persist(); };
    const rows = D.LAUNCH_OPTIONS.map(o => {
      let ctrl;
      if (o.type === 'check') {
        ctrl = renderSwitch(() => state.launch[o.id], v => { state.launch[o.id] = v; refresh(); }, v => (v ? t('on') : t('off')));
      } else if (o.type === 'select') {
        const sel = el('select', { 'aria-label': t(`launch.${o.id}.l`) }, o.options.map(v => el('option', { value: v }, t(`launch.${o.id}.opt.${v}`))));
        sel.addEventListener('change', () => { state.launch[o.id] = sel.value; refresh(); });
        registerSync(() => { sel.value = state.launch[o.id]; });
        ctrl = sel;
      } else {
        const inp = el('input', { type: 'text', placeholder: t('perf.resPlaceholder'), inputmode: 'numeric', 'aria-label': t('perf.res') });
        inp.addEventListener('input', () => {
          const v = inp.value.trim().toLowerCase().replace(/\s+/g, '').replace('×', 'x');
          const ok = v === '' || /^\d{3,4}x\d{3,4}$/.test(v);
          inp.classList.toggle('invalid', !ok);
          if (ok) { state.launch[o.id] = v; refresh(); }
        });
        registerSync(() => { if (document.activeElement !== inp) inp.value = state.launch[o.id]; });
        ctrl = inp;
      }
      return el('div', { class: 'row' },
        el('div', { class: 'row-head' },
          el('div', { class: 'row-label' }, t(`launch.${o.id}.l`), el('span', { class: 'badges' }, statusBadge(o.status),
            o.warn ? badge('cheat', 'Trust Factor') : null)),
          o.arg ? el('code', { class: 'cvar' }, o.arg) : null),
        el('div', { class: 'ctrl' }, ctrl),
        el('p', { class: 'row-desc' }, t(`launch.${o.id}.d`)));
    });
    return el('section', { class: 'group' },
      el('h3', {}, t('perf.launchTitle')),
      el('p', { class: 'muted' }, t('perf.launchIntro')),
      rows,
      el('div', { class: 'launch-box' }, out,
        el('button', { type: 'button', class: 'btn primary small', onclick: () => copyText(C.launchOptions(state)) }, t('perf.copyLaunch'))),
      el('p', {}, el('button', { type: 'button', class: 'link', onclick: () => openCategory('myths') }, t('perf.mythsLink'))));
  }

  /* ---------------------------------------------------------------- myths */

  function renderMyth(m) {
    return el('article', { class: 'myth' },
      el('div', { class: 'myth-head' },
        el('span', { class: 'myth-names' }, (m.names.length ? m.names : [m.id]).map(n => el('code', {}, n))),
        badge('myth', t('verdict.' + m.verdict))),
      el('p', {}, t(`myth.${m.id}.d`)));
  }

  function renderMyths() {
    return el('div', {}, ['cvar', 'launch', 'bind'].map(kind => {
      const items = D.MYTHS.filter(m => (m.kind || 'cvar') === kind);
      return el('section', { class: 'group' }, el('h3', {}, t('myths.kind.' + kind)), items.map(renderMyth));
    }));
  }

  /* ---------------------------------------------------------------- install */

  function renderInstall() {
    return el('div', { class: 'guide' },
      el('h3', {}, t('install.step1')),
      el('p', { html: t('install.step1_html') }),
      el('code', { class: 'path' }, 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\cfg'),
      el('p', { html: t('install.step1b_html') }),
      el('p', { class: 'note info', html: t('install.note_html') }),
      el('h3', {}, t('install.step2')),
      el('div', { html: t('install.step2_html') }),
      el('div', { class: 'launch-box' }, el('code', { class: 'launch-out' }, C.launchOptions(state) || '+exec autoexec'),
        el('button', { type: 'button', class: 'btn small', onclick: () => copyText(C.launchOptions(state) || '+exec autoexec') }, t('preview.copy'))),
      el('h3', {}, t('install.step3')),
      el('p', { html: t('install.step3_html') }),
      el('h3', {}, t('install.tips')),
      el('div', { html: t('install.tips_html') }));
  }

  /* ================================================================ output panel */

  function highlight(text) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return text.split('\n').map(l => {
      if (l.startsWith('//')) return `<span class="c">${esc(l)}</span>`;
      const m = /^(\S+)(\s+)(.*)$/.exec(l);
      if (!m) return esc(l);
      const val = esc(m[3]).replace(/(&quot;|")([^"]*)"|(-?\b\d+(?:\.\d+)?\b)|\b(true|false)\b/g, (x, q, str, num, bool) =>
        num !== undefined ? `<span class="n">${num}</span>` : bool ? `<span class="n">${bool}</span>` : `<span class="s">${x}</span>`);
      return `<span class="k">${esc(m[1])}</span>${m[2]}${val}`;
    }).join('\n');
  }

  let currentCfg = '';
  function update() {
    currentCfg = C.generateCfg(state, t);
    $('#cfgPreview').innerHTML = highlight(currentCfg);
    const n = currentCfg.split('\n').filter(l => l && !l.startsWith('//')).length;
    $('#lineCount').textContent = t('preview.lines', { n });
    $('#previewOpenCount').textContent = String(n);
    for (const [row, def] of dimRows) row.classList.toggle('dim', !def.showIf(state.settings));
    const panel = $('#main .panel');
    if (panel && !searchQuery) panel.classList.toggle('section-off', D.FILE_SECTIONS.includes(prefs.cat) && !state.sections[prefs.cat]);
    syncControls();
    drawPreviews();
    persist();
  }

  function download() {
    const blob = new Blob([currentCfg], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'autoexec.cfg' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t('toast.downloaded'));
  }

  async function copyCfg() {
    if (await copyText(currentCfg)) return;
    const range = document.createRange();
    range.selectNodeContents($('#cfgPreview'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    toast(t('toast.selected'));
  }

  /* ---------------------------------------------------------------- desktop (Electron) */

  let deskFolder = null;
  function setupDesktop() {
    const api = window.cs2desktop;
    if (!api) return;
    document.body.classList.add('desktop');
    const status = $('#deskStatus');
    const setStatus = (msg, kind) => { status.textContent = msg; status.className = 'desk-status' + (kind ? ' ' + kind : ''); };
    const showFolder = res => {
      deskFolder = res && res.ok ? res : null;
      if (deskFolder) setStatus(t(deskFolder.source === 'manual' ? 'desk.manual' : 'desk.detected', { path: deskFolder.cfgDir }));
      else setStatus(t('desk.notFound'), 'err');
      $('#openFolderBtn').disabled = !deskFolder;
    };
    api.detect().then(showFolder).catch(() => showFolder(null));
    const choose = async () => {
      const res = await api.chooseFolder();
      if (res && res.ok) { showFolder(res); return true; }
      if (res && res.error) setStatus(res.error, 'err');
      return false;
    };
    $('#chooseFolderBtn').addEventListener('click', choose);
    $('#openFolderBtn').addEventListener('click', () => api.openFolder());
    $('#saveBtn').addEventListener('click', async () => {
      const btn = $('#saveBtn');
      btn.disabled = true;
      try {
        let res = await api.save(currentCfg);
        if (res && res.needFolder) {
          toast(t('toast.needFolder'));
          if (await choose()) res = await api.save(currentCfg);
        }
        if (res && res.ok) {
          const msg = res.unchanged ? t('desk.unchanged', { path: res.path })
            : t('desk.saved', { path: res.path }) + (res.backup ? ' · ' + t('desk.backup', { path: res.backup }) : '');
          setStatus(msg, 'ok');
          toast(res.unchanged ? t('toast.unchanged') : t('toast.saved'));
        } else if (res && res.error) {
          setStatus(res.error, 'err');
          toast(t('toast.saveFailed'));
        }
      } catch (e) {
        setStatus(t('desk.error', { msg: e && e.message ? e.message : String(e) }), 'err');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ================================================================ boot */

  function renderAll() {
    renderChrome();
    renderMain();
    if (deskFolder) {
      $('#deskStatus').textContent = t(deskFolder.source === 'manual' ? 'desk.manual' : 'desk.detected', { path: deskFolder.cfgDir });
    }
  }

  function loadSharedFromHash() {
    const m = /[#&]cfg=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return;
    try {
      const shared = C.decodeShare(m[1]);
      if (confirm(t('confirm.shared'))) { state = shared; toast(t('toast.shared')); }
    } catch (_) {
      toast(t('toast.sharedBad'));
    }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { /* file:// */ }
  }

  let searchTimer = 0;
  $('#search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderChrome();
      renderMain();
    }, 120);
  });
  $('#search').addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.target.value = ''; searchQuery = ''; renderChrome(); renderMain(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !stopCapture) {
      e.preventDefault(); $('#search').focus();
    }
  });
  $('#downloadBtn').addEventListener('click', download);
  $('#copyBtn').addEventListener('click', copyCfg);
  $('#shareBtn').addEventListener('click', shareLink);
  $('#previewOpen').addEventListener('click', () => { document.body.classList.add('show-preview'); $('#previewClose').focus(); });
  $('#previewClose').addEventListener('click', () => { document.body.classList.remove('show-preview'); $('#previewOpen').focus(); });
  $('#picker').addEventListener('click', e => { if (e.target.id === 'picker') e.target.close(); });
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawPreviews, 80); });

  // Keep the sticky offsets in sync with the real header height (it wraps on phones).
  const header = document.querySelector('header.top');
  const setHeaderH = () => document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  if (window.ResizeObserver) new ResizeObserver(setHeaderH).observe(header);
  setHeaderH();

  loadSharedFromHash();
  renderAll();
  setupDesktop();
})();
