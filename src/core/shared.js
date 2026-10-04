// Definições compartilhadas do VCC: padrões, atalhos de fábrica, temas e
// utilidades usadas pelo painel na página (vcc.js), pela página de
// configurações e pelo menu do ícone. Funciona igual na extensão e no
// Tampermonkey.
(function (root) {
  'use strict';

  const SPEED_MIN = 0.1;
  const SPEED_MAX = 16.0;

  // Padrões de fábrica das configurações globais (vcc_global_<nome>).
  const DEFAULTS = {
    cbMode: 'alerts',         // barra: 'visible' | 'alerts' | 'hidden'
    cbOpacity: 0.8,           // opacidade padrão da barra (0.1–1)
    cpOpacity: 1,             // opacidade padrão do painel (0.2–1)
    alertDuration: 700,       // ms que a barra fica visível no modo "alertas"
    seekStep: 10,             // segundos
    seekStepLong: 60,         // segundos do passo longo (Shift+Z / Shift+X)
    holdSpeed: 2,             // velocidade enquanto a tecla de acelerar fica pressionada
    speedStep: 0.1,           // ×
    volumeStep: 5,            // %
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    language: 'auto',         // 'auto' | 'pt-BR' | 'en-US'
    barAuto: true,            // posicionar a barra automaticamente dentro do vídeo
    barAnchor: 'top-left',    // canto usado no posicionamento automático
    barLayout: 'single',      // 'single' (vídeo principal) | 'perVideo' (uma por vídeo)
    barWheel: true,           // roda do mouse sobre a barra muda velocidade/volume
  };

  const MODES = ['visible', 'alerts', 'hidden'];
  const THEMES_PREFS = ['auto', 'light', 'dark'];
  const BAR_ANCHORS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];

  // Configurações guardadas por site (vcc_<domínio>_<nome>).
  //   rotation  — rotação lembrada (0/90/180/270); ausente = não lembrar
  //   resume    — true quando "retomar de onde parou" está ligado no site
  //   resumePos — posições por vídeo: { <chave do vídeo>: { t, at } }
  //   marks     — marcadores por vídeo: { <chave do vídeo>: { at, list: [{ t, b?, n }] } }
  const SITE_KEYS = ['speed', 'volume', 'lastVolume', 'muted', 'cbOpacity', 'cpOpacity', 'cbPos', 'keys',
    'rotation', 'resume', 'resumePos', 'marks'];
  // Dados por vídeo: mudam o tempo todo e não exigem redesenhar as telas.
  const VIDEO_DATA_KEYS = ['resumePos', 'marks'];

  // null = ação sem tecla de fábrica (atribua na página de configurações).
  const FACTORY_KEYS = {
    slowDown:     'S',
    speedUp:      'D',
    resetSpeed:   'R',
    toggle2x:     'G',
    holdSpeed:    null,
    seekBack:     'Z',
    seekFwd:      'X',
    seekBackLong: 'Shift+Z',
    seekFwdLong:  'Shift+X',
    frameBack:    ',',
    frameFwd:     '.',
    volumeDown:   'Q',
    volumeUp:     'E',
    toggleMute:   'M',
    toggleCB:     'V',
    toggleCP:     'H',
    rotateLeft:   null,
    rotateRight:  null,
    zoomIn:       null,
    zoomOut:      null,
    mirror:       null,
    snapshot:     null,
    markAdd:      null,
    markPrev:     null,
    markNext:     null,
  };
  const KEY_ACTION_IDS = Object.keys(FACTORY_KEYS);

  const FORBIDDEN_KEYS = new Set([
    'Alt', 'Control', 'Shift', 'Meta', 'Escape', 'Tab',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Fn', 'CapsLock', 'NumLock', 'ScrollLock', 'Pause', 'PrintScreen',
  ]);

  const isLetter = k => k.length === 1 && k.toLowerCase() !== k.toUpperCase();

  // Converte um keydown no formato salvo ("S", "Shift+Z", "Ctrl+K", "Shift+ArrowUp").
  // Retorna null para teclas que não podem ser usadas. Em símbolos ("?", ">")
  // o Shift já faz parte do caractere e não é gravado.
  function bindingFromEvent(e) {
    if (FORBIDDEN_KEYS.has(e.key)) return null;
    let k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (e.ctrlKey) k = 'Ctrl+' + k;
    if (e.altKey) k = 'Alt+' + k;
    if (e.shiftKey && (e.key.length > 1 || isLetter(e.key))) k = 'Shift+' + k;
    return k;
  }

  // O evento de teclado corresponde ao atalho salvo?
  function matchBinding(e, binding) {
    if (!binding) return false;
    const parts = binding.split('+');
    // "Ctrl++" termina em '+': a tecla é o próprio sinal de mais.
    const key = binding.endsWith('+') ? '+' : parts[parts.length - 1];
    const mods = binding.endsWith('+') ? parts.slice(0, -2) : parts.slice(0, -1);
    const shiftMatters = key.length > 1 || isLetter(key);
    return (
      (e.key === key || e.key.toUpperCase() === key.toUpperCase()) &&
      e.ctrlKey === mods.includes('Ctrl') && e.altKey === mods.includes('Alt') &&
      (!shiftMatters || e.shiftKey === mods.includes('Shift'))
    );
  }

  function normalizeSite(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }

  // ── Chave de um vídeo ──
  // Resumo curto (não reversível) do endereço da página, para guardar posição e
  // marcadores por vídeo sem manter uma lista dos endereços visitados.
  function hashString(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // ── Exportar / importar configurações ──
  const EXPORT_FORMAT = 'vcc-settings';

  function buildExport(entries, version) {
    const data = {};
    for (const [k, v] of Object.entries(entries)) if (k.startsWith('vcc_')) data[k] = v;
    return { format: EXPORT_FORMAT, version: version || '', exportedAt: new Date().toISOString(), data };
  }

  // Lê o texto de um arquivo exportado. Retorna { data } ou { error: true }.
  function parseImport(text) {
    try {
      const obj = JSON.parse(text);
      if (!obj || obj.format !== EXPORT_FORMAT || !obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return { error: true };
      const data = {};
      for (const [k, v] of Object.entries(obj.data)) {
        if (typeof k === 'string' && /^vcc_[\w.-]+$/.test(k) && v !== undefined && typeof v !== 'function') data[k] = v;
      }
      return { data };
    } catch { return { error: true }; }
  }

  function exportFileName() {
    return `vcc-settings-${new Date().toISOString().slice(0, 10)}.json`;
  }

  // ── Temas ──
  // Paletas com contraste de texto ≥ 4,5:1 (WCAG AA) sobre o fundo e as
  // superfícies. Conferido por tools/check.js.
  const THEMES = {
    dark: {
      'bg':            '#15181c',
      'bg-header':     '#0f1215',
      'surface':       '#20252b',
      'surface-hover': '#2b3139',
      'border':        '#3a414a',
      'border-strong': '#6a7380',
      'text':          '#eef0f3',
      'text-2':        '#c6cbd2',
      'text-3':        '#a3aab4',
      'accent':        '#5dcaa5',
      'accent-fill':   '#1d9e75',
      'accent-soft':   '#173a30',
      'on-accent':     '#06291d',
      'danger':        '#f29a98',
      'danger-soft':   '#3a1c1c',
      'warn':          '#f6c26b',
      'warn-soft':     '#382b12',
      'warn-border':   '#8a6420',
      'scroll-thumb':  '#6f7884',
      'scroll-track':  '#1d2127',
      'toggle-off':    '#56606b',
      'knob':          '#ffffff',
      'shadow':        '0 12px 40px rgba(0,0,0,.55)',
      'fade':          'rgba(21,24,28,0)',
      'scheme':        'dark',
    },
    light: {
      'bg':            '#ffffff',
      'bg-header':     '#f3f5f7',
      'surface':       '#eef1f4',
      'surface-hover': '#e1e6eb',
      'border':        '#c9cfd6',
      'border-strong': '#7f8995',
      'text':          '#15181c',
      'text-2':        '#3b424b',
      'text-3':        '#555e69',
      'accent':        '#08724f',
      'accent-fill':   '#0a7b57',
      'accent-soft':   '#dff3eb',
      'on-accent':     '#ffffff',
      'danger':        '#b3261e',
      'danger-soft':   '#fbe7e6',
      'warn':          '#7a4a00',
      'warn-soft':     '#fff3dc',
      'warn-border':   '#d9a441',
      'scroll-thumb':  '#6f7884',
      'scroll-track':  '#eef1f4',
      'toggle-off':    '#7a8490',
      'knob':          '#ffffff',
      'shadow':        '0 12px 40px rgba(20,30,40,.22)',
      'fade':          'rgba(255,255,255,0)',
      'scheme':        'light',
    },
  };

  function systemPrefersDark() {
    try { return root.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true; } catch { return true; }
  }

  // 'auto' segue o tema do sistema/navegador.
  function resolveTheme(pref) {
    return pref === 'light' || pref === 'dark' ? pref : (systemPrefersDark() ? 'dark' : 'light');
  }

  // Aplica as cores do tema como variáveis CSS (--vcc-<nome>) no elemento.
  function applyThemeVars(el, theme) {
    const vars = THEMES[theme] || THEMES.dark;
    for (const [name, value] of Object.entries(vars)) el.style.setProperty('--vcc-' + name, value);
    el.style.setProperty('color-scheme', vars.scheme);
    el.dataset.vccTheme = theme;
  }

  // Avisa quando o tema do sistema muda (para o modo 'auto').
  function onSystemThemeChange(cb) {
    try {
      const mq = root.matchMedia?.('(prefers-color-scheme: dark)');
      mq?.addEventListener?.('change', cb);
    } catch {}
  }

  root.VCC_SHARED = {
    SPEED_MIN,
    SPEED_MAX,
    DEFAULTS,
    MODES,
    THEMES_PREFS,
    BAR_ANCHORS,
    SITE_KEYS,
    VIDEO_DATA_KEYS,
    FACTORY_KEYS,
    KEY_ACTION_IDS,
    FORBIDDEN_KEYS,
    bindingFromEvent,
    matchBinding,
    hashString,
    buildExport,
    parseImport,
    exportFileName,
    normalizeSite,
    THEMES,
    resolveTheme,
    applyThemeVars,
    onSystemThemeChange,
  };
})(globalThis);
