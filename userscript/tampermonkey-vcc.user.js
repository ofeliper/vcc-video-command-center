// ==UserScript==
// @name         VCC — Video Command Center
// @namespace    https://github.com/vcc-userscript
// @version      0.5.0
// @description  Centro de controle local para players HTML5, voltado a uso pessoal e sem recursos de download, extração de stream ou contorno de DRM.
// @author       VCC
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/ofeliper/vcc-video-command-center/main/userscript/tampermonkey-vcc.user.js
// @downloadURL  https://raw.githubusercontent.com/ofeliper/vcc-video-command-center/main/userscript/tampermonkey-vcc.user.js
// ==/UserScript==

(function () {
  'use strict';

  /*
   * VCC is intended for personal control of HTML5 video elements already loaded
   * in the browser. It does not download media, extract streams, remove ads,
   * bypass paywalls, or attempt to defeat DRM/content protection.
   */
  const storageReady = globalThis.VCC_STORAGE_READY || Promise.resolve();

  // ─────────────────────────────────────────────
  // CONSTANTES
  // ─────────────────────────────────────────────
  const SPEED_MIN          = 0.1;
  const SPEED_MAX          = 16.0;
  const CB_OPACITY_DEFAULT = 0.30;
  const CP_OPACITY_DEFAULT = 0.75;
  const PRESET_SPEEDS      = [1.0, 1.25, 1.5, 1.75, 2.0, 3.0, 4.0];
  const SPEED_MAP          = {'1':1.0,'2':1.25,'3':1.5,'4':1.75,'5':2.0,'6':3.0,'7':4.0};

  const FORBIDDEN_KEYS = new Set([
    'Alt','Control','Shift','Meta','Escape','Tab',
    'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
    'Fn','CapsLock','NumLock','ScrollLock','Pause','PrintScreen',
  ]);

  // ─────────────────────────────────────────────
  // ATALHOS PADRÃO DE FÁBRICA
  // ─────────────────────────────────────────────
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

  const KEY_ACTIONS = [
    { id:'slowDown',   label:'Diminuir velocidade' },
    { id:'speedUp',    label:'Aumentar velocidade' },
    { id:'resetSpeed', label:'Resetar para 1×'    },
    { id:'toggle2x',   label:'Toggle 2×'          },
    { id:'seekBack',   label:'Retroceder'          },
    { id:'seekFwd',    label:'Avançar'             },
    { id:'volumeDown', label:'Diminuir volume'     },
    { id:'volumeUp',   label:'Aumentar volume'     },
    { id:'toggleMute', label:'Mudo / volume atual' },
    { id:'toggleCB',   label:'Modo do CB (cicla)'  },
    { id:'toggleCP',   label:'Abrir/fechar CP'     },
  ];

  // ─────────────────────────────────────────────
  // ESTADO
  // ─────────────────────────────────────────────
  const domain = location.hostname.replace(/^www\./, '');

  const state = {
    speed:         1.0,
    prevSpeed:     1.0,
    cbMode:        'visible',   // 'visible' | 'alerts' | 'hidden'
    cpVisible:     false,
    videos:        [],
    primaryVideo:  0,
    targetVideos:  new Set(),
    cbOpacity:     CB_OPACITY_DEFAULT,
    cpOpacity:     CP_OPACITY_DEFAULT,
    cbPos:         null,
    sessionStart:  Date.now(),
    speedHistory:  [],
    alertDuration: 500,
    seekStep:      10,
    speedStep:     0.1,
    volume:        1.0,
    lastVolume:    1.0,
    muted:         false,
    volumeStep:    5,
    videoControlsActive: false,
  };

  // ─────────────────────────────────────────────
  // GM STORAGE
  // ─────────────────────────────────────────────
  function sk(k) { return `vcc_${domain}_${k}`; }
  function gk(k) { return `vcc_global_${k}`; }

  function load(key, fb) {
    try { const v = GM_getValue(key); return v !== undefined ? v : fb; } catch { return fb; }
  }
  function save(key, v) { try { GM_setValue(key, v); } catch {} }
  function del(key)     { try { GM_deleteValue(key); } catch {} }

  function getAllVccKeys() {
    try { return GM_listValues().filter(k => k.startsWith('vcc_')); } catch { return []; }
  }

  function loadState() {
    state.cbOpacity     = load(sk('cbOpacity'),     CB_OPACITY_DEFAULT);
    state.cpOpacity     = load(sk('cpOpacity'),     CP_OPACITY_DEFAULT);
    state.cbPos         = load(sk('cbPos'),         null);
    state.speed         = load(sk('speed'),         1.0);
    state.cbMode        = load(gk('cbMode'),        'visible');
    state.alertDuration = load(gk('alertDuration'), 500);
    state.seekStep      = load(gk('seekStep'),      10);
    state.speedStep     = load(gk('speedStep'),     0.1);
    state.volume        = Math.max(0, Math.min(1, load(sk('volume'), 1.0)));
    state.lastVolume    = Math.max(0.01, Math.min(1, load(sk('lastVolume'), state.volume || 1.0)));
    state.muted         = load(sk('muted'), false);
    state.volumeStep    = load(gk('volumeStep'), 5);
  }

  function savePos(x, y) { state.cbPos = {x,y}; save(sk('cbPos'), {x,y}); }
  function saveSpeed()   { save(sk('speed'), state.speed); }
  function saveVolume()  {
    save(sk('volume'), state.volume);
    save(sk('lastVolume'), state.lastVolume);
    save(sk('muted'), state.muted);
  }

  // ─────────────────────────────────────────────
  // ATALHOS — carregados por domínio
  // ─────────────────────────────────────────────
  function loadKeys(scope) {
    const globalOverride = load(gk('keys'), {});
    const globalKeys     = { ...FACTORY_KEYS, ...globalOverride };
    if (scope === 'default') return globalKeys;
    const domainOverride = load(`vcc_${scope}_keys`, null);
    return domainOverride ? { ...globalKeys, ...domainOverride } : globalKeys;
  }

  let KEYS = loadKeys(domain);

  function matchKey(e, binding) {
    if (!binding) return false;
    const parts = binding.split('+');
    const key   = parts[parts.length - 1];
    const ctrl  = parts.includes('Ctrl');
    const alt   = parts.includes('Alt');
    const shift = parts.includes('Shift');
    return (
      (e.key === key || e.key.toUpperCase() === key.toUpperCase()) &&
      e.ctrlKey === ctrl && e.altKey === alt && e.shiftKey === shift
    );
  }

  // ─────────────────────────────────────────────
  // CONTROLE DE VÍDEO
  // ─────────────────────────────────────────────
  function clampSpeed(v) {
    return Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round(v * 100) / 100));
  }

  function applySpeed(v) {
    state.speed = clampSpeed(v);
    state.targetVideos.forEach(i => {
      const vid = state.videos[i];
      if (vid && vid.isConnected) {
        try { vid.playbackRate = state.speed; } catch {}
      }
    });
    saveSpeed();
    updateCBSpeed();
    updateCPSpeed();
    updateETA();
  }

  function applySeek(seconds) {
    state.targetVideos.forEach(i => {
      const vid = state.videos[i];
      if (!vid || !vid.isConnected) return;
      try {
        const dur = vid.duration || 0;
        vid.currentTime = Math.max(0, isFinite(dur) ? Math.min(dur, vid.currentTime + seconds) : vid.currentTime + seconds);
      } catch {}
    });
    flashCB(seconds > 0 ? `+${seconds}s` : `${seconds}s`, true);
  }

  function applyVolume(value, unmute = true) {
    state.volume = Math.max(0, Math.min(1, Math.round(value * 100) / 100));
    if (state.volume > 0) state.lastVolume = state.volume;
    if (unmute) state.muted = false;
    state.targetVideos.forEach(i => {
      const vid = state.videos[i];
      if (!vid || !vid.isConnected) return;
      try { vid.volume = state.volume; vid.muted = state.muted; } catch {}
    });
    saveVolume();
    updateCBVolume();
    updateCPVolume();
    flashCB(state.muted ? 'MUDO' : `volume ${Math.round(state.volume * 100)}%`, true);
  }

  function changeVolume(percent) {
    applyVolume(state.volume + percent / 100, true);
  }

  function toggleMute() {
    if (!state.muted && state.volume > 0) state.lastVolume = state.volume;
    if (state.muted || state.volume === 0) {
      state.volume = state.lastVolume || 1.0;
      state.muted = false;
    } else {
      state.muted = true;
    }
    state.targetVideos.forEach(i => {
      const vid = state.videos[i];
      if (!vid || !vid.isConnected) return;
      try { vid.volume = state.volume; vid.muted = state.muted; } catch {}
    });
    saveVolume();
    updateCBVolume();
    updateCPVolume();
    flashCB(state.muted ? 'MUDO' : `volume ${Math.round(state.volume * 100)}%`, true);
  }

  function togglePrimaryPlayback() {
    const vid = state.videos[state.primaryVideo];
    if (!vid || !vid.isConnected) return;
    const shouldPlay = vid.paused || vid.ended;
    try {
      if (shouldPlay) {
        const playResult = vid.play();
        if (playResult?.catch) playResult.catch(() => {});
      } else {
        vid.pause();
      }
    } catch {}
    flashCB(shouldPlay ? '▶ play' : '⏸ pause', true);
    setTimeout(updateVideoList, 80);
  }

  function setSpeed(v)    { applySpeed(v); }
  function changeSpeed(d) { applySpeed(state.speed + d); }
  function resetSpeed()   { applySpeed(1.0); }

  function toggle2x() {
    if (Math.abs(state.speed - 2.0) < 0.01) applySpeed(state.prevSpeed === 2.0 ? 1.0 : state.prevSpeed);
    else { state.prevSpeed = state.speed; applySpeed(2.0); }
  }

  // ─────────────────────────────────────────────
  // DETECÇÃO DE VÍDEOS — com suporte a Shadow DOM
  //
  // Problema: players modernos podem encapsular o player dentro de Shadow DOM
  // ou múltiplos iframes. document.querySelectorAll('video')
  // não atravessa Shadow DOM, então o script nunca encontrava
  // o elemento <video> nesses sites.
  //
  // Solução: varredura recursiva que desce em cada shadowRoot
  // encontrado na árvore do DOM.
  // ─────────────────────────────────────────────

  /**
   * Coleta todos os elementos <video> no documento,
   * descendo recursivamente em shadowRoots.
   */
  function queryAllVideos(root) {
    const found = [];
    try {
      root.querySelectorAll('video').forEach(v => found.push(v));
      root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) found.push(...queryAllVideos(el.shadowRoot));
      });
    } catch {}
    return found;
  }

  /**
   * Registra um elemento <video> no estado, configurando
   * playbackRate e listeners de ciclo de vida.
   */
  function registerVideo(vid) {
    if (state.videos.includes(vid)) return;
    const idx = state.videos.length;
    state.videos.push(vid);
    state.targetVideos.add(idx);

    // Aplica velocidade imediatamente, e também quando
    // o vídeo estiver pronto (readyState pode ser 0 ainda)
    const applyWhenReady = () => {
      try {
        vid.playbackRate = state.speed;
        vid.volume = state.volume;
        vid.muted = state.muted;
      } catch {}
    };
    applyWhenReady();
    vid.addEventListener('loadedmetadata', applyWhenReady);

    // Reaplica quando o src muda (troca de mídia, playlists ou próximo item)
    vid.addEventListener('emptied', () => {
      vid.addEventListener('loadedmetadata', function onMeta() {
        try { vid.playbackRate = state.speed; } catch {}
        updateCBSpeed();
        updateCPSpeed();
        vid.removeEventListener('loadedmetadata', onMeta);
      });
    });

    // Alguns players resetam playbackRate ao dar play
    vid.addEventListener('play', () => {
      try {
        if (Math.abs(vid.playbackRate - state.speed) > 0.01) {
          vid.playbackRate = state.speed;
        }
      } catch {}
    });

    // Atualiza a lista no CP se estiver aberto
    updateVideoList();
  }

  function scanVideos() {
    queryAllVideos(document).forEach(registerVideo);
  }

  /**
   * MutationObserver que monitora adições de nós e
   * também a criação de novos shadowRoots (para players
   * que montam o DOM dinamicamente após carregamento).
   */
  function startObserver() {
    const obs = new MutationObserver(mutations => {
      let needsScan = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          // Novo <video> direto
          if (node.tagName === 'VIDEO') { needsScan = true; break; }
          // Pode conter vídeos ou shadowRoots internamente
          if (node.querySelector && (node.querySelector('video') || node.shadowRoot)) {
            needsScan = true; break;
          }
        }
      }
      if (needsScan) scanVideos();
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });

    // Polling leve como fallback para Shadow DOM que o MutationObserver
    // não captura (alguns players criam shadowRoot sem adicionar nós observáveis)
    let pollCount = 0;
    const poll = setInterval(() => {
      scanVideos();
      pollCount++;
      // Após 2 minutos de polling agressivo, espaça para poupar CPU
      if (pollCount > 24) clearInterval(poll);
    }, 5000);
  }

  // ─────────────────────────────────────────────
  // KEYBOARD LISTENER
  // ─────────────────────────────────────────────
  function onKeyDown(e) {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (['input','textarea','select'].includes(tag) || document.activeElement?.isContentEditable) return;

    // O painel está sempre disponível, inclusive em sites ainda não ativados.
    if (matchKey(e, KEYS.toggleCP)) { e.preventDefault(); toggleCPVisibility(); return; }
    if (!state.videoControlsActive) return;

    // Numerais 1-7 → presets
    if (/^[1-7]$/.test(e.key) && !e.ctrlKey && !e.altKey) {
      const s = SPEED_MAP[e.key];
      if (s !== undefined) { e.preventDefault(); setSpeed(s); return; }
    }

    // Zero → play/pause do vídeo principal
    if (e.key === '0' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat) {
      e.preventDefault(); togglePrimaryPlayback(); return;
    }

    if (matchKey(e, KEYS.slowDown))   { e.preventDefault(); changeSpeed(-state.speedStep); return; }
    if (matchKey(e, KEYS.speedUp))    { e.preventDefault(); changeSpeed(+state.speedStep); return; }
    if (matchKey(e, KEYS.resetSpeed)) { e.preventDefault(); resetSpeed();                  return; }
    if (matchKey(e, KEYS.toggle2x))   { e.preventDefault(); toggle2x();                    return; }
    if (matchKey(e, KEYS.seekBack))   { e.preventDefault(); applySeek(-state.seekStep);    return; }
    if (matchKey(e, KEYS.seekFwd))    { e.preventDefault(); applySeek(+state.seekStep);    return; }
    if (matchKey(e, KEYS.volumeDown)) { e.preventDefault(); changeVolume(-state.volumeStep); return; }
    if (matchKey(e, KEYS.volumeUp))   { e.preventDefault(); changeVolume(+state.volumeStep); return; }
    if (matchKey(e, KEYS.toggleMute)) { e.preventDefault(); toggleMute();                    return; }
    if (matchKey(e, KEYS.toggleCB))   { e.preventDefault(); cycleCBMode();                 return; }
  }

  document.addEventListener('keydown', onKeyDown, true);

  // ─────────────────────────────────────────────
  // ESTILOS
  // ─────────────────────────────────────────────
  function injectStyles() {
    const css = `
      #vcc-cb {
        position: fixed; z-index: 2147483647;
        top: 12px; left: 12px;
        display: flex; align-items: center;
        gap: 3px; padding: 4px 7px;
        background: rgba(0,0,0,0.45);
        border: 0.5px solid rgba(255,255,255,0.13);
        border-radius: 6px;
        font-family: 'JetBrains Mono','Fira Mono','Courier New',monospace;
        font-size: 11px; line-height: 1;
        user-select: none; transition: opacity 0.2s;
        box-sizing: border-box;
      }
      #vcc-cb * { box-sizing: border-box; }

      #vcc-cb button {
        background: none; border: none;
        color: rgba(255,255,255,0.55); font-size: 11px; line-height: 1;
        cursor: pointer; width: 18px; height: 18px;
        border-radius: 3px;
        display: flex; align-items: center; justify-content: center;
        padding: 0; margin: 0;
        font-family: 'JetBrains Mono',monospace;
        transition: background 0.1s, color 0.1s; flex-shrink: 0;
      }
      #vcc-cb button:hover  { background: rgba(255,255,255,0.1); color: #fff; }
      #vcc-cb button:active { transform: scale(0.9); }

      #vcc-cb-speed {
        color: rgba(255,255,255,0.85); font-size: 11px; font-weight: 500;
        min-width: 32px; height: 18px; line-height: 18px;
        text-align: center; cursor: grab; padding: 0 2px; border-radius: 3px;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.1s; flex-shrink: 0;
      }
      #vcc-cb-speed:hover  { background: rgba(255,255,255,0.07); }
      #vcc-cb-speed:active { cursor: grabbing; }

      #vcc-cb-volume {
        color: rgba(255,255,255,0.75); font-size: 10px; min-width: 34px;
        height: 18px; line-height: 18px; text-align: center; cursor: pointer;
        padding: 0 2px; border-radius: 3px; flex-shrink: 0;
      }
      #vcc-cb-volume:hover { background: rgba(255,255,255,0.07); color: #fff; }

      #vcc-cb-div, #vcc-cb-vol-div {
        width: 0.5px; height: 12px; background: rgba(255,255,255,0.13);
        margin: 0 1px; flex-shrink: 0; align-self: center;
      }

      #vcc-cb-cfg { color: rgba(255,255,255,0.3) !important; font-size: 13px !important; }
      #vcc-cb-cfg:hover { color: rgba(255,255,255,0.8) !important; }

      #vcc-cb.vcc-flash-visible { display: flex !important; opacity: 0.75 !important; }

      #vcc-cb-mode-badge {
        font-size: 8px; font-family: monospace; color: rgba(255,255,255,0.35);
        position: absolute; bottom: -1px; right: -1px;
        background: rgba(0,0,0,0.6); border-radius: 2px; padding: 0 2px;
        pointer-events: none; letter-spacing: .03em;
      }

      /* ── CP ── */
      #vcc-cp {
        position: fixed; z-index: 2147483646;
        top: 50%; left: 50%; transform: translate(-50%,-50%);
        width: min(500px,92vw); max-height: 82vh;
        display: flex; flex-direction: column;
        background: rgba(8,8,8,0.92);
        border: 0.5px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        font-size: 13px; color: rgba(255,255,255,0.72);
        box-sizing: border-box;
      }
      #vcc-cp * { box-sizing: border-box; }

      #vcc-cp-bar {
        flex-shrink: 0; padding: 10px 16px;
        display: flex; align-items: center; justify-content: space-between;
        border-bottom: 0.5px solid rgba(255,255,255,0.08);
        cursor: grab; border-radius: 12px 12px 0 0;
        background: rgba(6,6,6,0.98);
      }
      #vcc-cp-bar:active { cursor: grabbing; }

      #vcc-cp-scroll {
        overflow-y: auto; flex: 1;
        scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
      }
      #vcc-cp-scroll::-webkit-scrollbar { width: 4px; }
      #vcc-cp-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

      #vcc-cp-title { font-family: 'JetBrains Mono',monospace; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.82); letter-spacing: .05em; }
      #vcc-cp-domain { font-size: 10px; color: rgba(255,255,255,0.22); font-family: monospace; margin-right: 8px; }
      #vcc-cp-close { background: none; border: none; color: rgba(255,255,255,0.3); font-size: 13px; cursor: pointer; width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all .12s; }
      #vcc-cp-close:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.88); }

      .vcc-acc { border-bottom: .5px solid rgba(255,255,255,0.06); }
      .vcc-acc:last-child { border-bottom: none; }
      .vcc-acc-hdr { width: 100%; background: none; border: none; padding: 9px 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; color: rgba(255,255,255,0.65); font-size: 12px; font-weight: 500; font-family: inherit; text-align: left; transition: background .12s; }
      .vcc-acc-hdr:hover { background: rgba(255,255,255,0.03); }
      .vcc-acc-hdr-left { display: flex; align-items: center; gap: 8px; }
      .vcc-acc-icon { font-size: 12px; width: 16px; text-align: center; color: rgba(255,255,255,0.35); }
      .vcc-arr { font-size: 10px; color: rgba(255,255,255,0.25); transition: transform .18s; display: inline-block; }
      .vcc-arr.open { transform: rotate(90deg); }
      .vcc-acc-body { display: none; padding: 2px 16px 12px; }
      .vcc-acc-body.open { display: block; }

      .vcc-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: .5px solid rgba(255,255,255,0.04); }
      .vcc-row:last-child { border-bottom: none; }
      .vcc-row-label { font-size: 12px; color: rgba(255,255,255,0.62); }
      .vcc-row-sub   { font-size: 10px; color: rgba(255,255,255,0.28); margin-top: 1px; }

      .vcc-tog { width: 30px; height: 17px; border-radius: 9px; background: rgba(255,255,255,0.14); position: relative; cursor: pointer; transition: background .18s; flex-shrink: 0; }
      .vcc-tog.on { background: #1D9E75; }
      .vcc-tog-t  { position: absolute; width: 13px; height: 13px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: left .16s; }
      .vcc-tog.on .vcc-tog-t { left: 15px; }

      .vcc-spd-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
      .vcc-spd-btn { background: rgba(255,255,255,0.07); border: .5px solid rgba(255,255,255,0.13); border-radius: 5px; color: rgba(255,255,255,0.65); font-size: 13px; width: 26px; height: 26px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; flex-shrink: 0; font-family: inherit; }
      .vcc-spd-btn:hover { background: rgba(255,255,255,0.14); color: #fff; }
      .vcc-spd-btn.sm { font-size: 11px; width: auto; padding: 0 8px; }

      .vcc-spd-in { background: rgba(255,255,255,0.08); border: .5px solid rgba(255,255,255,0.15); border-radius: 5px; color: rgba(255,255,255,0.9); font-family: 'JetBrains Mono',monospace; font-size: 14px; font-weight: 500; width: 86px; text-align: center; padding: 3px 8px; outline: none; }
      .vcc-spd-in:focus { border-color: rgba(255,255,255,0.35); }

      .vcc-eta { font-size: 11px; color: rgba(255,255,255,0.42); line-height: 1.5; padding: 6px 8px; background: rgba(255,255,255,0.05); border-radius: 5px; border: .5px solid rgba(255,255,255,0.07); }
      .vcc-eta strong { color: rgba(255,255,255,0.82); font-weight: 500; }

      .vcc-preset-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; margin-bottom: 8px; }
      .vcc-pc { background: rgba(255,255,255,0.06); border: .5px solid rgba(255,255,255,0.1); border-radius: 5px; padding: 5px 4px; text-align: center; font-family: 'JetBrains Mono',monospace; font-size: 11px; color: rgba(255,255,255,0.55); cursor: pointer; transition: all .12s; }
      .vcc-pc:hover { background: rgba(255,255,255,0.11); color: #fff; }
      .vcc-pc.sel   { background: rgba(29,158,117,0.2); border-color: #1D9E75; color: #5DCAA5; }

      .vcc-slr { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
      .vcc-slr label { font-size: 10px; color: rgba(255,255,255,0.35); min-width: 72px; }
      .vcc-slr input[type=range] { flex: 1; accent-color: #1D9E75; }
      .vcc-slv { font-size: 10px; font-family: monospace; color: rgba(255,255,255,0.5); min-width: 34px; text-align: right; }

      .vcc-loop-status { font-size: 10px; color: rgba(255,255,255,0.38); background: rgba(255,255,255,0.04); border: .5px solid rgba(255,255,255,0.07); border-radius: 5px; padding: 5px 8px; margin-top: 6px; line-height: 1.6; }
      .vcc-loop-status .pt   { color: #5DCAA5; font-family: monospace; font-weight: 500; }
      .vcc-loop-status .none { color: rgba(255,255,255,0.24); font-style: italic; }

      .vcc-abt { background: rgba(255,255,255,0.06); border: .5px solid rgba(255,255,255,0.1); border-radius: 5px; color: rgba(255,255,255,0.58); font-size: 11px; padding: 5px 9px; cursor: pointer; font-family: inherit; transition: all .12s; display: inline-flex; align-items: center; gap: 4px; }
      .vcc-abt:hover { background: rgba(255,255,255,0.11); color: #fff; }
      .vcc-abt:disabled { opacity: 0.3; cursor: not-allowed; pointer-events: none; }
      .vcc-abts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

      .vcc-vrow { display: flex; align-items: center; gap: 6px; padding: 7px 0; border-bottom: .5px solid rgba(255,255,255,0.04); }
      .vcc-vrow:last-child { border-bottom: none; }
      .vcc-vthumb { width: 32px; height: 22px; background: rgba(255,255,255,0.07); border: .5px solid transparent; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: rgba(255,255,255,0.3); flex-shrink: 0; font-family: monospace; cursor: pointer; }
      .vcc-vthumb:hover { background: rgba(255,255,255,0.12); color: #fff; }
      .vcc-vthumb.primary { background: rgba(29,158,117,0.2); border-color: #1D9E75; color: #5DCAA5; }
      .vcc-vname  { font-size: 11px; color: rgba(255,255,255,0.62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .vcc-vmeta  { font-size: 10px; color: rgba(255,255,255,0.28); }
      .vcc-primary-badge { font-size: 9px; background: rgba(29,158,117,0.2); color: #5DCAA5; border-radius: 3px; padding: 1px 5px; font-family: monospace; margin-left: 4px; vertical-align: middle; }
      .vcc-chk    { width: 14px; height: 14px; border: .5px solid rgba(255,255,255,0.2); border-radius: 3px; background: rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 9px; color: #5DCAA5; transition: all .12s; }
      .vcc-chk.on { background: rgba(29,158,117,0.22); border-color: #1D9E75; }
      .vcc-vid-actions { display: flex; gap: 2px; flex-shrink: 0; }
      .vcc-vid-btn { background: rgba(255,255,255,0.05); border: .5px solid rgba(255,255,255,0.09); border-radius: 3px; color: rgba(255,255,255,0.45); font-size: 10px; width: 22px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: monospace; transition: all .1s; padding: 0; }
      .vcc-vid-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
      .vcc-vid-btn.danger:hover { background: rgba(226,75,74,0.2); color: #F09595; border-color: rgba(226,75,74,0.4); }

      .vcc-kbd-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: .5px solid rgba(255,255,255,0.04); }
      .vcc-kbd-row:last-child { border-bottom: none; }
      .vcc-kbd-action { font-size: 11px; color: rgba(255,255,255,0.62); flex: 1; }
      .vcc-kbd-key { font-family: 'JetBrains Mono',monospace; font-size: 10px; background: rgba(255,255,255,0.08); border: .5px solid rgba(255,255,255,0.15); border-radius: 3px; padding: 2px 6px; color: rgba(255,255,255,0.62); cursor: pointer; min-width: 28px; text-align: center; transition: all .12s; user-select: none; }
      .vcc-kbd-key:hover { background: rgba(255,255,255,0.14); color: #fff; }
      .vcc-kbd-key.capturing { background: rgba(29,158,117,0.25); border-color: #1D9E75; color: #5DCAA5; animation: vcc-blink .6s infinite; }
      .vcc-kbd-key.error { background: rgba(226,75,74,0.2); border-color: #E24B4A; color: #F09595; }
      @keyframes vcc-blink { 0%,100%{opacity:1}50%{opacity:.4} }

      .vcc-kbd-clear { background: none; border: none; color: rgba(255,255,255,0.2); font-size: 10px; cursor: pointer; padding: 2px 4px; border-radius: 3px; margin-left: 3px; transition: all .12s; line-height: 1; }
      .vcc-kbd-clear:hover { color: rgba(226,75,74,0.8); background: rgba(226,75,74,0.1); }

      .vcc-scope-tabs { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
      .vcc-scope-tab { background: rgba(255,255,255,0.05); border: .5px solid rgba(255,255,255,0.1); border-radius: 4px; color: rgba(255,255,255,0.42); font-size: 10px; padding: 4px 9px; cursor: pointer; font-family: inherit; transition: all .12s; }
      .vcc-scope-tab:hover { color: rgba(255,255,255,0.72); }
      .vcc-scope-tab.active { background: rgba(29,158,117,0.18); border-color: #1D9E75; color: #5DCAA5; }

      .vcc-site-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: .5px solid rgba(255,255,255,0.04); }
      .vcc-site-row:last-child { border-bottom: none; }
      .vcc-site-name { font-size: 12px; color: rgba(255,255,255,0.62); }

      .vcc-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; }
      .vcc-sc { background: rgba(255,255,255,0.07); border: .5px solid rgba(255,255,255,0.09); border-radius: 6px; padding: 7px 9px; }
      .vcc-sv { font-size: 17px; font-weight: 500; color: rgba(255,255,255,0.9); font-family: monospace; }
      .vcc-sl { font-size: 10px; color: rgba(255,255,255,0.38); margin-top: 1px; }

      .vcc-ci   { display: flex; align-items: flex-start; gap: 7px; padding: 5px 0; border-bottom: .5px solid rgba(255,255,255,0.04); }
      .vcc-ci:last-child { border-bottom: none; }
      .vcc-cdot { width: 6px; height: 6px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
      .vcc-ct   { font-size: 11px; color: rgba(255,255,255,0.55); line-height: 1.5; }
      .vcc-ctag { font-size: 9px; font-family: monospace; padding: 1px 5px; border-radius: 3px; }
      .vcc-ok   { background: rgba(29,158,117,0.2);  color: #5DCAA5; }
      .vcc-warn { background: rgba(186,117,23,0.2);  color: #EF9F27; }
      .vcc-err  { background: rgba(226,75,74,0.18);  color: #E24B4A; }

      .vcc-sub-title { font-size: 10px; color: rgba(255,255,255,0.32); margin-bottom: 5px; letter-spacing: .04em; }
      .vcc-hint { font-size: 10px; color: rgba(255,255,255,0.26); margin-top: 6px; line-height: 1.5; }
      .vcc-danger-zone { border: .5px solid rgba(226,75,74,0.25); border-radius: 6px; padding: 10px 12px; margin-top: 8px; }
      .vcc-danger-title { font-size: 11px; color: rgba(226,75,74,0.82); margin-bottom: 8px; font-weight: 500; }

      .vcc-site-warning { margin: 12px 16px 8px; padding: 12px; border: 1px solid rgba(239,159,39,0.55); border-radius: 7px; background: rgba(186,117,23,0.16); color: rgba(255,255,255,0.78); }
      .vcc-site-warning-title { color: #FAC775; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
      .vcc-site-warning-text { color: rgba(255,255,255,0.52); font-size: 10px; line-height: 1.5; margin-bottom: 9px; }
      .vcc-site-warning .vcc-activate-site { background: #BA7517; border: 1px solid #EF9F27; color: #fff; border-radius: 5px; padding: 6px 10px; font: 600 11px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; cursor: pointer; }
      .vcc-site-warning .vcc-activate-site:hover { background: #D98B1D; }
      .vcc-video-feature.vcc-disabled > .vcc-acc-hdr { color: rgba(255,255,255,0.28); }
      .vcc-video-feature.vcc-disabled > .vcc-acc-hdr::after { content: 'site inativo'; margin-left: auto; margin-right: 8px; color: #EF9F27; font: 9px monospace; }
      .vcc-video-feature.vcc-disabled > .vcc-acc-body { opacity: .35; pointer-events: none; filter: grayscale(1); }
      .vcc-video-control.vcc-disabled { opacity: .35; pointer-events: none; filter: grayscale(1); }

      /* Inline number input no CP */
      .vcc-num-in { background: rgba(255,255,255,0.08); border: .5px solid rgba(255,255,255,0.15); border-radius: 5px; color: rgba(255,255,255,0.9); font-family: monospace; font-size: 12px; text-align: center; padding: 3px 6px; outline: none; width: 68px; }
      .vcc-num-in:focus { border-color: rgba(255,255,255,0.35); }
    `;
    const s = document.createElement('style');
    s.id = 'vcc-styles'; s.textContent = css;
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────
  // CONTROL BOX
  // ─────────────────────────────────────────────
  let cbEl = null;
  let flashTimer = null;
  let flashHideTimer = null;

  function buildCB() {
    cbEl = document.createElement('div');
    cbEl.id = 'vcc-cb';
    cbEl.innerHTML = `
      <button id="vcc-cb-back" title="Z — retroceder">«</button>
      <button id="vcc-cb-slow" title="S — velocidade −">−</button>
      <span   id="vcc-cb-speed" title="Arraste para mover">1.0×</span>
      <button id="vcc-cb-fast" title="D — velocidade +">+</button>
      <button id="vcc-cb-fwd"  title="X — avançar">»</button>
      <div id="vcc-cb-div"></div>
      <button id="vcc-cb-vol-down" title="Q — volume −">🔉</button>
      <span id="vcc-cb-volume" title="M — alternar mudo">100%</span>
      <button id="vcc-cb-vol-up" title="E — volume +">🔊</button>
      <div id="vcc-cb-vol-div"></div>
      <button id="vcc-cb-cfg"  title="H — painel">≡</button>
      <span id="vcc-cb-mode-badge"></span>
    `;

    // Posição salva por domínio
    const x = state.cbPos?.x ?? 12;
    const y = state.cbPos?.y ?? 12;
    cbEl.style.cssText = `
      all: initial !important;
      position: fixed !important;
      z-index: 2147483647 !important;
      left: ${x}px !important;
      top:  ${y}px !important;
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
      padding: 4px 7px !important;
      background: rgba(0,0,0,0.45) !important;
      border: 0.5px solid rgba(255,255,255,0.13) !important;
      border-radius: 6px !important;
      font-family: 'JetBrains Mono','Fira Mono','Courier New',monospace !important;
      font-size: 11px !important;
      line-height: 1 !important;
      user-select: none !important;
      opacity: ${state.cbOpacity} !important;
      box-sizing: border-box !important;
      pointer-events: auto !important;
    `;

    // Anexa ao <html> para escapar de qualquer overflow/clip no <body>
    document.documentElement.appendChild(cbEl);

    applyCBMode();

    cbEl.querySelector('#vcc-cb-back').addEventListener('click', () => applySeek(-state.seekStep));
    cbEl.querySelector('#vcc-cb-slow').addEventListener('click', () => changeSpeed(-state.speedStep));
    cbEl.querySelector('#vcc-cb-fast').addEventListener('click', () => changeSpeed(+state.speedStep));
    cbEl.querySelector('#vcc-cb-fwd' ).addEventListener('click', () => applySeek(+state.seekStep));
    cbEl.querySelector('#vcc-cb-vol-down').addEventListener('click', () => changeVolume(-state.volumeStep));
    cbEl.querySelector('#vcc-cb-volume').addEventListener('click', toggleMute);
    cbEl.querySelector('#vcc-cb-vol-up').addEventListener('click', () => changeVolume(+state.volumeStep));
    cbEl.querySelector('#vcc-cb-cfg' ).addEventListener('click', toggleCPVisibility);

    makeDraggable(cbEl, cbEl.querySelector('#vcc-cb-speed'), (x, y) => savePos(x, y));
    updateCBSpeed();
    updateCBVolume();
  }

  function updateCBSpeed() {
    if (!cbEl) return;
    const el = cbEl.querySelector('#vcc-cb-speed');
    if (el) el.textContent = fmtSpeed(state.speed) + '×';
  }

  // Três modos: visible → alerts → hidden → visible
  function cycleCBMode() {
    const modes = ['visible', 'alerts', 'hidden'];
    state.cbMode = modes[(modes.indexOf(state.cbMode) + 1) % 3];
    save(gk('cbMode'), state.cbMode);
    applyCBMode();
    updateCPCBModeBtn();
    if (state.cbMode !== 'visible') flashCB(`modo: ${state.cbMode}`, false);
  }

  function applyCBMode() {
    if (!cbEl) return;
    const badge = cbEl.querySelector('#vcc-cb-mode-badge');
    if (state.cbMode === 'visible') {
      cbEl.style.setProperty('display', 'flex', 'important');
      cbEl.style.setProperty('opacity', state.cbOpacity, 'important');
      if (badge) badge.textContent = '';
    } else {
      cbEl.style.setProperty('display', 'none', 'important');
      if (badge) badge.textContent = state.cbMode === 'alerts' ? 'alerta' : 'oculto';
    }
  }

  function flashCB(text, isAction = false) {
    if (!cbEl) return;
    const el = cbEl.querySelector('#vcc-cb-speed');
    if (!el) return;

    const wasHidden = state.cbMode !== 'visible';
    if (wasHidden) {
      cbEl.style.setProperty('display', 'flex', 'important');
      cbEl.style.setProperty('opacity', '0.75', 'important');
    }
    if (isAction) el.textContent = text;

    clearTimeout(flashTimer);
    clearTimeout(flashHideTimer);

    const dur = state.cbMode === 'alerts' ? state.alertDuration : 650;
    flashTimer = setTimeout(() => {
      el.textContent = fmtSpeed(state.speed) + '×';
      if (wasHidden) {
        flashHideTimer = setTimeout(() => applyCBMode(), 150);
      }
    }, dur);
  }

  // ─────────────────────────────────────────────
  // DRAG & DROP
  // ─────────────────────────────────────────────
  function makeDraggable(el, handle, onDrop) {
    let startX, startY, origX, origY, dragging = false;
    handle.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      dragging = true; startX = e.clientX; startY = e.clientY;
      const r = el.getBoundingClientRect(); origX = r.left; origY = r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  origX + e.clientX - startX));
      const ny = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, origY + e.clientY - startY));
      el.style.left = nx + 'px'; el.style.top = ny + 'px'; el.style.transform = 'none';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return; dragging = false;
      const r = el.getBoundingClientRect(); if (onDrop) onDrop(r.left, r.top);
    });
  }

  // ─────────────────────────────────────────────
  // CONTROL PANEL
  // ─────────────────────────────────────────────
  let cpEl = null, capturingKey = null, currentScope = 'default';

  function buildCP() {
    cpEl = document.createElement('div');
    cpEl.id = 'vcc-cp';
    // Opacity e display controlados por JS — não pelo CSS do site
    cpEl.style.setProperty('opacity', state.cpOpacity, 'important');
    cpEl.style.setProperty('display', state.cpVisible ? 'flex' : 'none', 'important');

    cpEl.innerHTML = `
      <div id="vcc-cp-bar">
        <span id="vcc-cp-title">VCC — Video Command Center</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span id="vcc-cp-domain">${domain}</span>
          <button id="vcc-cp-close">✕</button>
        </div>
      </div>
      <div id="vcc-cp-scroll"><div id="vcc-site-status"></div><div id="vcc-cp-content"></div></div>
    `;

    // Mesmo root que o CB: escapa overflow/clip do <body>
    document.documentElement.appendChild(cpEl);
    cpEl.querySelector('#vcc-cp-close').addEventListener('click', toggleCPVisibility);
    makeDraggable(cpEl, cpEl.querySelector('#vcc-cp-bar'), null);

    buildCPContent();
    updateCPSpeed(); updateETA(); buildVideoList(); renderCompatibility();
  }

  // ── helpers de template ──
  function acc(id, icon, label, content, open = false, videoFeature = false) {
    const featureClass = videoFeature ? ` vcc-video-feature${state.videoControlsActive ? '' : ' vcc-disabled'}` : '';
    return `<div class="vcc-acc${featureClass}">
      <button class="vcc-acc-hdr" data-acc="${id}">
        <span class="vcc-acc-hdr-left"><span class="vcc-acc-icon">${icon}</span>${label}</span>
        <span class="vcc-arr${open ? ' open' : ''}" id="vcc-arr-${id}">›</span>
      </button>
      <div class="vcc-acc-body${open ? ' open' : ''}" id="vcc-body-${id}">${content}</div>
    </div>`;
  }

  function tog(id, on, label, sub = '', videoControl = false) {
    const controlClass = videoControl ? ` vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}` : '';
    return `<div class="vcc-row${controlClass}">
      <div><div class="vcc-row-label">${label}</div>${sub ? `<div class="vcc-row-sub">${sub}</div>` : ''}</div>
      <div class="vcc-tog${on ? ' on' : ''}" id="vcc-tog-${id}"><div class="vcc-tog-t"></div></div>
    </div>`;
  }

  function buildCPContent() {
    const content = cpEl.querySelector('#vcc-cp-content');
    renderSiteStatus();
    content.innerHTML = [

      // ── Reprodução ──
      acc('pb', '▶', 'Reprodução', `
        <div class="vcc-spd-row">
          <button class="vcc-spd-btn" id="vcc-spd-minus">−</button>
          <input class="vcc-spd-in" id="vcc-spd-input" type="number" min="0.1" max="16" step="0.1" value="1.0">
          <button class="vcc-spd-btn" id="vcc-spd-plus">+</button>
          <button class="vcc-spd-btn sm" id="vcc-spd-reset">reset</button>
          <button class="vcc-spd-btn sm" id="vcc-spd-toggle2x">2× toggle</button>
        </div>
        <div class="vcc-eta" id="vcc-eta">—</div>
        <p class="vcc-sub-title" style="margin-top:8px">Presets</p>
        <div class="vcc-preset-grid" id="vcc-presets"></div>
        <div class="vcc-abts">
          <button class="vcc-abt" id="vcc-seek-back">« retroceder</button>
          <button class="vcc-abt" id="vcc-seek-fwd">avançar »</button>
          <button class="vcc-abt" id="vcc-toggle-cb-btn">ciclar modo CB</button>
        </div>
      `, true, true),

      // ── Áudio ──
      acc('au', '♪', 'Áudio', `
        <div class="vcc-slr"><label>Volume</label><input type="range" id="vcc-volume" min="0" max="100" value="${Math.round(state.volume * 100)}" step="1"><span class="vcc-slv" id="vcc-volume-val">${state.muted ? 'MUDO' : Math.round(state.volume * 100) + '%'}</span></div>
        <div class="vcc-abts"><button class="vcc-abt" id="vcc-volume-down">🔉 diminuir</button><button class="vcc-abt" id="vcc-volume-mute">${state.muted ? 'restaurar volume' : 'mudo'}</button><button class="vcc-abt" id="vcc-volume-up">aumentar 🔊</button></div>
        ${tog('boost', true, 'Volume boost', 'Amplifica além de 100%')}
        <div class="vcc-slr"><label>Nível</label><input type="range" id="vcc-boost-level" min="100" max="300" value="100" step="5"><span class="vcc-slv" id="vcc-boost-val">100%</span></div>
        ${tog('normalize', false, 'Normalização de volume', 'Equaliza vídeos com volumes diferentes')}
        ${tog('silence', false, 'Skip de silêncio', 'Pula trechos sem fala')}
      `, false, true),

      // ── Navegação avançada ──
      acc('nv', '⊹', 'Navegação avançada', `
        ${tog('loopab', false, 'Loop A→B', 'Repetir trecho entre dois pontos')}
        <div class="vcc-abts" style="margin-bottom:4px">
          <button class="vcc-abt" id="vcc-loop-a">marcar ponto A</button>
          <button class="vcc-abt" id="vcc-loop-b">marcar ponto B</button>
          <button class="vcc-abt" id="vcc-loop-clear">limpar loop</button>
        </div>
        <div class="vcc-loop-status" id="vcc-loop-status">
          <span class="none">nenhum loop configurado</span>
        </div>
        ${tog('savepos', true, 'Salvar posição por URL', 'Retoma de onde parou ao reabrir')}
        <div class="vcc-row">
          <div class="vcc-row-label">Picture-in-Picture</div>
          <button class="vcc-abt" id="vcc-pip"${!document.pictureInPictureEnabled ? ' disabled' : ''}>${document.pictureInPictureEnabled ? 'ativar PiP' : 'indisponível neste site'}</button>
        </div>
        <div class="vcc-abts" style="margin-top:2px">
          <button class="vcc-abt" id="vcc-timestamp">copiar timestamp</button>
        </div>
      `, false, true),

      // ── Visual ──
      acc('vs', '◑', 'Visual', `
        ${tog('invert', false, 'Inversão de cores', 'Útil para assistir no escuro', true)}
        <div class="vcc-slr vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}"><label>Brilho</label><input type="range" id="vcc-brightness" min="10" max="200" value="100" step="5"><span class="vcc-slv" id="vcc-brightness-val">100%</span></div>
        <p class="vcc-sub-title" style="margin-top:8px">Opacidade</p>
        <div class="vcc-slr"><label>Control Box</label><input type="range" id="vcc-cb-op" min="10" max="100" value="${Math.round(state.cbOpacity * 100)}" step="5"><span class="vcc-slv" id="vcc-cb-op-val">${Math.round(state.cbOpacity * 100)}%</span></div>
        <div class="vcc-slr"><label>Control Panel</label><input type="range" id="vcc-cp-op" min="20" max="100" value="${Math.round(state.cpOpacity * 100)}" step="5"><span class="vcc-slv" id="vcc-cp-op-val">${Math.round(state.cpOpacity * 100)}%</span></div>
      `),

      // ── Vídeos na página ──
      acc('vi', '▣', 'Vídeos na página', `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
          <span class="vcc-sub-title" style="margin:0" id="vcc-vid-count">0 vídeos detectados</span>
          <button class="vcc-abt" id="vcc-vid-all">selecionar todos</button>
        </div>
        <p class="vcc-hint" style="margin:0 0 7px">Clique no indicador ★ ou no botão ★ para escolher o vídeo principal. A tecla 0 alterna play/pause nele.</p>
        <div id="vcc-vid-list"></div>
      `, false, true),

      // ── Atalhos de teclado ──
      acc('ks', '⌨', 'Atalhos de teclado', `
        <div class="vcc-scope-tabs" id="vcc-scope-tabs">
          <button class="vcc-scope-tab active" data-scope="default">padrão (global)</button>
          <button class="vcc-scope-tab" data-scope="${domain}">${domain}</button>
          <button class="vcc-scope-tab" id="vcc-add-scope">+ domínio</button>
        </div>
        <p class="vcc-hint" id="vcc-scope-hint">Atalhos globais — usados quando não há configuração específica para o domínio.</p>
        <div id="vcc-keys-list"></div>
        <div class="vcc-abts" style="margin-top:8px">
          <button class="vcc-abt" id="vcc-keys-copy-to-domain">copiar para ${domain}</button>
          <button class="vcc-abt" id="vcc-keys-factory">restaurar padrões de fábrica</button>
        </div>
        <p class="vcc-hint">Clique em qualquer tecla para reatribuir. Esc cancela. ✕ remove o atalho.</p>
      `),

      // ── Comportamento ──
      acc('beh', '⚙', 'Comportamento', `
        <p class="vcc-sub-title">Valores de incremento</p>
        <div class="vcc-slr">
          <label>Passo velocidade</label>
          <input type="number" id="vcc-speed-step" class="vcc-num-in" min="0.05" max="1" step="0.05" value="${state.speedStep}">
          <span style="font-size:10px;color:rgba(255,255,255,0.35)">×</span>
        </div>
        <div class="vcc-slr" style="margin-top:8px">
          <label>Passo de volume</label>
          <input type="number" id="vcc-volume-step" class="vcc-num-in" min="1" max="25" step="1" value="${state.volumeStep}">
          <span style="font-size:10px;color:rgba(255,255,255,0.35)">%</span>
        </div>
        <div class="vcc-slr" style="margin-top:8px">
          <label>Passo de seek</label>
          <input type="number" id="vcc-seek-step" class="vcc-num-in" min="1" max="300" step="1" value="${state.seekStep}">
          <span style="font-size:10px;color:rgba(255,255,255,0.35)">s</span>
        </div>
        <p class="vcc-sub-title" style="margin-top:10px">Control Box</p>
        <div class="vcc-row">
          <div>
            <div class="vcc-row-label">Modo do CB</div>
            <div class="vcc-row-sub">V alterna entre visível, só alertas e oculto</div>
          </div>
          <button class="vcc-abt" id="vcc-cb-mode-btn" style="white-space:nowrap">—</button>
        </div>
        <div class="vcc-slr" style="margin-top:6px">
          <label>Duração do alerta</label>
          <input type="range" id="vcc-alert-dur" min="200" max="3000" step="100" value="${state.alertDuration}">
          <span class="vcc-slv" id="vcc-alert-dur-val">${state.alertDuration}ms</span>
        </div>
        <p class="vcc-hint">Duração do flash no modo "apenas alertas".</p>
      `),

      // ── Sites ativos ──
      acc('si', '◈', 'Sites ativos', `
        <div id="vcc-sites-list">${buildSitesList()}</div>
        <div class="vcc-abts"><button class="vcc-abt" id="vcc-add-site">+ adicionar domínio</button></div>
      `),

      // ── Estatísticas e compatibilidade ──
      acc('st', '◎', 'Estatísticas e compatibilidade', `
        <div class="vcc-stat-grid">
          <div class="vcc-sc"><div class="vcc-sv" id="stat-saved">0s</div><div class="vcc-sl">tempo economizado</div></div>
          <div class="vcc-sc"><div class="vcc-sv" id="stat-watched">0s</div><div class="vcc-sl">assistido nesta sessão</div></div>
          <div class="vcc-sc"><div class="vcc-sv" id="stat-avgspd">—</div><div class="vcc-sl">velocidade média</div></div>
          <div class="vcc-sc"><div class="vcc-sv" id="stat-quality">—</div><div class="vcc-sl">qualidade detectada</div></div>
        </div>
        <p class="vcc-sub-title">Compatibilidade — ${domain}</p>
        <div id="vcc-compat"></div>
      `, false, true),

      // ── Dados salvos ──
      acc('data', '⊟', 'Dados salvos e redefinições', `
        <p class="vcc-sub-title">Dados armazenados pelo VCC</p>
        <div id="vcc-storage-list" style="margin-bottom:8px;font-family:monospace;font-size:10px;color:rgba(255,255,255,0.42);line-height:1.8"></div>
        <div class="vcc-abts" style="margin-bottom:12px">
          <button class="vcc-abt" id="vcc-refresh-storage">↺ atualizar</button>
          <button class="vcc-abt" id="vcc-copy-all-storage">⎘ copiar tudo</button>
          <button class="vcc-abt" id="vcc-clear-storage" style="color:rgba(226,75,74,0.82);border-color:rgba(226,75,74,0.3)">apagar todos os dados</button>
        </div>
        <div class="vcc-danger-zone">
          <div class="vcc-danger-title">Redefinições</div>
          <div class="vcc-abts">
            <button class="vcc-abt" id="vcc-reset-keys">restaurar atalhos de fábrica</button>
            <button class="vcc-abt" id="vcc-reset-all" style="color:rgba(226,75,74,0.82);border-color:rgba(226,75,74,0.3)">restaurar todas as configs</button>
          </div>
        </div>
      `),

    ].join('');

    bindCPEvents();
    buildPresets();
    buildKeysList();
    buildVideoList();
    refreshStorageList();
  }

  function renderSiteStatus() {
    const status = cpEl?.querySelector('#vcc-site-status');
    if (!status) return;
    if (state.videoControlsActive) {
      status.innerHTML = '';
      return;
    }
    status.innerHTML = `
      <div class="vcc-site-warning" role="alert">
        <div class="vcc-site-warning-title">⚠ VCC não está ativo neste site</div>
        <div class="vcc-site-warning-text">Enquanto este domínio estiver inativo, os vídeos da página não podem ser detectados nem controlados pelo VCC. As configurações gerais continuam disponíveis.</div>
        <button class="vcc-activate-site" id="vcc-activate-site">Ativar VCC em ${domain}</button>
      </div>`;
    status.querySelector('#vcc-activate-site').addEventListener('click', activateCurrentSite);
  }

  // ─────────────────────────────────────────────
  // BIND EVENTOS DO CP
  // ─────────────────────────────────────────────
  function q(sel) { return cpEl.querySelector(sel); }

  function bindTog(id, cb) {
    const el = cpEl.querySelector(`#vcc-tog-${id}`); if (!el) return;
    el.addEventListener('click', () => { el.classList.toggle('on'); cb(el.classList.contains('on')); });
  }

  function bindCPEvents() {
    // Acordeões
    cpEl.querySelectorAll('.vcc-acc-hdr').forEach(btn => {
      btn.addEventListener('click', () => {
        const id   = btn.dataset.acc;
        const body = document.getElementById(`vcc-body-${id}`);
        const arr  = document.getElementById(`vcc-arr-${id}`);
        const open = body.classList.contains('open');
        body.classList.toggle('open', !open);
        body.style.display = open ? 'none' : 'block';
        arr.classList.toggle('open', !open);
      });
    });
    cpEl.querySelectorAll('.vcc-acc-body').forEach(b => {
      b.style.display = b.classList.contains('open') ? 'block' : 'none';
    });

    // Reprodução
    q('#vcc-spd-minus').addEventListener('click', () => changeSpeed(-state.speedStep));
    q('#vcc-spd-plus' ).addEventListener('click', () => changeSpeed(+state.speedStep));
    q('#vcc-spd-reset').addEventListener('click', resetSpeed);
    q('#vcc-spd-toggle2x').addEventListener('click', toggle2x);
    q('#vcc-spd-input').addEventListener('change', e => {
      const n = parseFloat(e.target.value); if (!isNaN(n)) applySpeed(n);
    });
    q('#vcc-seek-back').addEventListener('click', () => applySeek(-state.seekStep));
    q('#vcc-seek-fwd' ).addEventListener('click', () => applySeek(+state.seekStep));
    q('#vcc-toggle-cb-btn').addEventListener('click', cycleCBMode);

    // Áudio
    q('#vcc-volume-down').addEventListener('click', () => changeVolume(-state.volumeStep));
    q('#vcc-volume-up').addEventListener('click', () => changeVolume(+state.volumeStep));
    q('#vcc-volume-mute').addEventListener('click', toggleMute);
    q('#vcc-volume').addEventListener('input', e => applyVolume(parseInt(e.target.value) / 100, true));
    bindTog('boost',     () => {});
    bindTog('normalize', () => {});
    bindTog('silence',   () => {});
    q('#vcc-boost-level').addEventListener('input', e => { q('#vcc-boost-val').textContent = e.target.value + '%'; });

    // Navegação
    bindTog('loopab',  () => {});
    bindTog('savepos', () => {});
    q('#vcc-loop-a').addEventListener('click',     () => { setLoopPoint('A'); updateLoopStatus(); });
    q('#vcc-loop-b').addEventListener('click',     () => { setLoopPoint('B'); updateLoopStatus(); });
    q('#vcc-loop-clear').addEventListener('click', () => { clearLoop(); updateLoopStatus(); });
    const pipBtn = q('#vcc-pip');
    if (pipBtn && !pipBtn.disabled) pipBtn.addEventListener('click', activatePiP);
    q('#vcc-timestamp' ).addEventListener('click', copyTimestamp);

    // Visual
    bindTog('invert', () => applyVideoFilter());
    q('#vcc-brightness').addEventListener('input', e => {
      q('#vcc-brightness-val').textContent = e.target.value + '%'; applyVideoFilter();
    });
    q('#vcc-cb-op').addEventListener('input', e => {
      state.cbOpacity = parseInt(e.target.value) / 100;
      save(sk('cbOpacity'), state.cbOpacity);
      if (cbEl) cbEl.style.setProperty('opacity', state.cbOpacity, 'important');
      q('#vcc-cb-op-val').textContent = e.target.value + '%';
    });
    q('#vcc-cp-op').addEventListener('input', e => {
      state.cpOpacity = parseInt(e.target.value) / 100;
      save(sk('cpOpacity'), state.cpOpacity);
      if (cpEl) cpEl.style.setProperty('opacity', state.cpOpacity, 'important');
      q('#vcc-cp-op-val').textContent = e.target.value + '%';
    });

    // Vídeos
    q('#vcc-vid-all').addEventListener('click', toggleAllVideos);

    // Atalhos
    q('#vcc-add-scope').addEventListener('click', () => {
      const d = prompt('Domínio (ex: exemplo.com):'); if (d && d.trim()) addScopeTab(d.trim());
    });
    cpEl.querySelectorAll('.vcc-scope-tab[data-scope]').forEach(t => {
      t.addEventListener('click', () => setScope(t.dataset.scope));
    });
    q('#vcc-keys-copy-to-domain').addEventListener('click', () => {
      const target     = currentScope === 'default' ? domain : currentScope;
      const globalKeys = { ...FACTORY_KEYS, ...load(gk('keys'), {}) };
      save(`vcc_${target}_keys`, globalKeys);
      alert(`Atalhos globais copiados para ${target}.`);
    });
    q('#vcc-keys-factory').addEventListener('click', () => {
      if (!confirm('Restaurar atalhos de fábrica para este escopo?')) return;
      if (currentScope === 'default') del(gk('keys'));
      else del(`vcc_${currentScope}_keys`);
      KEYS = loadKeys(domain); buildKeysList();
    });

    // Comportamento
    q('#vcc-speed-step').addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v >= 0.05 && v <= 1) { state.speedStep = Math.round(v * 100) / 100; save(gk('speedStep'), state.speedStep); }
      else e.target.value = state.speedStep;
    });
    q('#vcc-seek-step').addEventListener('change', e => {
      const v = parseInt(e.target.value);
      if (!isNaN(v) && v >= 1 && v <= 300) { state.seekStep = v; save(gk('seekStep'), state.seekStep); }
      else e.target.value = state.seekStep;
    });
    q('#vcc-volume-step').addEventListener('change', e => {
      const v = parseInt(e.target.value);
      if (!isNaN(v) && v >= 1 && v <= 25) { state.volumeStep = v; save(gk('volumeStep'), state.volumeStep); }
      else e.target.value = state.volumeStep;
    });
    q('#vcc-alert-dur').addEventListener('input', e => {
      state.alertDuration = parseInt(e.target.value);
      save(gk('alertDuration'), state.alertDuration);
      q('#vcc-alert-dur-val').textContent = state.alertDuration + 'ms';
    });
    updateCPCBModeBtn();
    q('#vcc-cb-mode-btn').addEventListener('click', cycleCBMode);

    // Sites
    cpEl.querySelectorAll('[data-site-tog]').forEach(bindSiteToggle);
    q('#vcc-add-site').addEventListener('click', () => {
      const d = prompt('Domínio (ex: meusite.com):'); if (d && d.trim()) addSiteRow(d.trim(), true);
    });

    // Dados
    q('#vcc-refresh-storage').addEventListener('click', refreshStorageList);
    q('#vcc-copy-all-storage').addEventListener('click', () => {
      const all = getAllVccKeys().map(k => {
        let v = ''; try { v = JSON.stringify(GM_getValue(k)); } catch {}
        return `${k}: ${v}`;
      }).join('\n');
      navigator.clipboard.writeText(all).then(() => flashCB('⎘ copiado'));
    });
    q('#vcc-clear-storage').addEventListener('click', () => {
      if (!confirm('Apagar TODOS os dados do VCC?')) return;
      getAllVccKeys().forEach(del); refreshStorageList(); alert('Dados apagados.');
    });
    q('#vcc-reset-keys').addEventListener('click', () => {
      if (!confirm('Restaurar TODOS os atalhos para os padrões de fábrica?')) return;
      getAllVccKeys().filter(k => k.includes('_keys')).forEach(del);
      KEYS = { ...FACTORY_KEYS }; buildKeysList();
    });
    q('#vcc-reset-all').addEventListener('click', () => {
      if (!confirm('Restaurar TODAS as configurações? A página será recarregada.')) return;
      getAllVccKeys().forEach(del); location.reload();
    });
  }

  // ─────────────────────────────────────────────
  // PRESETS
  // ─────────────────────────────────────────────
  function buildPresets() {
    const grid = cpEl.querySelector('#vcc-presets'); if (!grid) return;
    grid.innerHTML = PRESET_SPEEDS.map(s =>
      `<div class="vcc-pc${Math.abs(state.speed - s) < 0.01 ? ' sel' : ''}" data-speed="${s}">${s}×</div>`
    ).join('') + `<div class="vcc-pc" style="border-style:dashed;color:rgba(255,255,255,.2);font-size:15px" id="vcc-preset-add">+</div>`;

    grid.querySelectorAll('.vcc-pc[data-speed]').forEach(c => {
      c.addEventListener('click', () => setSpeed(parseFloat(c.dataset.speed)));
    });
    grid.querySelector('#vcc-preset-add').addEventListener('click', () => {
      const v = prompt('Velocidade do novo preset (ex: 0.5):'); if (!v) return;
      const n = parseFloat(v);
      if (isNaN(n) || n < SPEED_MIN || n > SPEED_MAX) return alert('Valor inválido.');
      if (!PRESET_SPEEDS.includes(n)) { PRESET_SPEEDS.push(n); PRESET_SPEEDS.sort((a, b) => a - b); }
      buildPresets();
    });
  }

  function updateCPSpeed() {
    if (!cpEl) return;
    const input = cpEl.querySelector('#vcc-spd-input'); if (input) input.value = fmtSpeed(state.speed);
    cpEl.querySelectorAll('.vcc-pc[data-speed]').forEach(c => {
      c.classList.toggle('sel', Math.abs(parseFloat(c.dataset.speed) - state.speed) < 0.01);
    });
  }

  // ─────────────────────────────────────────────
  // ETA
  // ─────────────────────────────────────────────
  function updateETA() {
    if (!cpEl) return;
    const eta = cpEl.querySelector('#vcc-eta'); if (!eta) return;
    const vid = state.videos[state.primaryVideo];
    if (!vid || !isFinite(vid.duration) || vid.duration === 0) {
      eta.innerHTML = '<span style="color:rgba(255,255,255,.28)">duração não disponível</span>'; return;
    }
    const rem = (vid.duration - vid.currentTime) / state.speed;
    eta.innerHTML = `Faltam <strong>${fmtDuration(rem)}</strong> na velocidade atual de <strong>${fmtSpeed(state.speed)}×</strong>`;
  }

  // ─────────────────────────────────────────────
  // LISTA DE VÍDEOS
  // ─────────────────────────────────────────────
  function buildVideoList() {
    const list = cpEl ? cpEl.querySelector('#vcc-vid-list') : null; if (!list) return;
    list.innerHTML = '';

    state.videos.forEach((vid, i) => {
      if (!vid.isConnected) return;
      const isPrimary = i === state.primaryVideo;
      const isTarget  = state.targetVideos.has(i);
      const dur = isFinite(vid.duration) ? fmtDuration(vid.duration) : '?';
      const res = vid.videoWidth ? `${vid.videoWidth}×${vid.videoHeight}` : '—';
      let srcLabel = 'vídeo ' + (i + 1);
      try { srcLabel = new URL(vid.src).hostname || srcLabel; } catch {}

      const row = document.createElement('div');
      row.className = 'vcc-vrow';
      row.innerHTML = `
        <div class="vcc-vthumb${isPrimary ? ' primary' : ''}" title="${isPrimary ? 'Vídeo principal' : 'Definir como vídeo principal'}">${isPrimary ? '★' : '#' + (i + 1)}</div>
        <div style="flex:1;min-width:0">
          <div class="vcc-vname">${srcLabel}${isPrimary ? '<span class="vcc-primary-badge">principal</span>' : ''}</div>
          <div class="vcc-vmeta">${res} · ${dur}</div>
        </div>
        <div class="vcc-vid-actions">
          <button class="vcc-vid-btn" data-act="primary" title="${isPrimary ? 'Este é o vídeo principal' : 'Definir como vídeo principal'}" style="${isPrimary ? 'color:#5DCAA5;border-color:#1D9E75' : ''}">★</button>
          <button class="vcc-vid-btn" data-act="playpause" title="Play / Pause">${vid.paused ? '▶' : '⏸'}</button>
          <button class="vcc-vid-btn" data-act="hide"      title="Ocultar / mostrar">◻</button>
          <button class="vcc-vid-btn" data-act="mute"      title="Mutar">${vid.muted ? '✕♪' : '♪'}</button>
          <button class="vcc-vid-btn danger" data-act="remove" title="Remover da página">✕</button>
        </div>
        <div class="vcc-chk${isTarget ? ' on' : ''}" data-vidx="${i}">${isTarget ? '✓' : ''}</div>
      `;

      row.querySelector('.vcc-vthumb').addEventListener('click', () => {
        state.primaryVideo = i;
        buildVideoList();
        updateETA();
      });

      row.querySelector('.vcc-chk').addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.vidx);
        const on  = state.targetVideos.has(idx);
        if (on) { state.targetVideos.delete(idx); e.currentTarget.classList.remove('on'); e.currentTarget.textContent = ''; }
        else    { state.targetVideos.add(idx);    e.currentTarget.classList.add('on');    e.currentTarget.textContent = '✓'; }
      });

      row.querySelectorAll('.vcc-vid-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          switch (btn.dataset.act) {
            case 'primary':
              state.primaryVideo = i; buildVideoList(); updateETA(); break;
            case 'playpause':
              try { vid.paused ? vid.play() : vid.pause(); } catch {}
              setTimeout(() => { btn.textContent = vid.paused ? '▶' : '⏸'; }, 50); break;
            case 'hide':
              vid.style.visibility = vid.style.visibility === 'hidden' ? 'visible' : 'hidden';
              btn.style.color = vid.style.visibility === 'hidden' ? '#5DCAA5' : ''; break;
            case 'mute':
              try { vid.muted = !vid.muted; } catch {}
              btn.textContent = vid.muted ? '✕♪' : '♪'; break;
            case 'remove':
              if (!confirm('Remover este elemento de vídeo da página?')) return;
              try { vid.remove(); } catch {}
              state.videos.splice(i, 1);
              const newSet = new Set();
              state.targetVideos.forEach(idx => { if (idx < i) newSet.add(idx); else if (idx > i) newSet.add(idx - 1); });
              state.targetVideos.clear(); newSet.forEach(idx => state.targetVideos.add(idx));
              if (state.primaryVideo >= state.videos.length) state.primaryVideo = Math.max(0, state.videos.length - 1);
              buildVideoList(); break;
          }
        });
      });

      list.appendChild(row);
    });

    const count = cpEl.querySelector('#vcc-vid-count');
    if (count) count.textContent = `${state.videos.filter(v => v.isConnected).length} vídeo(s) detectado(s)`;
  }

  function updateVideoList() { if (cpEl && state.cpVisible) buildVideoList(); }

  function toggleAllVideos() {
    const all = state.videos.every((_, i) => state.targetVideos.has(i));
    if (all) state.targetVideos.clear();
    else state.videos.forEach((_, i) => state.targetVideos.add(i));
    buildVideoList();
  }

  // ─────────────────────────────────────────────
  // ATALHOS EDITÁVEIS
  // ─────────────────────────────────────────────
  function buildKeysList() {
    const list = cpEl.querySelector('#vcc-keys-list'); if (!list) return;

    list.innerHTML = KEY_ACTIONS.map(a => `
      <div class="vcc-kbd-row">
        <span class="vcc-kbd-action">${a.label}</span>
        <span style="display:flex;align-items:center;gap:3px">
          <span class="vcc-kbd-key" data-action="${a.id}">${KEYS[a.id] || '—'}</span>
          <button class="vcc-kbd-clear" data-clear="${a.id}" title="Remover atalho">✕</button>
        </span>
      </div>`).join('');

    // Numerais fixos (não editáveis)
    list.innerHTML += `
      <div class="vcc-kbd-row" style="opacity:.5">
        <span class="vcc-kbd-action">Play / pause do vídeo principal (fixo)</span>
        <span class="vcc-kbd-key" style="cursor:default">0</span>
      </div>
      <div class="vcc-kbd-row" style="opacity:.5">
        <span class="vcc-kbd-action">Presets 1.0×…4.0× (fixos)</span>
        <span style="display:flex;gap:3px">
          <span class="vcc-kbd-key" style="cursor:default">1</span>
          <span class="vcc-kbd-key" style="cursor:default">…</span>
          <span class="vcc-kbd-key" style="cursor:default">7</span>
        </span>
      </div>`;

    list.querySelectorAll('.vcc-kbd-key[data-action]').forEach(el => el.addEventListener('click', () => startCapture(el)));

    // Botões de limpar atalho
    list.querySelectorAll('.vcc-kbd-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.clear;
        KEYS[action] = null;
        const skey = currentScope === 'default' ? gk('keys') : `vcc_${currentScope}_keys`;
        const saved = load(skey, {}); saved[action] = null; save(skey, saved);
        buildKeysList();
      });
    });

    const copyBtn = cpEl.querySelector('#vcc-keys-copy-to-domain');
    if (copyBtn) copyBtn.textContent = `copiar para ${currentScope === 'default' ? domain : currentScope}`;
  }

  function startCapture(keyEl) {
    if (capturingKey) { capturingKey.classList.remove('capturing'); capturingKey.textContent = capturingKey._orig; }
    capturingKey = keyEl; keyEl._orig = keyEl.textContent;
    keyEl.classList.add('capturing'); keyEl.textContent = '…';

    const handler = e => {
      e.preventDefault(); e.stopPropagation();

      if (e.key === 'Escape') {
        keyEl.classList.remove('capturing'); keyEl.textContent = keyEl._orig; capturingKey = null;
        document.removeEventListener('keydown', handler, true); return;
      }

      // Bloquear teclas proibidas
      if (FORBIDDEN_KEYS.has(e.key)) {
        keyEl.classList.remove('capturing'); keyEl.classList.add('error');
        keyEl.textContent = 'inválida';
        setTimeout(() => { keyEl.classList.remove('error'); keyEl.textContent = keyEl._orig; capturingKey = null; }, 1200);
        document.removeEventListener('keydown', handler, true); return;
      }

      let k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (e.ctrlKey)  k = 'Ctrl+'  + k;
      if (e.altKey)   k = 'Alt+'   + k;
      if (e.shiftKey && e.key.length > 1) k = 'Shift+' + k;

      // Verificar duplicata
      const dup = Object.entries(KEYS).find(([act, bnd]) =>
        bnd && act !== keyEl.dataset.action && bnd.toUpperCase() === k.toUpperCase()
      );
      if (dup) {
        keyEl.classList.remove('capturing'); keyEl.classList.add('error');
        keyEl.textContent = 'em uso';
        setTimeout(() => { keyEl.classList.remove('error'); keyEl.textContent = keyEl._orig; capturingKey = null; }, 1400);
        document.removeEventListener('keydown', handler, true); return;
      }

      keyEl.textContent = k; keyEl.classList.remove('capturing'); capturingKey = null;
      KEYS[keyEl.dataset.action] = k;

      const skey = currentScope === 'default' ? gk('keys') : `vcc_${currentScope}_keys`;
      const saved = load(skey, {}); saved[keyEl.dataset.action] = k; save(skey, saved);

      document.removeEventListener('keydown', handler, true);
    };
    document.addEventListener('keydown', handler, true);
  }

  function setScope(scope) {
    currentScope = scope;
    cpEl.querySelectorAll('.vcc-scope-tab[data-scope]').forEach(t => t.classList.toggle('active', t.dataset.scope === scope));
    KEYS = loadKeys(scope === 'default' ? 'default' : scope);
    const hint = cpEl.querySelector('#vcc-scope-hint');
    if (hint) hint.textContent = scope === 'default'
      ? 'Atalhos globais — usados quando não há configuração específica para o domínio.'
      : `Atalhos específicos para ${scope} — substituem o padrão neste domínio.`;
    buildKeysList();
  }

  function addScopeTab(d) {
    const tabs   = cpEl.querySelector('#vcc-scope-tabs');
    const addBtn = cpEl.querySelector('#vcc-add-scope');
    if (tabs.querySelector(`[data-scope="${d}"]`)) { setScope(d); return; }
    const btn = document.createElement('button');
    btn.className = 'vcc-scope-tab'; btn.dataset.scope = d; btn.textContent = d;
    btn.addEventListener('click', () => setScope(d));
    tabs.insertBefore(btn, addBtn); setScope(d);
  }

  // ─────────────────────────────────────────────
  // SITES
  // ─────────────────────────────────────────────
  const DEFAULT_SITES = [];

  function normalizeSite(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
  }

  function updateCPVolume() {
    if (!cpEl) return;
    const slider = cpEl.querySelector('#vcc-volume');
    const value = cpEl.querySelector('#vcc-volume-val');
    const button = cpEl.querySelector('#vcc-volume-mute');
    if (slider) slider.value = Math.round(state.volume * 100);
    if (value) value.textContent = state.muted ? 'MUDO' : `${Math.round(state.volume * 100)}%`;
    if (button) button.textContent = state.muted ? 'restaurar volume' : 'mudo';
  }

  function updateCBVolume() {
    if (!cbEl) return;
    const el = cbEl.querySelector('#vcc-cb-volume');
    if (el) el.textContent = state.muted ? 'MUDO' : `${Math.round(state.volume * 100)}%`;
  }

  function getActiveSites() {
    return load(gk('activeSites'), DEFAULT_SITES)
      .map(normalizeSite)
      .filter(Boolean);
  }

  function saveActiveSites(sites) {
    save(gk('activeSites'), [...new Set(sites.map(normalizeSite).filter(Boolean))].sort());
  }

  function isSiteActive(site = domain) {
    const host = normalizeSite(site);
    return getActiveSites().some(s => host === s || host.endsWith('.' + s));
  }

  function setSiteActive(site, on) {
    const s = normalizeSite(site);
    if (!s) return;
    const sites = getActiveSites().filter(x => x !== s);
    if (on) sites.push(s);
    saveActiveSites(sites);
  }

  function buildSitesList() {
    const sites = [domain, ...getActiveSites()];
    return [...new Set(sites.map(normalizeSite).filter(Boolean))]
      .map(s => siteRowHTML(s, isSiteActive(s)))
      .join('');
  }

  function siteRowHTML(s, on) {
    return `<div class="vcc-site-row" data-site="${s}">
      <div class="vcc-site-name">${s}</div>
      <div class="vcc-tog${on ? ' on' : ''}" data-site-tog="${s}"><div class="vcc-tog-t"></div></div>
    </div>`;
  }

  function addSiteRow(s, on) {
    s = normalizeSite(s);
    const list = cpEl.querySelector('#vcc-sites-list');
    if (!list || list.querySelector(`[data-site="${s}"]`)) return;
    list.insertAdjacentHTML('beforeend', siteRowHTML(s, on));
    bindSiteToggle(list.querySelector(`[data-site-tog="${s}"]`));
    setSiteActive(s, on);
  }

  function bindSiteToggle(el) {
    if (!el || el._vccBound) return;
    el._vccBound = true;
    el.addEventListener('click', function () {
      this.classList.toggle('on');
      const site = this.dataset.siteTog;
      const on = this.classList.contains('on');
      setSiteActive(site, on);
      if (normalizeSite(site) === domain) {
        if (on) {
          startVideoEngine();
          buildCPContent();
          flashCB('✓ site ativado', true);
        } else {
          alert('VCC desativado para este domínio. Recarregue a página para interromper os controles já iniciados.');
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // STORAGE VIEWER
  // ─────────────────────────────────────────────
  function refreshStorageList() {
    const list = cpEl?.querySelector('#vcc-storage-list'); if (!list) return;
    const keys = getAllVccKeys();
    if (!keys.length) { list.innerHTML = '<span style="color:rgba(255,255,255,.25)">(nenhum dado salvo)</span>'; return; }
    list.innerHTML = keys.map(k => {
      let val = ''; try { val = JSON.stringify(GM_getValue(k)); } catch {}
      const line = `${k}: ${val}`;
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 0;border-bottom:.5px solid rgba(255,255,255,.04)">
        <span style="color:rgba(255,255,255,.38);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1" title="${k}">${k}</span>
        <span style="color:rgba(255,255,255,.22);font-size:10px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${val}">${val}</span>
        <button onclick="navigator.clipboard.writeText(${JSON.stringify(line)})" style="background:none;border:.5px solid rgba(255,255,255,.12);border-radius:3px;color:rgba(255,255,255,.35);font-size:9px;cursor:pointer;padding:1px 5px;flex-shrink:0;font-family:monospace" title="Copiar linha">⎘</button>
      </div>`;
    }).join('');
  }

  // ─────────────────────────────────────────────
  // LOOP A→B
  // ─────────────────────────────────────────────
  let loopA = null, loopB = null;

  function setLoopPoint(pt) {
    const vid = state.videos[state.primaryVideo]; if (!vid) return;
    if (pt === 'A') loopA = vid.currentTime; else loopB = vid.currentTime;
    if (loopA !== null && loopB !== null) enableLoop();
  }

  function enableLoop() {
    state.videos.forEach((vid, i) => {
      if (!state.targetVideos.has(i)) return;
      if (vid._vccLoop) vid.removeEventListener('timeupdate', vid._vccLoop);
      vid._vccLoop = () => { if (loopB !== null && vid.currentTime >= loopB) try { vid.currentTime = loopA; } catch {} };
      vid.addEventListener('timeupdate', vid._vccLoop);
    });
  }

  function clearLoop() {
    loopA = null; loopB = null;
    state.videos.forEach(v => { if (v._vccLoop) { v.removeEventListener('timeupdate', v._vccLoop); v._vccLoop = null; } });
  }

  function updateLoopStatus() {
    const el = cpEl?.querySelector('#vcc-loop-status'); if (!el) return;
    if (loopA === null && loopB === null) {
      el.innerHTML = '<span class="none">nenhum loop configurado</span>'; return;
    }
    const aStr = loopA !== null ? `<span class="pt">${fmtTimecode(loopA)}</span>` : '<span class="none">não definido</span>';
    const bStr = loopB !== null ? `<span class="pt">${fmtTimecode(loopB)}</span>` : '<span class="none">não definido</span>';
    const active = loopA !== null && loopB !== null;
    el.innerHTML = `A: ${aStr} &nbsp;→&nbsp; B: ${bStr}${active ? ' &nbsp;<span style="color:#5DCAA5;font-size:9px">● ativo</span>' : ''}`;
  }

  // ─────────────────────────────────────────────
  // FUNCIONALIDADES AVANÇADAS
  // ─────────────────────────────────────────────
  async function activatePiP() {
    const vid = state.videos[state.primaryVideo]; if (!vid) return;
    try { document.pictureInPictureElement ? await document.exitPictureInPicture() : await vid.requestPictureInPicture(); }
    catch (e) { alert('PiP indisponível: ' + e.message); }
  }

  function copyTimestamp() {
    const vid = state.videos[state.primaryVideo]; if (!vid) return;
    const t = Math.floor(vid.currentTime);
    navigator.clipboard.writeText(`${location.href.split('?')[0]}?t=${t}`).then(() => flashCB('✓ copiado'));
  }

  function applyVideoFilter() {
    const invert = cpEl?.querySelector('#vcc-tog-invert')?.classList.contains('on') ? 1 : 0;
    const bright = cpEl?.querySelector('#vcc-brightness')?.value ?? 100;
    state.videos.forEach(v => { try { v.style.filter = `invert(${invert}) brightness(${bright}%)`; } catch {} });
  }

  // ─────────────────────────────────────────────
  // COMPATIBILIDADE
  // ─────────────────────────────────────────────
  const COMPAT_CHECKS = [
    { label: 'Controle de velocidade', check: () => 'ok' },
    { label: 'Volume boost',           check: () => { try { new AudioContext(); return 'ok'; } catch { return 'unavailable'; } } },
    { label: 'Picture-in-Picture',     check: () => document.pictureInPictureEnabled ? 'ok' : 'unavailable' },
    { label: 'Skip de silêncio',       check: () => { try { new AudioContext(); return 'ok'; } catch { return 'unavailable'; } }, note: 'requer Web Audio API' },
    { label: 'Normalização de volume', check: () => { try { new AudioContext(); return 'ok'; } catch { return 'unavailable'; } }, note: 'requer acesso ao stream de áudio' },
  ];

  function renderCompatibility() {
    const el = cpEl?.querySelector('#vcc-compat'); if (!el) return;
    el.innerHTML = COMPAT_CHECKS.map(c => {
      const st = c.check ? c.check() : 'ok';
      const [dot, cls, tag] = st === 'ok' ? ['#5DCAA5','vcc-ok','disponível'] : st === 'partial' ? ['#EF9F27','vcc-warn','parcial'] : ['#E24B4A','vcc-err','indisponível'];
      return `<div class="vcc-ci">
        <div class="vcc-cdot" style="background:${dot}"></div>
        <div class="vcc-ct">${c.label} — <span class="vcc-ctag ${cls}">${tag}</span>${(c.note && st !== 'ok') ? ' — ' + c.note : ''}</div>
      </div>`;
    }).join('');
  }

  // ─────────────────────────────────────────────
  // ESTATÍSTICAS
  // ─────────────────────────────────────────────
  function updateStats() {
    if (!cpEl) return;
    const elapsed = (Date.now() - state.sessionStart) / 1000;
    const saved   = Math.max(0, elapsed - elapsed / state.speed);
    const avg     = state.speedHistory.length
      ? (state.speedHistory.reduce((a, b) => a + b, 0) / state.speedHistory.length).toFixed(2)
      : fmtSpeed(state.speed);
    const qual = state.videos[state.primaryVideo]?.videoHeight;
    const g = id => cpEl.querySelector('#' + id);
    if (g('stat-saved'))   g('stat-saved').textContent   = fmtDuration(saved);
    if (g('stat-watched')) g('stat-watched').textContent = fmtDuration(elapsed);
    if (g('stat-avgspd'))  g('stat-avgspd').textContent  = avg + '×';
    if (g('stat-quality')) g('stat-quality').textContent = qual ? qual + 'p' : '—';
  }

  setInterval(() => {
    if (!state.videoControlsActive) return;
    if (state.cpVisible) updateStats();
    updateETA();
    state.speedHistory.push(state.speed);
    if (state.speedHistory.length > 600) state.speedHistory.shift();
  }, 1000);

  // ─────────────────────────────────────────────
  // TOGGLE CP / CB helpers
  // ─────────────────────────────────────────────
  function toggleCPVisibility() {
    state.cpVisible = !state.cpVisible;
    if (!cpEl) buildCP();
    cpEl.style.setProperty('display', state.cpVisible ? 'flex' : 'none', 'important');
    if (state.cpVisible) {
      updateCPSpeed(); updateETA(); buildVideoList();
      renderCompatibility(); updateStats(); refreshStorageList();
      updateCPCBModeBtn(); updateLoopStatus();
    }
  }

  function updateCPCBModeBtn() {
    const btn = cpEl?.querySelector('#vcc-cb-mode-btn'); if (!btn) return;
    const labels = { visible:'visível', alerts:'apenas alertas', hidden:'oculto' };
    btn.textContent = `modo atual: ${labels[state.cbMode] || state.cbMode}`;
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  function fmtSpeed(v) {
    const r = Math.round(v * 100) / 100;
    return r % 1 === 0 ? r + '.0' : r.toString();
  }

  function fmtDuration(secs) {
    secs = Math.max(0, Math.round(secs));
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function fmtTimecode(secs) {
    secs = Math.round(secs);
    const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${m}:${String(s).padStart(2,'0')}`;
  }

  let videoEngineStarted = false;

  function startVideoEngine() {
    if (videoEngineStarted) return;
    videoEngineStarted = true;
    state.videoControlsActive = true;
    state.sessionStart = Date.now();
    state.speedHistory = [];
    scanVideos();
    startObserver();
    buildCB();
  }

  function activateCurrentSite() {
    setSiteActive(domain, true);
    startVideoEngine();
    if (cpEl) buildCPContent();
    flashCB('✓ site ativado', true);
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  function init() {
    loadState();
    KEYS = loadKeys(domain);
    injectStyles();
    state.videoControlsActive = isSiteActive();
    if (state.videoControlsActive) startVideoEngine();
  }

  function start() {
    init();
  }

  const extensionRuntime = globalThis.browser?.runtime || globalThis.chrome?.runtime;
  if (extensionRuntime?.onMessage?.addListener) {
    extensionRuntime.onMessage.addListener(message => {
      if (message?.type === 'VCC_TOGGLE_PANEL') storageReady.then(toggleCPVisibility);
    });
  }

  storageReady.then(() => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  });

})();
