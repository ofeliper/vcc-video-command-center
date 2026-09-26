// Menu do ícone da extensão VCC.
// Mostra se o VCC tem acesso ao site atual, pede a permissão quando falta
// e abre o painel de controle (o mesmo do atalho H) na página.
(function () {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  const ALL_SITES = { origins: ['<all_urls>'] };
  const $ = id => document.getElementById(id);

  let tab = null;
  let siteOrigins = null; // { origins: ['*://host/*'] }

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
    const btn = $('toggle-site');
    btn.setAttribute('aria-checked', String(active));
    btn.classList.toggle('on', active);
    $('active-label').textContent = active ? 'ativos neste site' : 'desativados neste site';
  }

  async function renderAccessFooter() {
    const all = await api.permissions.contains(ALL_SITES);
    $('access-footer').hidden = false;
    $('access-summary').textContent = all ? 'Acesso: todos os sites' : 'Acesso: sites escolhidos';
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

  refresh();
})();
