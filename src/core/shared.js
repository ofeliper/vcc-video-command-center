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
    speedStep: 0.1,           // ×
    volumeStep: 5,            // %
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    language: 'auto',         // 'auto' | 'pt-BR' | 'en-US'
    barAuto: true,            // posicionar a barra automaticamente dentro do vídeo
    barAnchor: 'top-left',    // canto usado no posicionamento automático
    barLayout: 'single',      // 'single' (vídeo principal) | 'perVideo' (uma por vídeo)
  };

  const MODES = ['visible', 'alerts', 'hidden'];
  const THEMES_PREFS = ['auto', 'light', 'dark'];
  const BAR_ANCHORS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];

  // Configurações guardadas por site (vcc_<domínio>_<nome>).
  const SITE_KEYS = ['speed', 'volume', 'lastVolume', 'muted', 'cbOpacity', 'cpOpacity', 'cbPos', 'keys'];

  const FACTORY_KEYS = {
    slowDown:   'S',
    speedUp:    'D',
    resetSpeed: 'R',
    toggle2x:   'G',
    seekBack:   'Z',
    seekFwd:    'X',
    volumeDown: 'Q',
    volumeUp:   'E',
    toggleMute: 'M',
    toggleCB:   'V',
    toggleCP:   'H',
  };
  const KEY_ACTION_IDS = Object.keys(FACTORY_KEYS);

  const FORBIDDEN_KEYS = new Set([
    'Alt', 'Control', 'Shift', 'Meta', 'Escape', 'Tab',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Fn', 'CapsLock', 'NumLock', 'ScrollLock', 'Pause', 'PrintScreen',
  ]);

  // Converte um keydown no formato salvo ("S", "Ctrl+K", "Shift+ArrowUp").
  // Retorna null para teclas que não podem ser usadas.
  function bindingFromEvent(e) {
    if (FORBIDDEN_KEYS.has(e.key)) return null;
    let k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (e.ctrlKey) k = 'Ctrl+' + k;
    if (e.altKey) k = 'Alt+' + k;
    if (e.shiftKey && e.key.length > 1) k = 'Shift+' + k;
    return k;
  }

  function normalizeSite(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
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
    FACTORY_KEYS,
    KEY_ACTION_IDS,
    FORBIDDEN_KEYS,
    bindingFromEvent,
    normalizeSite,
    THEMES,
    resolveTheme,
    applyThemeVars,
    onSystemThemeChange,
  };
})(globalThis);
