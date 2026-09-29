// Menu do ícone da extensão VCC.
// Mostra se o VCC tem acesso ao site atual, pede a permissão quando falta,
// abre o painel (o mesmo do atalho H), troca tema e idioma e abre a página
// de configurações.
(function () {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const I18N = globalThis.VCC_I18N;
  const SHARED = globalThis.VCC_SHARED;
  const ALL_SITES = { origins: ['<all_urls>'] };
  const THEME_KEY = 'vcc_global_theme';
  const $ = id => document.getElementById(id);

  let tab = null;
  let siteOrigins = null; // { origins: ['*://host/*'] }
  let langPref = 'auto';
  let themePref = 'auto';
  let t = I18N.translator(I18N.resolve(langPref));
  let lastActive = null;
  let lastAllSites = null;

  function show(id) {
    for (const s of ['unsupported', 'no-access', 'needs-reload', 'ready']) $(s).hidden = s !== id;
  }

  async function sendToTab(message) {
    try {
      return await api.tabs.sendMessage(tab.id, message);
    } catch {
      return null; // script do VCC não está rodando nesta página
    }
  }

  // ── Tema ──
  function applyTheme() {
    SHARED.applyThemeVars(document.documentElement, SHARED.resolveTheme(themePref));
  }

  // ── Textos e seletores ──
  function fillSelect(select, options, value) {
    select.replaceChildren(...options.map(([code, label, langAttr]) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = label;
      if (langAttr) opt.lang = langAttr;
      return opt;
    }));
    select.value = value;
  }

  function applyTexts() {
    document.documentElement.lang = I18N.resolve(langPref);
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)));
    if (lastActive !== null) renderActive(lastActive);
    if (lastAllSites !== null) renderAccessSummary(lastAllSites);

    fillSelect($('language'), ['auto', ...I18N.SUPPORTED].map(code => [
      code,
      code === 'auto' ? t('lang.auto', { name: I18N.SHORT_NAMES[I18N.detect()] }) : I18N.LANGUAGE_NAMES[code],
      code === 'auto' ? null : code,
    ]), langPref);

    fillSelect($('theme'), SHARED.THEMES_PREFS.map(p => [
      p,
      p === 'auto' ? t('theme.auto', { name: t('theme.' + SHARED.resolveTheme('auto')) }) : t('theme.' + p),
    ]), themePref);

    $('version').textContent = t('pop.version', { v: api.runtime.getManifest().version });
  }

  async function loadPrefs() {
    try {
      const items = await api.storage.local.get([I18N.STORAGE_KEY, THEME_KEY]);
      langPref = I18N.SUPPORTED.includes(items?.[I18N.STORAGE_KEY]) ? items[I18N.STORAGE_KEY] : 'auto';
      themePref = SHARED.THEMES_PREFS.includes(items?.[THEME_KEY]) ? items[THEME_KEY] : 'auto';
    } catch {}
    t = I18N.translator(I18N.resolve(langPref));
    applyTheme();
    applyTexts();
  }

  // Salvar dispara storage.onChanged: as abas abertas se atualizam na hora.
  $('language').addEventListener('change', e => {
    langPref = e.target.value;
    t = I18N.translator(I18N.resolve(langPref));
    applyTexts();
    api.storage.local.set({ [I18N.STORAGE_KEY]: langPref });
  });

  $('theme').addEventListener('change', e => {
    themePref = e.target.value;
    applyTheme();
    api.storage.local.set({ [THEME_KEY]: themePref });
  });

  SHARED.onSystemThemeChange(() => { if (themePref === 'auto') { applyTheme(); applyTexts(); } });

  // ── Estado do site ──
  function renderActive(active) {
    lastActive = active;
    const btn = $('toggle-site');
    btn.setAttribute('aria-checked', String(active));
    btn.classList.toggle('on', active);
    $('active-label').textContent = t(active ? 'pop.activeOn' : 'pop.activeOff');
  }

  function renderAccessSummary(all) {
    lastAllSites = all;
    $('access-summary').textContent = t(all ? 'pop.accessAll' : 'pop.accessSome');
    $('grant-all-footer').hidden = all;
  }

  async function refresh() {
    [tab] = await api.tabs.query({ active: true, currentWindow: true });

    let url = null;
    try { url = new URL(tab?.url || ''); } catch {}
    if (!url || !/^https?:$/.test(url.protocol)) {
      $('site').textContent = '';
      show('unsupported');
      return;
    }

    $('site').textContent = url.hostname.replace(/^www\./, '');
    siteOrigins = { origins: [`*://${url.hostname}/*`] };

    renderAccessSummary(await api.permissions.contains(ALL_SITES));

    const hasAccess = await api.permissions.contains(siteOrigins);
    if (!hasAccess) {
      show('no-access');
      return;
    }

    const status = await sendToTab({ type: 'VCC_GET_STATUS' });
    if (!status?.ok) {
      show('needs-reload');
    } else {
      renderActive(!!status.active);
      show('ready');
    }
  }

  // permissions.request precisa ser chamado direto no clique (sem await antes),
  // senão o navegador não reconhece o gesto do usuário.
  function requestAccess(perms) {
    api.permissions.request(perms).then(granted => {
      if (granted) {
        api.tabs.reload(tab.id);
        window.close();
      } else {
        $('denied').hidden = false;
      }
    }, () => { $('denied').hidden = false; });
  }

  $('grant-site').addEventListener('click', () => requestAccess(siteOrigins));
  $('grant-all').addEventListener('click', () => requestAccess(ALL_SITES));
  $('grant-all-footer').addEventListener('click', () => {
    api.permissions.request(ALL_SITES).then(granted => { if (granted) refresh(); }, () => {});
  });

  $('reload').addEventListener('click', () => { api.tabs.reload(tab.id); window.close(); });

  $('open-panel').addEventListener('click', async () => {
    await sendToTab({ type: 'VCC_OPEN_PANEL' });
    window.close();
  });

  $('toggle-site').addEventListener('click', async () => {
    const on = $('toggle-site').getAttribute('aria-checked') !== 'true';
    const res = await sendToTab({ type: 'VCC_SET_SITE_ACTIVE', on });
    if (!res?.ok) { show('needs-reload'); return; }
    renderActive(!!res.active);
  });

  $('open-settings').addEventListener('click', () => {
    const r = api.runtime.openOptionsPage();
    if (r?.then) r.then(() => window.close(), () => {}); else window.close();
  });

  applyTheme();
  applyTexts();
  loadPrefs().then(refresh);
})();
