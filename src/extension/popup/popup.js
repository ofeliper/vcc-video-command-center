// Menu do ícone da extensão VCC.
// Mostra se o VCC tem acesso ao site atual, pede a permissão quando falta,
// abre o painel de controle (o mesmo do atalho H) na página e troca o idioma.
(function () {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const I18N = globalThis.VCC_I18N;
  const ALL_SITES = { origins: ['<all_urls>'] };
  const $ = id => document.getElementById(id);

  let tab = null;
  let siteOrigins = null; // { origins: ['*://host/*'] }
  let langPref = 'auto';
  let t = I18N.translator(I18N.resolve(langPref));
  let lastActive = null;
  let lastAllSites = null;

  // ── Idioma ──
  function applyTexts() {
    document.documentElement.lang = I18N.resolve(langPref);
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)));
    if (lastActive !== null) renderActive(lastActive);
    if (lastAllSites !== null) renderAccessSummary(lastAllSites);

    const select = $('language');
    const options = ['auto', ...I18N.SUPPORTED].map(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = code === 'auto' ? t('lang.auto', { name: I18N.SHORT_NAMES[I18N.detect()] }) : I18N.LANGUAGE_NAMES[code];
      if (code !== 'auto') opt.lang = code;
      return opt;
    });
    select.replaceChildren(...options);
    select.value = langPref;
  }

  function setLanguagePref(pref) {
    langPref = I18N.SUPPORTED.includes(pref) ? pref : 'auto';
    t = I18N.translator(I18N.resolve(langPref));
    applyTexts();
  }

  async function loadLanguage() {
    try {
      const items = await api.storage.local.get(I18N.STORAGE_KEY);
      setLanguagePref(items?.[I18N.STORAGE_KEY] ?? 'auto');
    } catch {
      setLanguagePref('auto');
    }
  }

  // Salvar dispara storage.onChanged: as abas abertas trocam o idioma na hora.
  $('language').addEventListener('change', e => {
    setLanguagePref(e.target.value);
    api.storage.local.set({ [I18N.STORAGE_KEY]: langPref });
  });

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

  async function renderAccessFooter() {
    const all = await api.permissions.contains(ALL_SITES);
    $('access-footer').hidden = false;
    renderAccessSummary(all);
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
    renderAccessFooter();
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
    api.permissions.request(ALL_SITES).then(granted => { if (granted) renderAccessFooter(); }, () => {});
  });

  $('reload').addEventListener('click', () => { api.tabs.reload(tab.id); window.close(); });
  $('reload-after-off').addEventListener('click', () => { api.tabs.reload(tab.id); window.close(); });

  $('open-panel').addEventListener('click', async () => {
    await sendToTab({ type: 'VCC_OPEN_PANEL' });
    window.close();
  });

  $('toggle-site').addEventListener('click', async () => {
    const on = $('toggle-site').getAttribute('aria-checked') !== 'true';
    const res = await sendToTab({ type: 'VCC_SET_SITE_ACTIVE', on });
    if (!res?.ok) { show('needs-reload'); return; }
    renderActive(!!res.active);
    $('reload-hint').hidden = !res.needsReload;
  });

  applyTexts();
  loadLanguage().then(refresh);
})();
