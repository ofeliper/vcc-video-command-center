// Página de configurações do VCC.
// Lê e grava direto no armazenamento da extensão (as mesmas chaves vcc_* que
// o painel usa). As abas abertas aplicam as mudanças na hora (storage.onChanged).
// A página é montada com elementos DOM, sem inserir HTML.
(function () {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const I18N = globalThis.VCC_I18N;
  const SHARED = globalThis.VCC_SHARED;
  const { DEFAULTS, FACTORY_KEYS, KEY_ACTION_IDS, SPEED_MIN, SPEED_MAX } = SHARED;

  const GITHUB = 'https://github.com/ofeliper/vcc-video-command-center';
  const CONTACT = 'ofeliper.dev@gmail.com';
  const ANCHOR_ARROWS = { 'top-left': '↖', 'top-center': '↑', 'top-right': '↗', 'bottom-left': '↙', 'bottom-center': '↓', 'bottom-right': '↘' };
  const SECTIONS = ['appearance', 'language', 'keys', 'behavior', 'sites', 'data', 'about'];

  let data = {};            // cópia de tudo o que está salvo
  let t = I18N.translator(I18N.resolve('auto'));
  let capturing = null;     // captura de atalho em andamento
  let pendingRender = false;
  const openSites = new Set();

  // ─────────────────────────────────────────────
  // Armazenamento
  // ─────────────────────────────────────────────
  const gkey = name => `vcc_global_${name}`;
  const skey = (domain, name) => `vcc_${domain}_${name}`;
  const G = name => (data[gkey(name)] !== undefined ? data[gkey(name)] : DEFAULTS[name]);

  async function set(values) {
    Object.assign(data, values);
    render();
    await api.storage.local.set(values);
    toast();
  }

  async function remove(keys) {
    keys = [].concat(keys);
    keys.forEach(k => { delete data[k]; });
    render();
    await api.storage.local.remove(keys);
    toast();
  }

  function globalKeys() {
    return { ...FACTORY_KEYS, ...(data[gkey('keys')] || {}) };
  }

  function activeSites() {
    const list = data[gkey('activeSites')];
    return (Array.isArray(list) ? list : []).map(SHARED.normalizeSite).filter(Boolean);
  }

  // Domínios com algo salvo (ativos ou com configurações próprias).
  function knownSites() {
    const sites = new Set(activeSites());
    for (const key of Object.keys(data)) {
      if (!key.startsWith('vcc_') || key.startsWith('vcc_global_')) continue;
      const rest = key.slice(4);
      const name = SHARED.SITE_KEYS.find(n => rest.endsWith('_' + n));
      if (name) sites.add(rest.slice(0, -(name.length + 1)));
    }
    return [...sites].filter(Boolean).sort();
  }

  // ─────────────────────────────────────────────
  // Utilidades de DOM
  // ─────────────────────────────────────────────
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : String(c));
    return el;
  }

  function toast() {
    const el = document.getElementById('toast');
    el.textContent = t('opt.saved');
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 1200);
  }

  function field(label, sub, control, opts = {}) {
    return h('div', { class: 'field' + (opts.off ? ' off' : '') },
      h('div', null, h('div', { class: 'field-label', id: opts.id }, label), sub ? h('div', { class: 'field-sub' }, sub) : null),
      h('div', { class: 'control' }, control));
  }

  function switchEl(on, onChange, opts = {}) {
    return h('button', {
      class: 'switch', role: 'switch', 'aria-checked': String(!!on), 'aria-labelledby': opts.labelledby,
      disabled: !!opts.disabled, onclick: () => onChange(!on),
    }, h('span'));
  }

  function segmented(options, value, onChange, label) {
    return h('div', { class: 'seg', role: 'group', 'aria-label': label },
      options.map(([v, text, langAttr]) => h('button', {
        'aria-pressed': String(v === value), lang: langAttr, onclick: () => { if (v !== value) onChange(v); },
      }, text)));
  }

  function range(value, min, max, step, format, onCommit, label) {
    const out = h('span', { class: 'value' }, format(value));
    const input = h('input', {
      type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label,
      oninput: e => { out.textContent = format(Number(e.target.value)); },
      onchange: e => onCommit(Number(e.target.value)),
    });
    return [input, out];
  }

  function numberInput(value, min, max, step, onCommit, label) {
    return h('input', {
      type: 'number', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label,
      onchange: e => {
        const n = Number(e.target.value);
        if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
        else e.target.value = String(value);
      },
    });
  }

  const pct = v => `${Math.round(v)}%`;

  // ─────────────────────────────────────────────
  // Seções
  // ─────────────────────────────────────────────
  function sectionAppearance() {
    const auto = !!G('barAuto');
    const anchor = G('barAnchor');
    return h('section', { class: 'card', id: 'appearance' },
      h('h2', null, t('opt.nav.appearance')),
      field(t('theme.title'), null,
        segmented(SHARED.THEMES_PREFS.map(p => [p, p === 'auto' ? t('theme.auto', { name: t('theme.' + SHARED.resolveTheme('auto')) }) : t('theme.' + p)]),
          G('theme'), v => set({ [gkey('theme')]: v }), t('theme.title'))),

      h('h3', null, t('opt.opacityDefaults')),
      h('p', { class: 'hint' }, t('opt.opacityHint')),
      field(t('vs.barOpacity'), null, range(G('cbOpacity') * 100, 10, 100, 5, pct, v => set({ [gkey('cbOpacity')]: v / 100 }), t('vs.barOpacity'))),
      field(t('vs.panelOpacity'), null, range(G('cpOpacity') * 100, 20, 100, 5, pct, v => set({ [gkey('cpOpacity')]: v / 100 }), t('vs.panelOpacity'))),

      h('h3', null, t('sec.bar')),
      field(t('bar.mode'), t('bar.modeHint', { key: globalKeys().toggleCB || '—' }),
        segmented(SHARED.MODES.map(m => [m, t('mode.' + m)]), G('cbMode'), v => set({ [gkey('cbMode')]: v }), t('bar.mode'))),
      field(t('bar.auto'), t('bar.autoSub'),
        switchEl(auto, v => set({ [gkey('barAuto')]: v }), { labelledby: 'lbl-barauto' }), { id: 'lbl-barauto' }),
      field(t('bar.anchor'), null,
        h('div', { class: 'anchor-grid', role: 'group', 'aria-label': t('bar.anchor') },
          SHARED.BAR_ANCHORS.map(a => h('button', {
            'aria-pressed': String(a === anchor), title: t('anchor.' + a), 'aria-label': t('anchor.' + a), disabled: !auto,
            onclick: () => set({ [gkey('barAnchor')]: a }),
          }, ANCHOR_ARROWS[a]))), { off: !auto }),
      field(t('bar.perVideo'), auto ? t('bar.perVideoSub') : t('bar.perVideoNeedsAuto'),
        switchEl(G('barLayout') === 'perVideo', v => set({ [gkey('barLayout')]: v ? 'perVideo' : 'single' }), { disabled: !auto, labelledby: 'lbl-pervideo' }),
        { off: !auto, id: 'lbl-pervideo' }),
      field(t('bar.wheel'), t('bar.wheelSub'),
        switchEl(!!G('barWheel'), v => set({ [gkey('barWheel')]: v }), { labelledby: 'lbl-barwheel' }), { id: 'lbl-barwheel' }),
      field(t('bh.alertDuration'), t('bh.alertHint'),
        range(G('alertDuration'), 200, 3000, 100, v => `${v}ms`, v => set({ [gkey('alertDuration')]: v }), t('bh.alertDuration'))),
    );
  }

  function sectionLanguage() {
    const pref = I18N.SUPPORTED.includes(G('language')) ? G('language') : 'auto';
    return h('section', { class: 'card', id: 'language' },
      h('h2', null, t('opt.nav.language')),
      h('p', { class: 'hint' }, t('opt.langHint')),
      segmented(['auto', ...I18N.SUPPORTED].map(code => [
        code,
        code === 'auto' ? t('lang.auto', { name: I18N.SHORT_NAMES[I18N.detect()] }) : I18N.LANGUAGE_NAMES[code],
        code === 'auto' ? null : code,
      ]), pref, v => set({ [gkey('language')]: v }), t('lang.title')),
    );
  }

  // Lista de atalhos editáveis. `keys` = atalhos em vigor; `write(action, binding)` grava.
  function keyList(keys, write) {
    const rows = KEY_ACTION_IDS.map(id => h('div', { class: 'key-row' },
      h('span', null, t('key.' + id)),
      h('span', { class: 'keycaps' },
        h('button', { class: 'kbd', 'data-action': id, 'aria-label': `${t('key.' + id)}: ${keys[id] || '—'}`, onclick: e => startCapture(e.currentTarget, id, keys, write) }, keys[id] || '—'),
        h('button', { class: 'icon-btn', title: t('ks.remove'), 'aria-label': t('ks.remove'), onclick: () => write(id, null) }, '✕'))));
    rows.push(
      h('div', { class: 'key-row fixed' }, h('span', null, t('ks.fixedPlay')), h('span', { class: 'keycaps' }, h('span', { class: 'kbd static' }, '0'))),
      h('div', { class: 'key-row fixed' }, h('span', null, t('ks.fixedPresets')),
        h('span', { class: 'keycaps' }, h('span', { class: 'kbd static' }, '1'), h('span', { class: 'kbd static' }, '…'), h('span', { class: 'kbd static' }, '7'))));
    return h('div', { class: 'keys' }, rows);
  }

  function startCapture(btn, action, keys, write) {
    if (capturing) capturing.cancel();
    const original = btn.textContent;
    btn.classList.add('capturing');
    btn.textContent = '…';

    const finish = () => {
      document.removeEventListener('keydown', handler, true);
      capturing = null;
      if (pendingRender) render();
    };
    const fail = key => {
      btn.classList.remove('capturing'); btn.classList.add('error'); btn.textContent = t(key);
      finish();
      setTimeout(() => { btn.classList.remove('error'); btn.textContent = original; }, 1300);
    };
    const handler = e => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { btn.classList.remove('capturing'); btn.textContent = original; finish(); return; }
      const binding = SHARED.bindingFromEvent(e);
      if (!binding) return fail('ks.invalid');
      const dup = Object.entries(keys).some(([act, b]) => b && act !== action && b.toUpperCase() === binding.toUpperCase());
      if (dup) return fail('ks.inUse');
      btn.classList.remove('capturing'); btn.textContent = binding;
      finish();
      write(action, binding);
    };
    capturing = { cancel: () => { btn.classList.remove('capturing'); btn.textContent = original; finish(); } };
    document.addEventListener('keydown', handler, true);
  }

  function sectionKeys() {
    const keys = globalKeys();
    return h('section', { class: 'card', id: 'keys' },
      h('h2', null, t('opt.nav.keys')),
      h('p', { class: 'hint' }, t('opt.keysHint')),
      h('p', { class: 'hint' }, t('opt.keysNoKey')),
      keyList(keys, (action, binding) => set({ [gkey('keys')]: { ...(data[gkey('keys')] || {}), [action]: binding } })),
      h('p', { class: 'hint' }, t('ks.help')),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', onclick: () => { if (confirm(t('ks.factoryConfirm'))) remove(gkey('keys')); } }, t('ks.factory'))),
    );
  }

  function sectionBehavior() {
    return h('section', { class: 'card', id: 'behavior' },
      h('h2', null, t('opt.nav.behavior')),
      h('h3', null, t('bh.steps')),
      field(t('bh.speedStep'), null, [numberInput(G('speedStep'), 0.05, 1, 0.05, v => set({ [gkey('speedStep')]: Math.round(v * 100) / 100 }), t('bh.speedStep')), h('span', { class: 'value' }, '×')]),
      field(t('bh.volumeStep'), null, [numberInput(G('volumeStep'), 1, 25, 1, v => set({ [gkey('volumeStep')]: Math.round(v) }), t('bh.volumeStep')), h('span', { class: 'value' }, '%')]),
      field(t('bh.seekStep'), null, [numberInput(G('seekStep'), 1, 300, 1, v => set({ [gkey('seekStep')]: Math.round(v) }), t('bh.seekStep')), h('span', { class: 'value' }, 's')]),
      field(t('bh.seekStepLong'), `${globalKeys().seekBackLong || '—'} / ${globalKeys().seekFwdLong || '—'}`,
        [numberInput(G('seekStepLong'), 5, 3600, 5, v => set({ [gkey('seekStepLong')]: Math.round(v) }), t('bh.seekStepLong')), h('span', { class: 'value' }, 's')]),
      field(t('bh.holdSpeed'), `${t('key.holdSpeed')}: ${globalKeys().holdSpeed || '—'}`,
        [numberInput(G('holdSpeed'), SPEED_MIN, SPEED_MAX, 0.25, v => set({ [gkey('holdSpeed')]: Math.round(v * 100) / 100 }), t('bh.holdSpeed')), h('span', { class: 'value' }, '×')]),
    );
  }

  function videoDataCount(domain) {
    return {
      pos: Object.keys(data[skey(domain, 'resumePos')] || {}).length,
      marks: Object.keys(data[skey(domain, 'marks')] || {}).length,
    };
  }

  // Posições e marcadores mudam enquanto um vídeo toca: atualiza só os números.
  function refreshVideoDataCounts() {
    document.querySelectorAll('[data-vd-count]').forEach(el => {
      const c = videoDataCount(el.dataset.vdCount);
      el.textContent = t('opt.siteVideoDataCount', c);
      const btn = document.querySelector(`[data-vd-clear="${CSS.escape(el.dataset.vdCount)}"]`);
      if (btn) btn.disabled = !c.pos && !c.marks;
    });
  }

  function siteCard(domain) {
    const S = name => data[skey(domain, name)];
    const active = activeSites().includes(domain);
    const safeId = domain.replace(/[^a-z0-9]/gi, '-');
    const siteKeys = S('keys');
    const custom = !!siteKeys;

    const opacityField = (name, min, labelKey) => {
      const own = S(name) !== undefined;
      const def = G(name);
      const value = own ? S(name) : def;
      return field(t(labelKey), null, [
        h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: !own, onchange: e => (e.target.checked ? remove(skey(domain, name)) : set({ [skey(domain, name)]: def })) }),
          t('opt.useDefault', { value: pct(def * 100) })),
        ...(own ? range(value * 100, min, 100, 5, pct, v => set({ [skey(domain, name)]: v / 100 }), t(labelKey)) : []),
      ]);
    };

    const pos = S('cbPos');
    const rotation = [0, 90, 180, 270].includes(S('rotation')) ? S('rotation') : 'off';
    const { pos: resumeCount, marks: marksCount } = videoDataCount(domain);
    const details = h('details', { class: 'site', open: openSites.has(domain),
      ontoggle: e => { if (e.target.open) openSites.add(domain); else openSites.delete(domain); } },
      h('summary', null, domain, h('span', { class: 'badge ' + (active ? 'on' : 'off') }, t(active ? 'opt.siteOn' : 'opt.siteOff'))),
      h('div', { class: 'site-body' },
        field(t('opt.siteActive'), null, switchEl(active, on => {
          const list = activeSites().filter(s => s !== domain);
          if (on) list.push(domain);
          set({ [gkey('activeSites')]: [...new Set(list)].sort() });
        }, { labelledby: `lbl-act-${safeId}` }), { id: `lbl-act-${safeId}` }),
        field(t('opt.siteSpeed'), null, [
          numberInput(S('speed') ?? 1, SPEED_MIN, SPEED_MAX, 0.05, v => set({ [skey(domain, 'speed')]: Math.round(v * 100) / 100 }), t('opt.siteSpeed')),
          h('span', { class: 'value' }, '×')]),
        field(t('opt.siteVolume'), null, [
          ...range(Math.round((S('volume') ?? 1) * 100), 0, 100, 1, pct, v => set({ [skey(domain, 'volume')]: v / 100 }), t('opt.siteVolume')),
          h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: !!S('muted'), onchange: e => set({ [skey(domain, 'muted')]: e.target.checked }) }),
            t('opt.siteMuted'))]),
        opacityField('cbOpacity', 10, 'vs.barOpacity'),
        opacityField('cpOpacity', 20, 'vs.panelOpacity'),
        field(t('opt.siteBarPos'), pos ? `x ${Math.round(pos.x)}, y ${Math.round(pos.y)}` : t('opt.posDefault'),
          h('button', { class: 'btn', disabled: !pos, onclick: () => remove(skey(domain, 'cbPos')) }, t('opt.resetPos'))),

        field(t('opt.siteRotation'), null,
          segmented([['off', t('opt.rotOff')], [0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']], rotation,
            v => (v === 'off' ? remove(skey(domain, 'rotation')) : set({ [skey(domain, 'rotation')]: v })), t('opt.siteRotation'))),
        field(t('opt.siteResume'), t('opt.siteResumeSub'), switchEl(!!S('resume'),
          on => (on ? set({ [skey(domain, 'resume')]: true }) : remove(skey(domain, 'resume'))), { labelledby: `lbl-res-${safeId}` }), { id: `lbl-res-${safeId}` }),
        field(t('opt.siteVideoData'), h('span', { 'data-vd-count': domain }, t('opt.siteVideoDataCount', { pos: resumeCount, marks: marksCount })),
          h('button', { class: 'btn', 'data-vd-clear': domain, disabled: !resumeCount && !marksCount, onclick: () => {
            if (confirm(t('opt.clearVideoDataConfirm', { domain }))) remove(SHARED.VIDEO_DATA_KEYS.map(n => skey(domain, n)));
          } }, t('opt.clearVideoData'))),

        h('h3', null, t('opt.siteKeys')),
        h('div', { class: 'radio-row', role: 'radiogroup', 'aria-label': t('opt.siteKeys') },
          h('label', { class: 'check' }, h('input', { type: 'radio', name: `keys-${safeId}`, checked: !custom, onchange: () => remove(skey(domain, 'keys')) }), t('opt.siteKeysGlobal')),
          h('label', { class: 'check' }, h('input', { type: 'radio', name: `keys-${safeId}`, checked: custom, onchange: () => set({ [skey(domain, 'keys')]: { ...globalKeys() } }) }), t('opt.siteKeysCustom'))),
        custom ? keyList({ ...globalKeys(), ...siteKeys }, (action, binding) => set({ [skey(domain, 'keys')]: { ...(S('keys') || {}), [action]: binding } })) : null,

        h('div', { class: 'row-actions' },
          h('button', { class: 'btn danger', onclick: () => {
            if (!confirm(t('opt.siteDeleteConfirm', { domain }))) return;
            const keys = SHARED.SITE_KEYS.map(n => skey(domain, n));
            const list = activeSites().filter(s => s !== domain);
            openSites.delete(domain);
            remove(keys).then(() => set({ [gkey('activeSites')]: list }));
          } }, t('opt.siteDelete'))),
      ));
    return details;
  }

  function sectionSites() {
    const sites = knownSites();
    const input = h('input', { type: 'text', placeholder: t('opt.addSitePlaceholder'), 'aria-label': t('si.add') });
    const add = () => {
      const d = SHARED.normalizeSite(input.value);
      if (!d || !/^[a-z0-9.-]+\.[a-z0-9-]+$/i.test(d)) { alert(t('opt.invalidDomain')); return; }
      openSites.add(d);
      set({ [gkey('activeSites')]: [...new Set([...activeSites(), d])].sort() });
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    return h('section', { class: 'card', id: 'sites' },
      h('h2', null, t('opt.nav.sites')),
      h('p', { class: 'hint' }, t('opt.sitesHint')),
      h('div', { class: 'add-site' }, input, h('button', { class: 'btn', onclick: add }, t('si.add'))),
      sites.length ? h('div', { class: 'sites' }, sites.map(siteCard)) : h('p', { class: 'muted' }, t('opt.noSites')),
    );
  }

  function sectionData() {
    const entries = Object.entries(data).filter(([k]) => k.startsWith('vcc_')).sort(([a], [b]) => a.localeCompare(b));
    const text = entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
    const pre = h('pre', { class: 'data', hidden: true }, text || t('dt.empty'));
    const allKeys = entries.map(([k]) => k);
    return h('section', { class: 'card', id: 'data' },
      h('h2', null, t('opt.nav.data')),
      h('p', { class: 'muted' }, t('opt.dataCount', { n: entries.length })),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', 'aria-expanded': 'false', onclick: e => { pre.hidden = !pre.hidden; e.currentTarget.setAttribute('aria-expanded', String(!pre.hidden)); } }, t('opt.showData')),
        h('button', { class: 'btn', onclick: () => navigator.clipboard.writeText(text).then(toast, () => {}) }, t('dt.copyAll')),
        h('button', { class: 'btn danger', onclick: () => { if (confirm(t('dt.deleteConfirm'))) remove(allKeys); } }, t('dt.deleteAll'))),
      pre,
      h('h3', null, t('dt.backup')),
      h('p', { class: 'hint' }, t('dt.backupHint')),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', id: 'export-btn', onclick: exportSettings }, t('dt.export')),
        h('button', { class: 'btn', id: 'import-btn', onclick: () => document.getElementById('import-file').click() }, t('dt.import')),
        h('input', { type: 'file', id: 'import-file', accept: '.json,application/json', hidden: true, onchange: e => importSettings(e.target) })),
      h('div', { class: 'danger-zone' },
        h('h3', null, t('dt.resets')),
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn', onclick: () => { if (confirm(t('dt.resetKeysConfirm'))) remove(allKeys.filter(k => k.endsWith('_keys'))); } }, t('dt.resetKeys')),
          h('button', { class: 'btn danger', onclick: () => { if (confirm(t('opt.resetAllConfirm'))) remove(allKeys); } }, t('dt.resetAll')))),
    );
  }

  // Backup em arquivo (mesmo formato do painel do Tampermonkey).
  function exportSettings() {
    const json = JSON.stringify(SHARED.buildExport(data, api.runtime.getManifest().version), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = h('a', { href: url, download: SHARED.exportFileName() });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function importSettings(input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const result = SHARED.parseImport(await file.text());
    if (result.error) { alert(t('dt.importInvalid')); return; }
    if (!confirm(t('dt.importConfirm'))) return;
    const old = Object.keys(data).filter(k => k.startsWith('vcc_') && !(k in result.data));
    old.forEach(k => { delete data[k]; });
    if (old.length) await api.storage.local.remove(old);
    await set(result.data);
  }

  function sectionAbout() {
    const version = api.runtime.getManifest().version;
    return h('section', { class: 'card', id: 'about' },
      h('h2', null, t('opt.nav.about')),
      h('p', null, h('strong', null, 'VCC — Video Command Center'), ' · ', t('pop.version', { v: version })),
      h('p', { class: 'muted' }, t('opt.aboutText')),
      h('div', { class: 'links' },
        h('a', { href: GITHUB, target: '_blank', rel: 'noopener' }, t('opt.source')),
        h('a', { href: GITHUB + '/issues', target: '_blank', rel: 'noopener' }, t('opt.issues')),
        h('a', { href: GITHUB + '/blob/main/PRIVACY.md', target: '_blank', rel: 'noopener' }, t('opt.privacy')),
        h('a', { href: 'mailto:' + CONTACT }, `${t('opt.contact')}: ${CONTACT}`)),
    );
  }

  // ─────────────────────────────────────────────
  // Montagem
  // ─────────────────────────────────────────────
  function render() {
    // Não redesenha no meio de uma edição (campo focado ou captura de atalho).
    const focused = document.activeElement;
    if (capturing || (focused && focused.matches?.('input[type=text], input[type=number]'))) {
      pendingRender = true;
      return;
    }
    pendingRender = false;

    const lang = I18N.resolve(G('language'));
    t = I18N.translator(lang);
    document.documentElement.lang = lang;
    document.title = t('opt.title');
    SHARED.applyThemeVars(document.documentElement, SHARED.resolveTheme(G('theme')));
    document.getElementById('page-title').textContent = t('opt.title');
    document.getElementById('version').textContent = t('pop.version', { v: api.runtime.getManifest().version });

    const hash = location.hash.slice(1);
    document.getElementById('nav').replaceChildren(...SECTIONS.map(id =>
      h('a', { href: '#' + id, class: id === hash ? 'current' : null, 'aria-current': id === hash ? 'true' : null }, t('opt.nav.' + id))));

    const scroll = window.scrollY;
    document.getElementById('main').replaceChildren(
      sectionAppearance(), sectionLanguage(), sectionKeys(), sectionBehavior(), sectionSites(), sectionData(), sectionAbout());
    window.scrollTo(0, scroll);
  }

  document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender) render(); }, 0));
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1);
    document.querySelectorAll('#nav a').forEach(a => {
      const on = a.getAttribute('href') === '#' + hash;
      a.classList.toggle('current', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  });

  // Mudanças feitas nas abas ou no menu do ícone aparecem aqui na hora.
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let changed = false;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (!key.startsWith('vcc_')) continue;
      if (JSON.stringify(data[key]) === JSON.stringify(newValue)) continue;
      if (newValue === undefined) delete data[key]; else data[key] = newValue;
      if (!SHARED.VIDEO_DATA_KEYS.some(n => key.endsWith('_' + n))) changed = true;
    }
    if (changed) render(); else refreshVideoDataCounts();
  });

  SHARED.onSystemThemeChange(() => { if (G('theme') === 'auto') render(); });

  api.storage.local.get(null).then(items => {
    data = items || {};
    render();
  });
})();
