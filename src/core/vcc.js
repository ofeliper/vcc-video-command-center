(function () {
  'use strict';

  /*
   * VCC is intended for personal control of HTML5 video elements already loaded
   * in the browser. It does not download media, extract streams, remove ads,
   * bypass paywalls, or attempt to defeat DRM/content protection.
   */
  const storageReady = globalThis.VCC_STORAGE_READY || Promise.resolve();

  // ─────────────────────────────────────────────
  // TRUSTED TYPES
  //
  // Sites como o YouTube exigem TrustedHTML em innerHTML/insertAdjacentHTML
  // (CSP "require-trusted-types-for 'script'"). Sem isso, a primeira
  // atribuição lança erro e o VCC não monta a barra nem o painel.
  // Todo HTML do VCC é gerado pelo próprio script, então a política
  // apenas repassa a string. Em navegadores sem Trusted Types, usa a string.
  // ─────────────────────────────────────────────
  const ttPolicy = (() => {
    const tt = globalThis.trustedTypes;
    if (!tt?.createPolicy) return null;
    for (const name of ['vcc-html', 'vcc-html-' + Math.random().toString(36).slice(2)]) {
      try { return tt.createPolicy(name, { createHTML: s => s }); } catch {}
    }
    return null;
  })();
  const toHTML = s => (ttPolicy ? ttPolicy.createHTML(String(s)) : s);

  // ─────────────────────────────────────────────
  // HTML SEGURO
  //
  // Todo HTML do VCC é montado com a tag escapeHTML`...`: cada valor
  // interpolado é escapado, a não ser que já seja HTML seguro (outro
  // escapeHTML`...` ou uma lista deles). setSafeHTML()/appendSafeHTML()
  // aplicam o resultado na página (via TrustedHTML quando exigido).
  // ─────────────────────────────────────────────
  class SafeHTML {
    constructor(html) { this.html = html; }
    toString() { return this.html; }
  }
  const escapeText = v => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const htmlPiece = v =>
    v instanceof SafeHTML ? v.html
    : Array.isArray(v) ? v.map(htmlPiece).join('')
    : (v === null || v === undefined || v === false) ? ''
    : escapeText(v);
  function escapeHTML(strings, ...values) {
    let out = strings[0];
    values.forEach((v, i) => { out += htmlPiece(v) + strings[i + 1]; });
    return new SafeHTML(out);
  }

  // Insere HTML seguro na página: o texto é convertido em elementos por um
  // DOMParser (documento inerte, sem executar scripts) e os nós são movidos
  // para o destino. Não usa innerHTML.
  function safeHTMLToNodes(v) {
    const doc = new DOMParser().parseFromString(toHTML(htmlPiece(v)), 'text/html');
    return [...doc.body.childNodes];
  }
  function setSafeHTML(el, v) { el.replaceChildren(...safeHTMLToNodes(v)); }
  function appendSafeHTML(el, v) { el.append(...safeHTMLToNodes(v)); }

  // ─────────────────────────────────────────────
  // IDIOMA E DEFINIÇÕES COMPARTILHADAS
  // (textos em src/core/i18n.js; padrões e temas em src/core/shared.js)
  // ─────────────────────────────────────────────
  const I18N = globalThis.VCC_I18N;
  const SHARED = globalThis.VCC_SHARED;
  const { DEFAULTS, FACTORY_KEYS, SPEED_MIN, SPEED_MAX } = SHARED;

  let langPref = 'auto';                 // 'auto' | 'pt-BR' | 'en-US'
  let lang = I18N.resolve(langPref);
  let t = I18N.translator(lang);

  // Texto traduzido com os parâmetros em negrito, como HTML seguro.
  // Ex.: 'Faltam {time} na velocidade…' → Faltam <strong>7m 11s</strong> na velocidade…
  function tStrong(key, params) {
    const parts = t(key).split(/\{(\w+)\}/);
    return parts.map((part, i) => (i % 2 ? escapeHTML`<strong>${params[part] ?? ''}</strong>` : escapeHTML`${part}`));
  }

  // ─────────────────────────────────────────────
  // AMBIENTE
  // ─────────────────────────────────────────────
  const extensionApi = globalThis.browser?.runtime?.id ? globalThis.browser
    : globalThis.chrome?.runtime?.id ? globalThis.chrome : null;
  const extensionRuntime = extensionApi?.runtime || null;
  // Na extensão, as configurações ficam na página de configurações e o painel
  // mostra só os controles do vídeo. No Tampermonkey, o painel tem tudo.
  // (VCC_STORAGE_READY só existe na extensão, criado por gm-compat.js.)
  const IS_EXTENSION = !!extensionRuntime && !!globalThis.VCC_STORAGE_READY;

  // ─────────────────────────────────────────────
  // CONSTANTES
  // ─────────────────────────────────────────────
  const PRESET_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0, 3.0, 4.0];
  const SPEED_MAP     = {'1':1.0,'2':1.25,'3':1.5,'4':1.75,'5':2.0,'6':3.0,'7':4.0};
  // Menor vídeo que recebe a barra no posicionamento automático (evita miniaturas).
  const MIN_VIDEO_W = 160, MIN_VIDEO_H = 90;
  const BAR_MARGIN = 8;

  // Ações com atalho configurável (os nomes vêm de 'key.<id>' em i18n.js)
  const KEY_ACTIONS = SHARED.KEY_ACTION_IDS.map(id => ({ id }));

  // ─────────────────────────────────────────────
  // ESTADO
  // ─────────────────────────────────────────────
  const domain = location.hostname.replace(/^www\./, '');

  const state = {
    speed:         1.0,
    prevSpeed:     1.0,
    cbMode:        DEFAULTS.cbMode,  // 'visible' | 'alerts' | 'hidden'
    cpVisible:     false,
    videos:        [],
    primaryVideo:  0,
    targetVideos:  new Set(),
    cbOpacity:     DEFAULTS.cbOpacity,
    cpOpacity:     DEFAULTS.cpOpacity,
    cbPos:         null,
    sessionStart:  Date.now(),
    speedHistory:  [],
    alertDuration: DEFAULTS.alertDuration,
    seekStep:      DEFAULTS.seekStep,
    seekStepLong:  DEFAULTS.seekStepLong,
    holdSpeed:     DEFAULTS.holdSpeed,
    speedStep:     DEFAULTS.speedStep,
    volume:        1.0,
    lastVolume:    1.0,
    muted:         false,
    volumeStep:    DEFAULTS.volumeStep,
    themePref:     DEFAULTS.theme,
    barAuto:       DEFAULTS.barAuto,
    barAnchor:     DEFAULTS.barAnchor,
    barLayout:     DEFAULTS.barLayout,
    barWheel:      DEFAULTS.barWheel,
    resume:        false,            // retomar de onde parou (por site)
    siteRotation:  null,             // rotação lembrada no site (null = não lembrar)
    filter:        { invert: false, brightness: 100, contrast: 100, saturate: 100 },
    videoControlsActive: false,
  };

  // ─────────────────────────────────────────────
  // ARMAZENAMENTO (funções GM_*; na extensão, via gm-compat.js)
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

  const clamp = (v, min, max, fb) => (Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fb);
  const oneOf = (v, list, fb) => (list.includes(v) ? v : fb);

  function loadState() {
    // Opacidade: valor do site; se não houver, o padrão global; se não houver, o de fábrica.
    state.cbOpacity     = clamp(load(sk('cbOpacity'), load(gk('cbOpacity'), DEFAULTS.cbOpacity)), 0.1, 1, DEFAULTS.cbOpacity);
    state.cpOpacity     = clamp(load(sk('cpOpacity'), load(gk('cpOpacity'), DEFAULTS.cpOpacity)), 0.2, 1, DEFAULTS.cpOpacity);
    state.cbPos         = load(sk('cbPos'),         null);
    state.speed         = clamp(load(sk('speed'), 1.0), SPEED_MIN, SPEED_MAX, 1.0);
    state.cbMode        = oneOf(load(gk('cbMode'), DEFAULTS.cbMode), SHARED.MODES, DEFAULTS.cbMode);
    state.alertDuration = clamp(load(gk('alertDuration'), DEFAULTS.alertDuration), 200, 3000, DEFAULTS.alertDuration);
    state.seekStep      = clamp(load(gk('seekStep'),      DEFAULTS.seekStep), 1, 300, DEFAULTS.seekStep);
    state.seekStepLong  = clamp(load(gk('seekStepLong'),  DEFAULTS.seekStepLong), 5, 3600, DEFAULTS.seekStepLong);
    state.holdSpeed     = clamp(load(gk('holdSpeed'),     DEFAULTS.holdSpeed), SPEED_MIN, SPEED_MAX, DEFAULTS.holdSpeed);
    state.speedStep     = clamp(load(gk('speedStep'),     DEFAULTS.speedStep), 0.05, 1, DEFAULTS.speedStep);
    state.volume        = clamp(load(sk('volume'), 1.0), 0, 1, 1.0);
    state.lastVolume    = clamp(load(sk('lastVolume'), state.volume || 1.0), 0.01, 1, 1.0);
    state.muted         = !!load(sk('muted'), false);
    state.volumeStep    = clamp(load(gk('volumeStep'), DEFAULTS.volumeStep), 1, 25, DEFAULTS.volumeStep);
    state.themePref     = oneOf(load(gk('theme'), DEFAULTS.theme), SHARED.THEMES_PREFS, DEFAULTS.theme);
    state.barAuto       = !!load(gk('barAuto'), DEFAULTS.barAuto);
    state.barAnchor     = oneOf(load(gk('barAnchor'), DEFAULTS.barAnchor), SHARED.BAR_ANCHORS, DEFAULTS.barAnchor);
    state.barLayout     = oneOf(load(gk('barLayout'), DEFAULTS.barLayout), ['single', 'perVideo'], DEFAULTS.barLayout);
    state.barWheel      = !!load(gk('barWheel'), DEFAULTS.barWheel);
    state.resume        = !!load(sk('resume'), false);
    state.siteRotation  = oneOf(load(sk('rotation'), null), [0, 90, 180, 270], null);
    langPref            = load(gk('language'), 'auto');
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

  const matchKey = SHARED.matchBinding;

  // ─────────────────────────────────────────────
  // CONTROLE DE VÍDEO
  //
  // A velocidade "global" (state.speed) vale para os vídeos selecionados.
  // No modo "uma barra em cada vídeo", cada barra pode dar ao próprio vídeo
  // uma velocidade diferente (vid._vccSpeed); os atalhos voltam a usar a global.
  // ─────────────────────────────────────────────
  function clampSpeed(v) {
    return Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round(v * 100) / 100));
  }

  // Vídeos acelerados enquanto a tecla de "segurar para acelerar" está pressionada.
  let holdVideos = null;
  const videoSpeed = vid => (holdVideos?.has(vid) ? state.holdSpeed : (vid._vccSpeed ?? state.speed));

  function targetVideoList() {
    return [...state.targetVideos].map(i => state.videos[i]).filter(v => v && v.isConnected);
  }

  function applySpeed(v, persist = true) {
    state.speed = clampSpeed(v);
    targetVideoList().forEach(vid => {
      delete vid._vccSpeed;
      try { vid.playbackRate = state.speed; } catch {}
    });
    if (persist) saveSpeed();
    updateBarsDisplay();
    updateCPSpeed();
    updateETA();
  }

  function applySeek(seconds) {
    targetVideoList().forEach(vid => seekVideo(vid, seconds));
    flashCB(bar => seekFlashText(seconds, bar));
  }

  // Aviso de avanço/retrocesso com a velocidade atual: "+10s · 1.75×".
  function seekFlashText(seconds, bar) {
    const speed = bar?.video ? videoSpeed(bar.video) : state.speed;
    return `${seconds > 0 ? '+' : ''}${seconds}s · ${fmtSpeed(speed)}×`;
  }

  function seekVideo(vid, seconds) {
    try {
      const dur = vid.duration || 0;
      vid.currentTime = Math.max(0, isFinite(dur) ? Math.min(dur, vid.currentTime + seconds) : vid.currentTime + seconds);
    } catch {}
  }

  function volumeFlashText() {
    return state.muted ? t('flash.muted') : t('flash.volume', { n: Math.round(state.volume * 100) });
  }

  function applyVolume(value, unmute = true) {
    state.volume = Math.max(0, Math.min(1, Math.round(value * 100) / 100));
    if (state.volume > 0) state.lastVolume = state.volume;
    if (unmute) state.muted = false;
    targetVideoList().forEach(vid => {
      try { vid.volume = state.volume; vid.muted = state.muted; } catch {}
    });
    saveVolume();
    updateBarsDisplay();
    updateCPVolume();
    flashCB(volumeFlashText());
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
    targetVideoList().forEach(vid => {
      try { vid.volume = state.volume; vid.muted = state.muted; } catch {}
    });
    saveVolume();
    updateBarsDisplay();
    updateCPVolume();
    flashCB(volumeFlashText());
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
    flashCB(t(shouldPlay ? 'flash.play' : 'flash.pause'), [vid]);
    setTimeout(updateVideoList, 80);
  }

  function setSpeed(v)    { applySpeed(v); flashCB(fmtSpeed(state.speed) + '×'); }
  function changeSpeed(d) { setSpeed(state.speed + d); }
  function resetSpeed()   { setSpeed(1.0); }

  function toggle2x() {
    if (Math.abs(state.speed - 2.0) < 0.01) setSpeed(state.prevSpeed === 2.0 ? 1.0 : state.prevSpeed);
    else { state.prevSpeed = state.speed; setSpeed(2.0); }
  }

  // Segurar a tecla acelera; soltar volta à velocidade anterior (nada é salvo).
  let holdKey = null;
  function startHold(e) {
    if (holdVideos) return;
    const list = targetVideoList();
    if (!list.length) return;
    holdVideos = new Set(list);
    holdKey = e.key.toUpperCase();
    list.forEach(vid => { try { vid.playbackRate = state.holdSpeed; } catch {} });
    updateBarsDisplay(); updateETA();
    flashCB(`▸▸ ${fmtSpeed(state.holdSpeed)}×`, list);
  }

  function endHold() {
    if (!holdVideos) return;
    const list = [...holdVideos];
    holdVideos = null; holdKey = null;
    list.forEach(vid => { try { vid.playbackRate = videoSpeed(vid); } catch {} });
    updateBarsDisplay(); updateETA();
    flashCB(bar => barSpeedText(bar), list);
  }

  // Quadro a quadro: pausa e anda um quadro (duração medida durante a reprodução; sem medida, 1/30 s).
  function stepFrame(dir) {
    const list = targetVideoList();
    if (!list.length) return;
    list.forEach(vid => {
      try {
        if (!vid.paused) vid.pause();
        const frame = vid._vccFrame || 1 / 30;
        const dur = isFinite(vid.duration) ? vid.duration : Infinity;
        vid.currentTime = Math.max(0, Math.min(dur, vid.currentTime + dir * frame));
      } catch {}
    });
    flashCB(bar => t('flash.frame', { time: fmtTimecodeMs((bar.video || state.videos[state.primaryVideo] || list[0]).currentTime) }), list);
    setTimeout(updateVideoList, 80);
  }

  // Mede a duração de um quadro pelos quadros realmente exibidos.
  function measureFrame(vid) {
    if (vid._vccFrame || vid._vccMeasuring || typeof vid.requestVideoFrameCallback !== 'function') return;
    vid._vccMeasuring = true;
    let last = null;
    const deltas = [];
    const tick = (_now, meta) => {
      if (last !== null) {
        const d = meta.mediaTime - last;
        if (d > 0.004 && d < 0.2) deltas.push(d);
      }
      last = meta.mediaTime;
      if (deltas.length >= 12) {
        // Média dos intervalos normais; os maiores são quadros pulados.
        const min = Math.min(...deltas);
        const normal = deltas.filter(d => d <= min * 1.5);
        vid._vccFrame = normal.reduce((a, b) => a + b, 0) / normal.length;
        vid._vccMeasuring = false;
        return;
      }
      if (vid.paused || vid.ended || !vid.isConnected) { vid._vccMeasuring = false; return; }
      vid.requestVideoFrameCallback(tick);
    };
    try { vid.requestVideoFrameCallback(tick); } catch { vid._vccMeasuring = false; }
  }

  // Ações de uma barra presa a um vídeo: valem só para esse vídeo.
  function setVideoSpeed(vid, v) {
    vid._vccSpeed = clampSpeed(v);
    try { vid.playbackRate = vid._vccSpeed; } catch {}
    flashCB(fmtSpeed(vid._vccSpeed) + '×', [vid]);
  }

  function changeVideoVolume(vid, percent) {
    try {
      vid.muted = false;
      vid.volume = Math.max(0, Math.min(1, Math.round((vid.volume + percent / 100) * 100) / 100));
    } catch {}
    flashCB(t('flash.volume', { n: Math.round(vid.volume * 100) }), [vid]);
  }

  function toggleVideoMute(vid) {
    try { vid.muted = !vid.muted; } catch {}
    flashCB(vid.muted ? t('flash.muted') : t('flash.volume', { n: Math.round(vid.volume * 100) }), [vid]);
  }

  // ─────────────────────────────────────────────
  // DETECÇÃO DE VÍDEOS — com suporte a Shadow DOM
  //
  // Players modernos podem encapsular o <video> em Shadow DOM, que
  // document.querySelectorAll('video') não atravessa. A varredura desce
  // recursivamente em cada shadowRoot encontrado.
  // ─────────────────────────────────────────────
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

  function registerVideo(vid) {
    if (state.videos.includes(vid)) return;
    const idx = state.videos.length;
    state.videos.push(vid);
    state.targetVideos.add(idx);

    // Aplica velocidade imediatamente e quando o vídeo estiver pronto.
    const applyWhenReady = () => {
      try {
        vid.playbackRate = videoSpeed(vid);
        vid.volume = state.volume;
        vid.muted = state.muted;
      } catch {}
    };
    applyWhenReady();
    vid.addEventListener('loadedmetadata', applyWhenReady);

    // Imagem: filtros em uso e rotação lembrada no site.
    applyFilterTo(vid);
    if (state.siteRotation && vid._vccRot === undefined) { vid._vccRot = state.siteRotation; watchView(vid); applyView(vid); }

    // Dados por vídeo: retomar de onde parou e marcadores.
    const onMeta = () => { tryResume(vid); if (vid === state.videos[state.primaryVideo]) renderMarks(); };
    vid.addEventListener('loadedmetadata', onMeta);
    if (vid.readyState >= 1) onMeta();
    vid.addEventListener('timeupdate', () => saveResume(vid));
    vid.addEventListener('pause', () => saveResume(vid, true));
    vid.addEventListener('playing', () => measureFrame(vid));
    if (!vid.paused) measureFrame(vid);

    // Reaplica quando o src muda (troca de mídia, playlists ou próximo item)
    vid.addEventListener('emptied', () => {
      delete vid._vccFrame; delete vid._vccResumed;
      vid.addEventListener('loadedmetadata', function onMeta() {
        try { vid.playbackRate = videoSpeed(vid); } catch {}
        updateBarsDisplay();
        updateCPSpeed();
        vid.removeEventListener('loadedmetadata', onMeta);
      });
    });

    // Alguns players resetam playbackRate ao dar play
    vid.addEventListener('play', () => {
      try {
        if (Math.abs(vid.playbackRate - videoSpeed(vid)) > 0.01) vid.playbackRate = videoSpeed(vid);
      } catch {}
    });
    vid.addEventListener('volumechange', () => updateBarsDisplay());

    syncBars();
    updateVideoList();
  }

  function scanVideos() {
    queryAllVideos(document).forEach(registerVideo);
  }

  // MutationObserver para players que montam o DOM depois do carregamento,
  // com varredura periódica como reserva para Shadow DOM.
  function startObserver() {
    const obs = new MutationObserver(mutations => {
      let needsScan = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'VIDEO') { needsScan = true; break; }
          if (node.querySelector && (node.querySelector('video') || node.shadowRoot)) {
            needsScan = true; break;
          }
        }
      }
      if (needsScan) scanVideos();
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });

    let pollCount = 0;
    const poll = setInterval(() => {
      scanVideos();
      pollCount++;
      if (pollCount > 24) clearInterval(poll);
    }, 5000);
  }

  // ─────────────────────────────────────────────
  // KEYBOARD LISTENER
  // ─────────────────────────────────────────────
  // Atalho tratado pelo VCC: o site não deve agir sobre a mesma tecla
  // (ex.: "," e "." no YouTube também andam quadro a quadro).
  function take(e) { e.preventDefault(); e.stopPropagation(); }

  function onKeyDown(e) {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (['input','textarea','select'].includes(tag) || document.activeElement?.isContentEditable) return;

    // O painel está sempre disponível, inclusive em sites ainda não ativados.
    if (matchKey(e, KEYS.toggleCP)) { take(e); toggleCPVisibility(); return; }
    if (!state.videoControlsActive) return;

    // Numerais 1-7 → presets
    if (/^[1-7]$/.test(e.key) && !e.ctrlKey && !e.altKey) {
      const s = SPEED_MAP[e.key];
      if (s !== undefined) { take(e); setSpeed(s); return; }
    }

    // Zero → play/pause do vídeo principal
    if (e.key === '0' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat) {
      take(e); togglePrimaryPlayback(); return;
    }

    if (matchKey(e, KEYS.slowDown))   { take(e); changeSpeed(-state.speedStep); return; }
    if (matchKey(e, KEYS.speedUp))    { take(e); changeSpeed(+state.speedStep); return; }
    if (matchKey(e, KEYS.resetSpeed)) { take(e); resetSpeed();                  return; }
    if (matchKey(e, KEYS.toggle2x))   { take(e); toggle2x();                    return; }
    if (matchKey(e, KEYS.seekBack))   { take(e); applySeek(-state.seekStep);    return; }
    if (matchKey(e, KEYS.seekFwd))    { take(e); applySeek(+state.seekStep);    return; }
    if (matchKey(e, KEYS.volumeDown)) { take(e); changeVolume(-state.volumeStep); return; }
    if (matchKey(e, KEYS.volumeUp))   { take(e); changeVolume(+state.volumeStep); return; }
    if (matchKey(e, KEYS.toggleMute)) { take(e); toggleMute();                    return; }
    if (matchKey(e, KEYS.toggleCB))   { take(e); cycleCBMode();                 return; }
    if (matchKey(e, KEYS.rotateLeft))  { take(e); rotateVideos(-90);             return; }
    if (matchKey(e, KEYS.rotateRight)) { take(e); rotateVideos(+90);             return; }
    if (matchKey(e, KEYS.seekBackLong)) { take(e); applySeek(-state.seekStepLong); return; }
    if (matchKey(e, KEYS.seekFwdLong))  { take(e); applySeek(+state.seekStepLong); return; }
    if (matchKey(e, KEYS.frameBack))   { take(e); stepFrame(-1);                 return; }
    if (matchKey(e, KEYS.frameFwd))    { take(e); stepFrame(+1);                 return; }
    if (matchKey(e, KEYS.holdSpeed))   { take(e); if (!e.repeat) startHold(e);   return; }
    if (matchKey(e, KEYS.zoomIn))      { take(e); changeZoom(+ZOOM_STEP);        return; }
    if (matchKey(e, KEYS.zoomOut))     { take(e); changeZoom(-ZOOM_STEP);        return; }
    if (matchKey(e, KEYS.mirror))      { take(e); toggleMirror();                return; }
    if (matchKey(e, KEYS.snapshot))    { take(e); if (!e.repeat) captureFrame(); return; }
    if (matchKey(e, KEYS.markAdd))     { take(e); if (!e.repeat) addMark();      return; }
    if (matchKey(e, KEYS.markPrev))    { take(e); jumpMark(-1);                  return; }
    if (matchKey(e, KEYS.markNext))    { take(e); jumpMark(+1);                  return; }
  }

  document.addEventListener('keydown', onKeyDown, true);
  // Fim do "segurar para acelerar": ao soltar a tecla ou ao sair da janela.
  document.addEventListener('keyup', e => { if (holdVideos && e.key.toUpperCase() === holdKey) endHold(); }, true);
  window.addEventListener('blur', endHold);

  // ─────────────────────────────────────────────
  // TEMA (claro / escuro / automático)
  // ─────────────────────────────────────────────
  const currentTheme = () => SHARED.resolveTheme(state.themePref);

  function applyThemeEverywhere() {
    const theme = currentTheme();
    if (cpEl) SHARED.applyThemeVars(cpEl, theme);
    bars.forEach(bar => SHARED.applyThemeVars(bar.el, theme));
  }

  SHARED.onSystemThemeChange(() => { if (state.themePref === 'auto') applyThemeEverywhere(); });

  // ─────────────────────────────────────────────
  // ESTILOS
  // As cores vêm das variáveis --vcc-* (ver THEMES em shared.js), aplicadas
  // no painel e em cada barra. Textos com contraste ≥ 4,5:1 nos dois temas.
  // ─────────────────────────────────────────────
  function injectStyles() {
    const css = `
      /* ── Barra de controle (o contêiner é estilizado inline, ver buildBarElement) ── */
      .vcc-bar * { box-sizing: border-box; }
      .vcc-bar button, .vcc-bar .vcc-bar-label {
        all: unset; box-sizing: border-box;
        display: flex; align-items: center; justify-content: center;
        height: 22px; min-width: 22px; padding: 0 3px; border-radius: 4px;
        color: var(--vcc-text-2); font: 500 12px/1 'JetBrains Mono','Fira Mono','Courier New',monospace;
        cursor: pointer; flex-shrink: 0; transition: background .1s, color .1s;
      }
      .vcc-bar button:hover, .vcc-bar .vcc-bar-label:hover { background: var(--vcc-surface-hover); color: var(--vcc-text); }
      .vcc-bar button:focus-visible { outline: 2px solid var(--vcc-accent); outline-offset: 1px; }
      .vcc-bar button:active { transform: scale(0.92); }
      /* Largura fixa para os avisos ("+10s · 1.75×", "volume 100%") não empurrarem os botões. */
      .vcc-bar .vcc-bar-speed { min-width: 96px; color: var(--vcc-text); cursor: default; white-space: nowrap; }
      .vcc-bar .vcc-bar-speed:hover { background: none; }
      .vcc-bar .vcc-bar-vol { min-width: 40px; font-size: 11px; }
      .vcc-bar .vcc-bar-grip {
        cursor: grab; color: var(--vcc-text-3); letter-spacing: -3px; padding: 0 6px 0 3px;
        font-size: 14px; min-width: 18px; margin-right: 2px;
        border-right: 1px solid var(--vcc-border); border-radius: 4px 0 0 4px;
      }
      .vcc-bar .vcc-bar-grip:hover { color: var(--vcc-text); }
      .vcc-bar .vcc-bar-grip:active { cursor: grabbing; }
      .vcc-bar .vcc-bar-div { width: 1px; height: 14px; background: var(--vcc-border); margin: 0 2px; flex-shrink: 0; }
      .vcc-bar .vcc-bar-cfg { font-size: 14px; }

      /* ── Painel ── */
      #vcc-cp {
        position: fixed; z-index: 2147483646;
        top: 50%; left: 50%; transform: translate(-50%,-50%);
        width: min(500px,92vw); max-height: 82vh;
        display: flex; flex-direction: column;
        background: var(--vcc-bg); color: var(--vcc-text-2);
        border: 1px solid var(--vcc-border); border-radius: 12px;
        box-shadow: var(--vcc-shadow);
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        font-size: 13px; line-height: 1.4; text-align: left;
        box-sizing: border-box; overflow: hidden;
        margin: 0; padding: 0; right: auto; bottom: auto; height: auto;
      }
      #vcc-cp * { box-sizing: border-box; }
      #vcc-cp button:focus-visible, #vcc-cp input:focus-visible { outline: 2px solid var(--vcc-accent); outline-offset: 1px; }

      #vcc-cp-bar {
        flex-shrink: 0; padding: 10px 12px 10px 16px;
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        border-bottom: 1px solid var(--vcc-border);
        cursor: grab; background: var(--vcc-bg-header);
      }
      #vcc-cp-bar:active { cursor: grabbing; }
      #vcc-cp-title { font: 600 13px/1.2 'JetBrains Mono',monospace; color: var(--vcc-text); letter-spacing: .03em; white-space: nowrap; }
      #vcc-cp-domain { font: 12px/1.2 monospace; color: var(--vcc-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      #vcc-cp-close { all: unset; box-sizing: border-box; color: var(--vcc-text-2); font-size: 14px; cursor: pointer; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      #vcc-cp-close:hover { background: var(--vcc-surface-hover); color: var(--vcc-text); }

      #vcc-cp-body { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
      #vcc-cp-scroll {
        overflow-y: auto; flex: 1; min-height: 0;
        scrollbar-width: auto; scrollbar-color: var(--vcc-scroll-thumb) var(--vcc-scroll-track);
      }
      #vcc-cp-scroll::-webkit-scrollbar { width: 10px; }
      #vcc-cp-scroll::-webkit-scrollbar-track { background: var(--vcc-scroll-track); }
      #vcc-cp-scroll::-webkit-scrollbar-thumb { background: var(--vcc-scroll-thumb); border-radius: 5px; border: 2px solid var(--vcc-scroll-track); }
      /* Indica que há mais conteúdo abaixo */
      #vcc-cp-fade {
        position: absolute; left: 0; right: 12px; bottom: 0; height: 40px;
        background: linear-gradient(to bottom, var(--vcc-fade), var(--vcc-bg) 85%);
        pointer-events: none; display: flex; align-items: flex-end; justify-content: center;
        padding-bottom: 3px; color: var(--vcc-text-3); font-size: 12px;
        opacity: 0; transition: opacity .15s;
      }
      #vcc-cp-fade.show { opacity: 1; }
      /* Indica que há mais conteúdo acima */
      #vcc-cp-fade-top {
        position: absolute; left: 0; right: 12px; top: 0; height: 40px;
        background: linear-gradient(to top, var(--vcc-fade), var(--vcc-bg) 85%);
        pointer-events: none; display: flex; align-items: flex-start; justify-content: center;
        padding-top: 2px; color: var(--vcc-text-3); font-size: 12px;
        opacity: 0; transition: opacity .15s;
      }
      #vcc-cp-fade-top.show { opacity: 1; }

      #vcc-cp-foot { flex-shrink: 0; padding: 10px 16px; border-top: 1px solid var(--vcc-border); background: var(--vcc-bg-header); }
      #vcc-cp-foot button { width: 100%; justify-content: center; }

      .vcc-acc { border-bottom: 1px solid var(--vcc-border); }
      .vcc-acc:last-child { border-bottom: none; }
      .vcc-acc-hdr { all: unset; box-sizing: border-box; width: 100%; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; color: var(--vcc-text); font-family: inherit; font-size: 13px; font-weight: 600; line-height: 1.3; }
      .vcc-acc-hdr:hover { background: var(--vcc-surface); }
      .vcc-acc-hdr-left { display: flex; align-items: center; gap: 9px; }
      .vcc-acc-icon { font-size: 13px; width: 16px; text-align: center; color: var(--vcc-accent); }
      .vcc-arr { font-size: 13px; color: var(--vcc-text-3); transition: transform .18s; display: inline-block; }
      .vcc-arr.open { transform: rotate(90deg); }
      .vcc-acc-body { display: none; padding: 2px 16px 14px; }
      .vcc-acc-body.open { display: block; }

      .vcc-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--vcc-border); }
      .vcc-row:last-child { border-bottom: none; }
      .vcc-row-label { font-size: 13px; color: var(--vcc-text); }
      .vcc-row-sub   { font-size: 12px; color: var(--vcc-text-3); margin-top: 2px; }
      .vcc-row.vcc-off { opacity: .55; }

      .vcc-tog { all: unset; box-sizing: border-box; width: 34px; height: 20px; border-radius: 10px; background: var(--vcc-toggle-off); position: relative; cursor: pointer; transition: background .18s; flex-shrink: 0; }
      .vcc-tog.on { background: var(--vcc-accent-fill); }
      .vcc-tog:disabled { cursor: not-allowed; opacity: .5; }
      .vcc-tog-t  { position: absolute; width: 16px; height: 16px; border-radius: 50%; background: var(--vcc-knob); top: 2px; left: 2px; transition: left .16s; }
      .vcc-tog.on .vcc-tog-t { left: 16px; }

      .vcc-spd-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
      .vcc-spd-btn { all: unset; box-sizing: border-box; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; color: var(--vcc-text); font-size: 14px; min-width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: inherit; }
      .vcc-spd-btn:hover { background: var(--vcc-surface-hover); }
      .vcc-spd-btn.sm { font-size: 12px; padding: 0 10px; }

      .vcc-spd-in, .vcc-num-in { background: var(--vcc-surface); border: 1px solid var(--vcc-border-strong); border-radius: 6px; color: var(--vcc-text); font-family: 'JetBrains Mono',monospace; text-align: center; outline: none; }
      .vcc-spd-in { font-size: 15px; font-weight: 600; width: 90px; height: 30px; padding: 0 8px; }
      .vcc-num-in { font-size: 13px; width: 72px; padding: 4px 6px; }
      .vcc-spd-in:focus, .vcc-num-in:focus { border-color: var(--vcc-accent); }

      .vcc-eta { font-size: 12px; color: var(--vcc-text-2); line-height: 1.5; padding: 7px 10px; background: var(--vcc-surface); border-radius: 6px; border: 1px solid var(--vcc-border); }
      .vcc-eta strong { color: var(--vcc-text); font-weight: 600; }

      .vcc-preset-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin-bottom: 8px; }
      .vcc-pc { all: unset; box-sizing: border-box; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; padding: 6px 4px; text-align: center; font: 12px 'JetBrains Mono',monospace; color: var(--vcc-text-2); cursor: pointer; }
      .vcc-pc:hover { background: var(--vcc-surface-hover); color: var(--vcc-text); }
      .vcc-pc.sel   { background: var(--vcc-accent-soft); border-color: var(--vcc-accent); color: var(--vcc-accent); font-weight: 600; }

      .vcc-slr { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
      .vcc-slr label { font-size: 12px; color: var(--vcc-text-2); min-width: 104px; }
      .vcc-slr input[type=range] { flex: 1; accent-color: var(--vcc-accent-fill); }
      .vcc-slv { font: 12px monospace; color: var(--vcc-text-2); min-width: 44px; text-align: right; }

      .vcc-loop-status { font-size: 12px; color: var(--vcc-text-2); background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; padding: 6px 10px; margin-top: 6px; line-height: 1.6; }
      .vcc-loop-status .pt   { color: var(--vcc-accent); font-family: monospace; font-weight: 600; }
      .vcc-loop-status .none { color: var(--vcc-text-3); font-style: italic; }
      .vcc-loop-status .on   { color: var(--vcc-accent); font-size: 11px; }

      .vcc-abt { all: unset; box-sizing: border-box; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; color: var(--vcc-text); font-size: 12px; padding: 6px 10px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 5px; }
      .vcc-abt:hover { background: var(--vcc-surface-hover); }
      .vcc-abt:disabled { opacity: 0.5; cursor: not-allowed; }
      .vcc-abt.primary { background: var(--vcc-accent-fill); border-color: var(--vcc-accent-fill); color: var(--vcc-on-accent); font-weight: 600; }
      .vcc-abt.primary:hover { filter: brightness(1.08); }
      .vcc-abt.danger { color: var(--vcc-danger); border-color: var(--vcc-danger); background: var(--vcc-danger-soft); }
      .vcc-abts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }

      .vcc-seg { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 6px; }
      .vcc-seg button { all: unset; box-sizing: border-box; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; color: var(--vcc-text-2); font-family: inherit; font-size: 12px; line-height: 1.2; padding: 6px 10px; cursor: pointer; }
      .vcc-seg button:hover { background: var(--vcc-surface-hover); color: var(--vcc-text); }
      .vcc-seg button.active { background: var(--vcc-accent-soft); border-color: var(--vcc-accent); color: var(--vcc-accent); font-weight: 600; }

      .vcc-anchor-grid { display: grid; grid-template-columns: repeat(3, 42px); gap: 4px; margin: 6px 0 4px; }
      .vcc-anchor-grid button { all: unset; box-sizing: border-box; height: 28px; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; color: var(--vcc-text-2); font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .vcc-anchor-grid button:hover { background: var(--vcc-surface-hover); color: var(--vcc-text); }
      .vcc-anchor-grid button.active { background: var(--vcc-accent-soft); border-color: var(--vcc-accent); color: var(--vcc-accent); }
      .vcc-anchor-grid.vcc-off { opacity: .5; pointer-events: none; }

      .vcc-vrow { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--vcc-border); }
      .vcc-vrow:last-child { border-bottom: none; }
      .vcc-vthumb { all: unset; box-sizing: border-box; width: 34px; height: 24px; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 4px; display: flex; align-items: center; justify-content: center; font: 11px monospace; color: var(--vcc-text-2); flex-shrink: 0; cursor: pointer; }
      .vcc-vthumb:hover { background: var(--vcc-surface-hover); color: var(--vcc-text); }
      .vcc-vthumb.primary { background: var(--vcc-accent-soft); border-color: var(--vcc-accent); color: var(--vcc-accent); }
      .vcc-vname  { font-size: 12px; color: var(--vcc-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .vcc-vmeta  { font-size: 11px; color: var(--vcc-text-3); }
      .vcc-primary-badge { font: 10px monospace; background: var(--vcc-accent-soft); color: var(--vcc-accent); border-radius: 3px; padding: 1px 5px; margin-left: 5px; vertical-align: middle; }
      .vcc-chk    { all: unset; box-sizing: border-box; width: 18px; height: 18px; border: 1px solid var(--vcc-border-strong); border-radius: 4px; background: var(--vcc-surface); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; color: var(--vcc-accent); }
      .vcc-chk.on { background: var(--vcc-accent-soft); border-color: var(--vcc-accent); }
      .vcc-vid-actions { display: flex; gap: 3px; flex-shrink: 0; }
      .vcc-vid-btn { all: unset; box-sizing: border-box; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 4px; color: var(--vcc-text-2); font: 11px monospace; width: 24px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .vcc-vid-btn:hover { background: var(--vcc-surface-hover); color: var(--vcc-text); }
      .vcc-vid-btn.on { color: var(--vcc-accent); border-color: var(--vcc-accent); }
      .vcc-vid-btn.danger:hover { background: var(--vcc-danger-soft); color: var(--vcc-danger); border-color: var(--vcc-danger); }

      .vcc-kbd-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--vcc-border); }
      .vcc-kbd-row:last-child { border-bottom: none; }
      .vcc-kbd-row.fixed { opacity: .8; }
      .vcc-kbd-action { font-size: 12px; color: var(--vcc-text); flex: 1; }
      .vcc-kbd-key { font: 12px 'JetBrains Mono',monospace; background: var(--vcc-surface); border: 1px solid var(--vcc-border-strong); border-radius: 4px; padding: 3px 7px; color: var(--vcc-text); cursor: pointer; min-width: 30px; text-align: center; user-select: none; }
      .vcc-kbd-key:hover { background: var(--vcc-surface-hover); }
      .vcc-kbd-row.fixed .vcc-kbd-key { cursor: default; }
      .vcc-kbd-key.capturing { background: var(--vcc-accent-soft); border-color: var(--vcc-accent); color: var(--vcc-accent); animation: vcc-blink .6s infinite; }
      .vcc-kbd-key.error { background: var(--vcc-danger-soft); border-color: var(--vcc-danger); color: var(--vcc-danger); }
      @keyframes vcc-blink { 0%,100%{opacity:1}50%{opacity:.45} }
      .vcc-kbd-clear { all: unset; color: var(--vcc-text-3); font-size: 11px; cursor: pointer; padding: 3px 5px; border-radius: 4px; margin-left: 4px; line-height: 1; }
      .vcc-kbd-clear:hover { color: var(--vcc-danger); background: var(--vcc-danger-soft); }

      .vcc-scope-tabs { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
      .vcc-scope-tab { all: unset; box-sizing: border-box; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; color: var(--vcc-text-2); font-size: 12px; padding: 5px 10px; cursor: pointer; font-family: inherit; }
      .vcc-scope-tab:hover { color: var(--vcc-text); }
      .vcc-scope-tab.active { background: var(--vcc-accent-soft); border-color: var(--vcc-accent); color: var(--vcc-accent); font-weight: 600; }

      .vcc-site-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--vcc-border); }
      .vcc-site-row:last-child { border-bottom: none; }
      .vcc-site-name { font-size: 13px; color: var(--vcc-text); }

      .vcc-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
      .vcc-sc { background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; padding: 8px 10px; }
      .vcc-sv { font: 600 17px monospace; color: var(--vcc-text); }
      .vcc-sl { font-size: 12px; color: var(--vcc-text-2); margin-top: 2px; }

      .vcc-ci   { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--vcc-border); }
      .vcc-ci:last-child { border-bottom: none; }
      .vcc-cdot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
      .vcc-ct   { font-size: 12px; color: var(--vcc-text); line-height: 1.5; }
      .vcc-ctag { font: 11px monospace; padding: 1px 6px; border-radius: 3px; }
      .vcc-ok   { background: var(--vcc-accent-soft); color: var(--vcc-accent); }
      .vcc-warn { background: var(--vcc-warn-soft); color: var(--vcc-warn); }
      .vcc-err  { background: var(--vcc-danger-soft); color: var(--vcc-danger); }
      .vcc-dot-ok { background: var(--vcc-accent); } .vcc-dot-warn { background: var(--vcc-warn); } .vcc-dot-err { background: var(--vcc-danger); }

      .vcc-sub-title { font-size: 12px; font-weight: 600; color: var(--vcc-text-2); margin: 8px 0 5px; letter-spacing: .02em; }
      .vcc-sub-title:first-child { margin-top: 2px; }
      .vcc-hint { font-size: 12px; color: var(--vcc-text-3); margin: 6px 0 0; line-height: 1.5; }
      .vcc-danger-zone { border: 1px solid var(--vcc-danger); border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
      .vcc-danger-title { font-size: 12px; color: var(--vcc-danger); margin-bottom: 8px; font-weight: 600; }
      .vcc-storage-list { margin-bottom: 8px; font: 11px/1.8 monospace; color: var(--vcc-text-2); }
      .vcc-storage-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 2px 0; border-bottom: 1px solid var(--vcc-border); }
      .vcc-storage-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .vcc-storage-row .k { flex: 1; color: var(--vcc-text); }
      .vcc-storage-row .v { max-width: 140px; color: var(--vcc-text-3); }

      .vcc-site-warning { margin: 12px 16px 8px; padding: 12px; border: 1px solid var(--vcc-warn-border); border-radius: 8px; background: var(--vcc-warn-soft); }
      .vcc-site-warning-title { color: var(--vcc-warn); font-size: 13px; font-weight: 700; margin-bottom: 4px; }
      .vcc-site-warning-text { color: var(--vcc-text); font-size: 12px; line-height: 1.5; margin-bottom: 10px; }

      .vcc-mark-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid var(--vcc-border); }
      .vcc-mark-row:last-child { border-bottom: none; }
      .vcc-mark-time { all: unset; box-sizing: border-box; font: 600 12px 'JetBrains Mono',monospace; color: var(--vcc-accent); background: var(--vcc-accent-soft); border: 1px solid var(--vcc-accent); border-radius: 4px; padding: 3px 7px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
      .vcc-mark-time:hover { filter: brightness(1.1); }
      .vcc-mark-name { flex: 1; min-width: 0; background: var(--vcc-surface); border: 1px solid var(--vcc-border-strong); border-radius: 6px; color: var(--vcc-text); font: 12px/1.3 inherit; font-family: inherit; padding: 4px 8px; outline: none; }
      .vcc-mark-name:focus { border-color: var(--vcc-accent); }
      .vcc-mark-name::placeholder { color: var(--vcc-text-3); }
      .vcc-pan { display: grid; grid-template-columns: repeat(4, 30px); gap: 4px; }
      .vcc-pan button { all: unset; box-sizing: border-box; height: 28px; background: var(--vcc-surface); border: 1px solid var(--vcc-border); border-radius: 6px; color: var(--vcc-text); font-size: 13px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .vcc-pan button:hover { background: var(--vcc-surface-hover); }
      .vcc-pan button:disabled { cursor: not-allowed; }

      .vcc-video-feature.vcc-disabled > .vcc-acc-hdr { color: var(--vcc-text-3); }
      .vcc-video-feature.vcc-disabled > .vcc-acc-hdr::after { content: attr(data-inactive); margin-left: auto; margin-right: 10px; color: var(--vcc-warn); font: 11px monospace; }
      .vcc-video-feature.vcc-disabled > .vcc-acc-body { opacity: .45; pointer-events: none; }
      .vcc-video-control.vcc-disabled { opacity: .45; pointer-events: none; }
    `;
    const s = document.createElement('style');
    s.id = 'vcc-styles'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // ─────────────────────────────────────────────
  // BARRA DE CONTROLE
  //
  // Uma barra só (vídeo principal/selecionados) ou, com o posicionamento
  // automático, uma barra em cada vídeo. Cada item de `bars` é
  // { el, video, flashing, flashTimer, placed }: video = null na barra única.
  // ─────────────────────────────────────────────
  let bars = [];
  let positionTimer = null;

  const perVideoBars = () => state.barAuto && state.barLayout === 'perVideo';

  // Dica dos botões: "Z — retroceder", usando a tecla configurada no momento.
  function keyTitle(action, key) {
    return KEYS[action] ? `${KEYS[action]} — ${t(key)}` : t(key);
  }

  function buildBarElement(video) {
    const el = document.createElement('div');
    el.className = 'vcc-bar';
    if (!video) el.id = 'vcc-cb';
    el.lang = lang;
    el.setAttribute('role', 'toolbar');
    el.setAttribute('aria-label', 'VCC');
    setSafeHTML(el, escapeHTML`
      ${state.barAuto ? '' : escapeHTML`<span class="vcc-bar-grip" title="${t('cb.drag')}" aria-hidden="true">⋮⋮</span>`}
      <button data-act="back" title="${keyTitle('seekBack', 'cb.back')}" aria-label="${t('cb.back')}">«</button>
      <button data-act="slow" title="${keyTitle('slowDown', 'cb.slower')}" aria-label="${t('cb.slower')}">−</button>
      <span class="vcc-bar-label vcc-bar-speed" aria-live="polite"${state.barWheel ? escapeHTML` title="${t('cb.wheelSpeed')}"` : ''}>1.0×</span>
      <button data-act="fast" title="${keyTitle('speedUp', 'cb.faster')}" aria-label="${t('cb.faster')}">+</button>
      <button data-act="fwd"  title="${keyTitle('seekFwd', 'cb.fwd')}" aria-label="${t('cb.fwd')}">»</button>
      <span class="vcc-bar-div"></span>
      <button data-act="vdown" title="${keyTitle('volumeDown', 'cb.volDown')}" aria-label="${t('cb.volDown')}">🔉</button>
      <button data-act="mute" class="vcc-bar-vol" title="${keyTitle('toggleMute', 'cb.muteToggle')}" aria-label="${t('cb.muteToggle')}">100%</button>
      <button data-act="vup" title="${keyTitle('volumeUp', 'cb.volUp')}" aria-label="${t('cb.volUp')}">🔊</button>
      <span class="vcc-bar-div"></span>
      <button data-act="panel" class="vcc-bar-cfg" title="${keyTitle('toggleCP', 'cb.panel')}" aria-label="${t('cb.panel')}">≡</button>
    `);
    // O contêiner é protegido do CSS do site com "all: initial !important";
    // por isso tudo nele é definido inline com !important.
    el.style.cssText = `
      all: initial !important;
      position: fixed !important;
      z-index: 2147483647 !important;
      left: 12px !important;
      top: 12px !important;
      display: none !important;
      align-items: center !important;
      gap: 2px !important;
      padding: 3px 5px !important;
      background: var(--vcc-bg) !important;
      color: var(--vcc-text) !important;
      border: 1px solid var(--vcc-border-strong) !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,.28) !important;
      font: 12px/1 'JetBrains Mono','Fira Mono','Courier New',monospace !important;
      user-select: none !important;
      opacity: ${state.cbOpacity} !important;
      box-sizing: border-box !important;
      pointer-events: auto !important;
    `;
    SHARED.applyThemeVars(el, currentTheme());
    return el;
  }

  function createBar(video) {
    const bar = { el: buildBarElement(video), video, flashing: false, flashTimer: null, placed: true };
    // Anexa ao <html> para escapar de qualquer overflow/clip no <body>
    document.documentElement.appendChild(bar.el);

    bar.el.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); onBarAction(bar, btn.dataset.act); });
    });
    const grip = bar.el.querySelector('.vcc-bar-grip');
    if (grip) makeDraggable(bar.el, grip, (x, y) => savePos(x, y));
    // Roda do mouse: sobre o volume muda o volume; no resto da barra, a velocidade.
    bar.el.addEventListener('wheel', e => {
      if (!state.barWheel || !e.deltaY) return;
      e.preventDefault(); e.stopPropagation();
      const up = e.deltaY < 0 ? 1 : -1;
      const overVolume = !!e.target.closest?.('[data-act="vdown"], [data-act="mute"], [data-act="vup"]');
      if (overVolume) onBarAction(bar, up > 0 ? 'vup' : 'vdown');
      else onBarAction(bar, up > 0 ? 'fast' : 'slow');
    }, { passive: false });
    shieldFromPage(bar.el);
    placeInPage(bar.el);

    bars.push(bar);
    updateBarDisplay(bar);
    positionBar(bar);
    refreshBarVisibility(bar);
    return bar;
  }

  function onBarAction(bar, act) {
    const vid = bar.video;
    if (act === 'panel') { toggleCPVisibility(); return; }
    if (vid) {
      // Barra presa a um vídeo: controla só esse vídeo.
      if (act === 'back')  { seekVideo(vid, -state.seekStep); flashCB(b => seekFlashText(-state.seekStep, b), [vid]); }
      if (act === 'fwd')   { seekVideo(vid, +state.seekStep); flashCB(b => seekFlashText(+state.seekStep, b), [vid]); }
      if (act === 'slow')  setVideoSpeed(vid, videoSpeed(vid) - state.speedStep);
      if (act === 'fast')  setVideoSpeed(vid, videoSpeed(vid) + state.speedStep);
      if (act === 'vdown') changeVideoVolume(vid, -state.volumeStep);
      if (act === 'vup')   changeVideoVolume(vid, +state.volumeStep);
      if (act === 'mute')  toggleVideoMute(vid);
      return;
    }
    if (act === 'back')  applySeek(-state.seekStep);
    if (act === 'fwd')   applySeek(+state.seekStep);
    if (act === 'slow')  changeSpeed(-state.speedStep);
    if (act === 'fast')  changeSpeed(+state.speedStep);
    if (act === 'vdown') changeVolume(-state.volumeStep);
    if (act === 'vup')   changeVolume(+state.volumeStep);
    if (act === 'mute')  toggleMute();
  }

  function removeAllBars() {
    bars.forEach(bar => { clearTimeout(bar.flashTimer); bar.el.remove(); });
    bars = [];
  }

  // Recria as barras conforme as opções atuais (uma só ou uma por vídeo).
  function rebuildBars() {
    removeAllBars();
    if (!videoEngineStarted || !state.videoControlsActive) { updatePositionLoop(); return; }
    if (perVideoBars()) state.videos.filter(v => v.isConnected).forEach(v => createBar(v));
    else createBar(null);
    updatePositionLoop();
  }

  // Mantém uma barra por vídeo: cria para vídeos novos, remove de vídeos que saíram.
  function syncBars() {
    if (!videoEngineStarted || !state.videoControlsActive) return;
    if (!perVideoBars()) { if (!bars.length) createBar(null); return; }
    bars.filter(b => !b.video || !b.video.isConnected).forEach(b => { clearTimeout(b.flashTimer); b.el.remove(); });
    bars = bars.filter(b => b.video && b.video.isConnected);
    state.videos.forEach(v => { if (v.isConnected && !bars.some(b => b.video === v)) createBar(v); });
  }

  function barSpeedText(bar) {
    return fmtSpeed(bar.video ? videoSpeed(bar.video) : state.speed) + '×';
  }

  function barVolumeText(bar) {
    const vid = bar.video;
    if (vid) return vid.muted ? t('flash.muted') : `${Math.round(vid.volume * 100)}%`;
    return state.muted ? t('flash.muted') : `${Math.round(state.volume * 100)}%`;
  }

  function updateBarDisplay(bar) {
    const speed = bar.el.querySelector('.vcc-bar-speed');
    const vol = bar.el.querySelector('.vcc-bar-vol');
    if (speed && !bar.flashing) speed.textContent = barSpeedText(bar);
    if (vol) vol.textContent = barVolumeText(bar);
  }

  function updateBarsDisplay() { bars.forEach(updateBarDisplay); }

  function refreshBarVisibility(bar) {
    const show = state.videoControlsActive && bar.placed && (state.cbMode === 'visible' || bar.flashing);
    bar.el.style.setProperty('display', show ? 'flex' : 'none', 'important');
  }

  // Três modos: visible → alerts → hidden → visible
  function cycleCBMode() {
    const modes = SHARED.MODES;
    setBarMode(modes[(modes.indexOf(state.cbMode) + 1) % modes.length]);
    flashCB(t('flash.mode', { mode: t(`mode.${state.cbMode}`) }), null, true);
  }

  function setBarMode(mode) {
    state.cbMode = mode;
    save(gk('cbMode'), state.cbMode);
    bars.forEach(refreshBarVisibility);
    updateBarSectionUI();
  }

  // Mostra um aviso rápido na barra (velocidade, volume…). `text` pode ser uma
  // função (barra) → texto, para avisos que dependem do vídeo de cada barra. `videos` limita às
  // barras desses vídeos no modo "uma barra por vídeo". No modo "oculta", só
  // avisos forçados (troca de modo) aparecem.
  function flashCB(text, videos = null, force = false) {
    if (!bars.length) return;
    if (state.cbMode === 'hidden' && !force) { updateBarsDisplay(); return; }
    const list = videos || targetVideoList();
    const targets = bars.filter(bar => !bar.video || list.includes(bar.video));
    const dur = state.cbMode === 'visible' ? 900 : state.alertDuration;
    targets.forEach(bar => {
      const label = bar.el.querySelector('.vcc-bar-speed');
      const msg = typeof text === 'function' ? text(bar) : text;
      if (label && msg != null) label.textContent = msg;
      bar.flashing = true;
      positionBar(bar);
      refreshBarVisibility(bar);
      clearTimeout(bar.flashTimer);
      bar.flashTimer = setTimeout(() => {
        bar.flashing = false;
        updateBarDisplay(bar);
        refreshBarVisibility(bar);
      }, dur);
    });
    bars.filter(b => !targets.includes(b)).forEach(updateBarDisplay);
  }

  // ── Tela cheia ──
  // Em tela cheia o navegador só desenha (e só deixa clicar) o que está dentro
  // do elemento em tela cheia. Por isso a barra e o painel são movidos para
  // dentro dele e voltam para o <html> quando a tela cheia termina.
  // Quando o elemento em tela cheia é o próprio <video> (ou não aceita filhos
  // visíveis), eles vão para a "camada superior" como popovers: aparecem por
  // cima do vídeo, mas em alguns navegadores não recebem cliques — os atalhos
  // de teclado continuam valendo.
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

  function fullscreenHost() {
    const fs = fullscreenElement();
    if (!fs || fs.shadowRoot || ['VIDEO', 'IFRAME', 'CANVAS', 'IMG'].includes(fs.tagName)) return null;
    return fs;
  }

  function setPopover(el, open, restack = false) {
    if (typeof el.showPopover !== 'function') return;
    const isOpen = el.matches(':popover-open');
    if (open) {
      if (el.getAttribute('popover') !== 'manual') el.setAttribute('popover', 'manual');
      // Reabrir coloca o elemento acima do que acabou de entrar em tela cheia.
      if (isOpen && restack) el.hidePopover();
      if (!el.matches(':popover-open')) el.showPopover();
    } else if (el.hasAttribute('popover')) {
      if (isOpen) el.hidePopover();
      el.removeAttribute('popover');
    }
  }

  // Coloca a barra ou o painel no lugar certo da página (ver acima). Também
  // recoloca o elemento se o site o tiver removido.
  function placeInPage(el, restack = false) {
    if (!el) return;
    try {
      const fs = fullscreenElement();
      const host = fullscreenHost();
      const parent = host || document.documentElement;
      if (el.parentNode !== parent) { setPopover(el, false); parent.appendChild(el); }
      setPopover(el, !!fs && !host, restack);
    } catch {}
  }

  // Cliques na barra e no painel não devem chegar ao player (onde um clique
  // pausa o vídeo e um duplo clique sai da tela cheia).
  function shieldFromPage(el) {
    ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'contextmenu']
      .forEach(type => el.addEventListener(type, e => e.stopPropagation()));
  }

  function onFullscreenChange() {
    bars.forEach(bar => placeInPage(bar.el, true));
    placeInPage(cpEl, true);
    positionBars();
    schedulePosition();
  }
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  // ── Posicionamento ──
  function positionBar(bar) {
    const el = bar.el;
    placeInPage(el);
    if (!state.barAuto) {
      // Posição livre, salva por site e mantida dentro da janela.
      const x = clampToViewport(state.cbPos?.x ?? 12, 60, 'x');
      const y = clampToViewport(state.cbPos?.y ?? 12, 30, 'y');
      el.style.setProperty('left', x + 'px', 'important');
      el.style.setProperty('top', y + 'px', 'important');
      el.style.setProperty('transform', 'none', 'important');
      bar.placed = true;
      return;
    }
    const vid = bar.video || state.videos[state.primaryVideo] || state.videos.find(v => v.isConnected);
    let r = null;
    try { r = vid && vid.isConnected ? videoBox(vid) : null; } catch {}
    const visible = r && r.width >= MIN_VIDEO_W && r.height >= MIN_VIDEO_H &&
      r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
    bar.placed = !!visible;
    if (!visible) return;

    const [v, h] = state.barAnchor.split('-');
    const x = h === 'left' ? r.left + BAR_MARGIN : h === 'right' ? r.right - BAR_MARGIN : r.left + r.width / 2;
    const y = v === 'top' ? r.top + BAR_MARGIN : r.bottom - BAR_MARGIN;
    const tx = h === 'left' ? '0' : h === 'right' ? '-100%' : '-50%';
    const ty = v === 'top' ? '0' : '-100%';
    el.style.setProperty('left', Math.round(Math.max(0, Math.min(window.innerWidth, x))) + 'px', 'important');
    el.style.setProperty('top', Math.round(Math.max(0, Math.min(window.innerHeight, y))) + 'px', 'important');
    el.style.setProperty('transform', `translate(${tx}, ${ty})`, 'important');
  }

  function positionBars() {
    if (state.barAuto && perVideoBars()) syncBars();
    bars.forEach(bar => { positionBar(bar); refreshBarVisibility(bar); });
  }

  let positionFrame = 0;
  function schedulePosition() {
    if (positionFrame) return;
    positionFrame = requestAnimationFrame(() => { positionFrame = 0; positionBars(); });
  }
  window.addEventListener('scroll', () => { if (state.barAuto) schedulePosition(); }, { capture: true, passive: true });
  window.addEventListener('resize', schedulePosition, { passive: true });

  // No posicionamento automático, acompanha mudanças de layout do player.
  function updatePositionLoop() {
    clearInterval(positionTimer);
    positionTimer = null;
    if (state.barAuto && bars.length) positionTimer = setInterval(positionBars, 400);
  }

  // Opções da barra mudaram (modo, posicionamento, uma por vídeo): aplica.
  function setBarOption(name, value) {
    state[name] = value;
    save(gk(name), value);
    rebuildBars();
    rebuildPanel();
  }

  // ─────────────────────────────────────────────
  // DRAG & DROP
  // ─────────────────────────────────────────────
  // Mantém uma coordenada dentro da janela, deixando pelo menos `margin` px visíveis.
  function clampToViewport(v, margin, axis) {
    const max = (axis === 'x' ? window.innerWidth : window.innerHeight) - margin;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(Math.max(0, max), Math.round(n))) : 12;
  }

  function makeDraggable(el, handle, onDrop) {
    let startX, startY, origX, origY, dragging = false;
    handle.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (e.target.closest && e.target.closest('button') && e.target.closest('button') !== handle) return;
      dragging = true; startX = e.clientX; startY = e.clientY;
      const r = el.getBoundingClientRect(); origX = r.left; origY = r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  origX + e.clientX - startX));
      const ny = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, origY + e.clientY - startY));
      // Com !important: a barra usa "all: initial !important" no estilo próprio,
      // que anularia uma posição gravada sem prioridade.
      el.style.setProperty('left', nx + 'px', 'important');
      el.style.setProperty('top', ny + 'px', 'important');
      el.style.setProperty('transform', 'none', 'important');
    }, true);
    // Na captura: a barra e o painel não deixam o mouseup chegar ao documento.
    document.addEventListener('mouseup', () => {
      if (!dragging) return; dragging = false;
      const r = el.getBoundingClientRect(); if (onDrop) onDrop(r.left, r.top);
    }, true);
  }

  // ─────────────────────────────────────────────
  // PAINEL
  // ─────────────────────────────────────────────
  let cpEl = null, capturingKey = null, currentScope = 'default';

  function buildCP() {
    cpEl = document.createElement('div');
    cpEl.id = 'vcc-cp';
    cpEl.lang = lang;
    cpEl.setAttribute('role', 'dialog');
    cpEl.setAttribute('aria-label', 'VCC — Video Command Center');
    // Opacity e display controlados por JS — não pelo CSS do site
    cpEl.style.setProperty('opacity', state.cpOpacity, 'important');
    cpEl.style.setProperty('display', state.cpVisible ? 'flex' : 'none', 'important');
    SHARED.applyThemeVars(cpEl, currentTheme());

    setSafeHTML(cpEl, escapeHTML`
      <div id="vcc-cp-bar">
        <span id="vcc-cp-title">VCC</span>
        <span id="vcc-cp-domain" title="${domain}">${domain}</span>
        <button id="vcc-cp-close" title="${t('cp.close')}" aria-label="${t('cp.close')}">✕</button>
      </div>
      <div id="vcc-cp-body">
        <div id="vcc-cp-scroll"><div id="vcc-site-status"></div><div id="vcc-cp-content"></div></div>
        <div id="vcc-cp-fade-top" aria-hidden="true">▴</div>
        <div id="vcc-cp-fade" aria-hidden="true">▾</div>
      </div>
      ${IS_EXTENSION ? escapeHTML`<div id="vcc-cp-foot"><button class="vcc-abt" id="vcc-open-settings">⚙ ${t('cp.settings')}</button></div>` : ''}
    `);

    // Mesmo root que a barra: escapa overflow/clip do <body>
    document.documentElement.appendChild(cpEl);
    shieldFromPage(cpEl);
    placeInPage(cpEl);
    cpEl.querySelector('#vcc-cp-close').addEventListener('click', toggleCPVisibility);
    cpEl.querySelector('#vcc-open-settings')?.addEventListener('click', openSettingsPage);
    makeDraggable(cpEl, cpEl.querySelector('#vcc-cp-bar'), null);

    const scroller = cpEl.querySelector('#vcc-cp-scroll');
    scroller.addEventListener('scroll', updateScrollCue, { passive: true });
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(updateScrollCue).observe(cpEl.querySelector('#vcc-cp-content'));
    }

    buildCPContent();
    updateCPSpeed(); updateETA(); buildVideoList(); renderCompatibility();
    updateImageUI(); renderMarks(); updateLoopStatus();
  }

  // Degradês no topo e no pé do painel enquanto houver conteúdo acima ou abaixo.
  function updateScrollCue() {
    const s = cpEl?.querySelector('#vcc-cp-scroll');
    if (!s) return;
    cpEl.querySelector('#vcc-cp-fade')?.classList.toggle('show', s.scrollHeight - s.scrollTop - s.clientHeight > 6);
    cpEl.querySelector('#vcc-cp-fade-top')?.classList.toggle('show', s.scrollTop > 6);
  }

  function openSettingsPage() {
    try {
      const r = extensionRuntime?.sendMessage?.({ type: 'VCC_OPEN_OPTIONS' });
      if (r?.catch) r.catch(() => {});
    } catch {}
  }

  // ── helpers de template ──
  function acc(id, icon, label, content, open = false, videoFeature = false) {
    const featureClass = videoFeature ? ` vcc-video-feature${state.videoControlsActive ? '' : ' vcc-disabled'}` : '';
    return escapeHTML`<div class="vcc-acc${featureClass}">
      <button class="vcc-acc-hdr" data-acc="${id}" data-inactive="${t('site.inactiveBadge')}" aria-expanded="${open ? 'true' : 'false'}">
        <span class="vcc-acc-hdr-left"><span class="vcc-acc-icon" aria-hidden="true">${icon}</span>${label}</span>
        <span class="vcc-arr${open ? ' open' : ''}" id="vcc-arr-${id}" aria-hidden="true">›</span>
      </button>
      <div class="vcc-acc-body${open ? ' open' : ''}" id="vcc-body-${id}">${content}</div>
    </div>`;
  }

  function tog(id, on, label, sub = '', opts = {}) {
    const rowClass = (opts.videoControl ? ` vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}` : '') + (opts.disabled ? ' vcc-off' : '');
    return escapeHTML`<div class="vcc-row${rowClass}">
      <div><div class="vcc-row-label" id="vcc-lbl-${id}">${label}</div>${sub ? escapeHTML`<div class="vcc-row-sub">${sub}</div>` : ''}</div>
      <button class="vcc-tog${on ? ' on' : ''}" id="vcc-tog-${id}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-labelledby="vcc-lbl-${id}"${opts.disabled ? ' disabled' : ''}><span class="vcc-tog-t"></span></button>
    </div>`;
  }

  function seg(id, options, active) {
    return escapeHTML`<div class="vcc-seg" id="${id}" role="group">${options.map(([value, label]) =>
      escapeHTML`<button data-value="${value}" class="${value === active ? 'active' : ''}" aria-pressed="${value === active ? 'true' : 'false'}">${label}</button>`)}</div>`;
  }

  const ANCHOR_ARROWS = { 'top-left': '↖', 'top-center': '↑', 'top-right': '↗', 'bottom-left': '↙', 'bottom-center': '↓', 'bottom-right': '↘' };

  // Seção "Barra de controle" (painel da extensão e do Tampermonkey).
  function barSection() {
    const auto = state.barAuto;
    return acc('bar', '▭', t('sec.bar'), escapeHTML`
      <p class="vcc-sub-title">${t('bar.mode')}</p>
      ${seg('vcc-bar-mode', SHARED.MODES.map(m => [m, t(`mode.${m}`)]), state.cbMode)}
      <p class="vcc-hint" style="margin-top:0">${t('bar.modeHint', { key: KEYS.toggleCB || '—' })}</p>
      <div style="margin-top:8px">
        ${tog('barauto', auto, t('bar.auto'), t('bar.autoSub'))}
      </div>
      <p class="vcc-sub-title">${t('bar.anchor')}</p>
      <div class="vcc-anchor-grid${auto ? '' : ' vcc-off'}" id="vcc-bar-anchor" role="group" aria-label="${t('bar.anchor')}">
        ${SHARED.BAR_ANCHORS.map(a => escapeHTML`<button data-anchor="${a}" class="${a === state.barAnchor ? 'active' : ''}" title="${t('anchor.' + a)}" aria-label="${t('anchor.' + a)}" aria-pressed="${a === state.barAnchor ? 'true' : 'false'}"${auto ? '' : ' disabled'}>${ANCHOR_ARROWS[a]}</button>`)}
      </div>
      ${tog('barpervideo', state.barLayout === 'perVideo', t('bar.perVideo'), auto ? t('bar.perVideoSub') : t('bar.perVideoNeedsAuto'), { disabled: !auto })}
      ${auto ? '' : escapeHTML`<p class="vcc-hint">${t('bar.freeHint')}</p>`}
      ${tog('barwheel', state.barWheel, t('bar.wheel'), t('bar.wheelSub'))}
      ${IS_EXTENSION ? '' : escapeHTML`
        <div class="vcc-slr" style="margin-top:8px">
          <label for="vcc-alert-dur">${t('bh.alertDuration')}</label>
          <input type="range" id="vcc-alert-dur" min="200" max="3000" step="100" value="${state.alertDuration}">
          <span class="vcc-slv" id="vcc-alert-dur-val">${state.alertDuration}ms</span>
        </div>
        <p class="vcc-hint">${t('bh.alertHint')}</p>`}
    `);
  }

  // Atualiza os botões da seção da barra sem reconstruir o painel.
  function updateBarSectionUI() {
    cpEl?.querySelectorAll('#vcc-bar-mode button').forEach(b => {
      const on = b.dataset.value === state.cbMode;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
  }

  function buildCPContent() {
    const content = cpEl.querySelector('#vcc-cp-content');
    renderSiteStatus();
    const sections = [

      // ── Reprodução ──
      acc('pb', '▶', t('sec.playback'), escapeHTML`
        <div class="vcc-spd-row">
          <button class="vcc-spd-btn" id="vcc-spd-minus" aria-label="${t('cb.slower')}">−</button>
          <input class="vcc-spd-in" id="vcc-spd-input" type="number" min="0.1" max="16" step="0.1" value="1.0" aria-label="${t('pb.speedInput')}">
          <button class="vcc-spd-btn" id="vcc-spd-plus" aria-label="${t('cb.faster')}">+</button>
          <button class="vcc-spd-btn sm" id="vcc-spd-reset">${t('pb.reset')}</button>
          <button class="vcc-spd-btn sm" id="vcc-spd-toggle2x">${t('pb.toggle2x')}</button>
        </div>
        <div class="vcc-eta" id="vcc-eta">—</div>
        <p class="vcc-sub-title">${t('pb.presets')}</p>
        <div class="vcc-preset-grid" id="vcc-presets"></div>
        <div class="vcc-abts">
          <button class="vcc-abt" id="vcc-seek-back-long" title="${keyTitle('seekBackLong', 'cb.back')}" aria-label="${t('pb.seekBackBy', { n: state.seekStepLong })}">«« ${state.seekStepLong}s</button>
          <button class="vcc-abt" id="vcc-seek-back" title="${keyTitle('seekBack', 'cb.back')}">${t('pb.seekBack')}</button>
          <button class="vcc-abt" id="vcc-seek-fwd" title="${keyTitle('seekFwd', 'cb.fwd')}">${t('pb.seekFwd')}</button>
          <button class="vcc-abt" id="vcc-seek-fwd-long" title="${keyTitle('seekFwdLong', 'cb.fwd')}" aria-label="${t('pb.seekFwdBy', { n: state.seekStepLong })}">${state.seekStepLong}s »»</button>
        </div>
        <div class="vcc-abts">
          <button class="vcc-abt" id="vcc-frame-back" title="${keyTitle('frameBack', 'pb.frameHint')}">${t('pb.frameBack')}</button>
          <button class="vcc-abt" id="vcc-frame-fwd" title="${keyTitle('frameFwd', 'pb.frameHint')}">${t('pb.frameFwd')}</button>
        </div>
      `, true, true),

      // ── Áudio ──
      acc('au', '♪', t('sec.audio'), escapeHTML`
        <div class="vcc-slr"><label for="vcc-volume">${t('au.volume')}</label><input type="range" id="vcc-volume" min="0" max="100" value="${Math.round(state.volume * 100)}" step="1"><span class="vcc-slv" id="vcc-volume-val">${state.muted ? t('au.muted') : Math.round(state.volume * 100) + '%'}</span></div>
        <div class="vcc-abts"><button class="vcc-abt" id="vcc-volume-down">${t('au.lower')}</button><button class="vcc-abt" id="vcc-volume-mute">${t(state.muted ? 'au.unmute' : 'au.mute')}</button><button class="vcc-abt" id="vcc-volume-up">${t('au.raise')}</button></div>
      `, false, true),

      // ── Navegação ──
      acc('nv', '⊹', t('sec.nav'), escapeHTML`
        <p class="vcc-sub-title">${t('nv.loop')}</p>
        <p class="vcc-hint" style="margin-top:0">${t('nv.loopSub')}</p>
        <div class="vcc-abts" style="margin-bottom:4px">
          <button class="vcc-abt" id="vcc-loop-a">${t('nv.setA')}</button>
          <button class="vcc-abt" id="vcc-loop-b">${t('nv.setB')}</button>
          <button class="vcc-abt" id="vcc-loop-clear">${t('nv.clear')}</button>
          <button class="vcc-abt" id="vcc-loop-save" title="${t('nv.saveLoopHint')}" disabled>${t('nv.saveLoop')}</button>
        </div>
        <div class="vcc-loop-status" id="vcc-loop-status">
          <span class="none">${t('nv.noLoop')}</span>
        </div>
        <p class="vcc-sub-title" style="margin-top:12px">${t('nv.marks')}</p>
        <p class="vcc-hint" style="margin-top:0">${t('nv.marksSub')}</p>
        <div class="vcc-abts" style="margin-bottom:4px">
          <button class="vcc-abt" id="vcc-mark-add" title="${keyTitle('markAdd', 'key.markAdd')}">${t('nv.markAdd')}</button>
          <button class="vcc-abt" id="vcc-mark-prev" title="${keyTitle('markPrev', 'key.markPrev')}">${t('nv.markPrev')}</button>
          <button class="vcc-abt" id="vcc-mark-next" title="${keyTitle('markNext', 'key.markNext')}">${t('nv.markNext')}</button>
        </div>
        <div id="vcc-marks-list"></div>
        <div style="margin-top:8px">
          ${tog('resume', state.resume, t('nv.resume'), t('nv.resumeSub', { domain }))}
        </div>
        <div class="vcc-row">
          <div class="vcc-row-label">${t('nv.pip')}</div>
          <button class="vcc-abt" id="vcc-pip"${!document.pictureInPictureEnabled ? ' disabled' : ''}>${t(document.pictureInPictureEnabled ? 'nv.pipOn' : 'nv.pipUnavailable')}</button>
        </div>
        <div class="vcc-abts" style="margin-top:2px">
          <button class="vcc-abt" id="vcc-timestamp">${t('nv.timestamp')}</button>
          <button class="vcc-abt" id="vcc-snapshot" title="${keyTitle('snapshot', 'nv.snapshotHint')}">${t('nv.snapshot')}</button>
        </div>
      `, false, true),

      // ── Imagem ──
      acc('vs', '◑', t('sec.visual'), escapeHTML`
        ${tog('invert', state.filter.invert, t('vs.invert'), t('vs.invertSub'), { videoControl: true })}
        ${[['brightness', 'vs.brightness', 10, 200], ['contrast', 'vs.contrast', 50, 200], ['saturate', 'vs.saturation', 0, 200]].map(([name, label, min, max]) => escapeHTML`
        <div class="vcc-slr vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}"><label for="vcc-${name}">${t(label)}</label><input type="range" id="vcc-${name}" data-filter="${name}" min="${min}" max="${max}" value="${state.filter[name]}" step="5"><span class="vcc-slv" id="vcc-${name}-val">${state.filter[name]}%</span></div>`)}
        <div class="vcc-row vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}" style="margin-top:6px">
          <div><div class="vcc-row-label">${t('vs.rotation')}</div><div class="vcc-row-sub" id="vcc-rot-val">0°</div></div>
          <div class="vcc-abts" style="margin-top:0;flex-wrap:nowrap">
            <button class="vcc-abt" id="vcc-rot-left" title="${keyTitle('rotateLeft', 'vs.rotateLeft')}" aria-label="${t('vs.rotateLeft')}">⟲ 90°</button>
            <button class="vcc-abt" id="vcc-rot-right" title="${keyTitle('rotateRight', 'vs.rotateRight')}" aria-label="${t('vs.rotateRight')}">⟳ 90°</button>
            <button class="vcc-abt" id="vcc-rot-reset">${t('vs.rotateReset')}</button>
          </div>
        </div>
        ${tog('rotremember', state.siteRotation !== null, t('vs.rotRemember'), t('vs.rotRememberSub', { domain }), { videoControl: true })}
        <div class="vcc-row vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}">
          <div><div class="vcc-row-label">${t('vs.zoom')}</div><div class="vcc-row-sub" id="vcc-zoom-val">100%</div></div>
          <div class="vcc-abts" style="margin-top:0;flex-wrap:nowrap">
            <button class="vcc-abt" id="vcc-zoom-out" title="${keyTitle('zoomOut', 'vs.zoomOut')}" aria-label="${t('vs.zoomOut')}">−</button>
            <button class="vcc-abt" id="vcc-zoom-in" title="${keyTitle('zoomIn', 'vs.zoomIn')}" aria-label="${t('vs.zoomIn')}">+</button>
            <button class="vcc-abt" id="vcc-zoom-reset">${t('vs.zoomReset')}</button>
          </div>
        </div>
        <div class="vcc-row vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}" id="vcc-pan-row">
          <div><div class="vcc-row-label">${t('vs.pan')}</div><div class="vcc-row-sub">${t('vs.panSub')}</div></div>
          <div class="vcc-pan" role="group" aria-label="${t('vs.pan')}">
            <button data-pan="-1,0" title="${t('vs.panLeft')}" aria-label="${t('vs.panLeft')}">←</button>
            <button data-pan="0,-1" title="${t('vs.panUp')}" aria-label="${t('vs.panUp')}">↑</button>
            <button data-pan="0,1" title="${t('vs.panDown')}" aria-label="${t('vs.panDown')}">↓</button>
            <button data-pan="1,0" title="${t('vs.panRight')}" aria-label="${t('vs.panRight')}">→</button>
          </div>
        </div>
        ${tog('mirror', false, t('vs.mirror'), t('vs.mirrorSub'), { videoControl: true })}
        <div class="vcc-abts vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}"><button class="vcc-abt" id="vcc-image-reset">${t('vs.resetImage')}</button></div>
        <p class="vcc-sub-title" style="margin-top:10px">${t('vs.opacity')}</p>
        <div class="vcc-slr"><label for="vcc-cb-op">${t('vs.barOpacity')}</label><input type="range" id="vcc-cb-op" min="10" max="100" value="${Math.round(state.cbOpacity * 100)}" step="5"><span class="vcc-slv" id="vcc-cb-op-val">${Math.round(state.cbOpacity * 100)}%</span></div>
        <div class="vcc-slr"><label for="vcc-cp-op">${t('vs.panelOpacity')}</label><input type="range" id="vcc-cp-op" min="20" max="100" value="${Math.round(state.cpOpacity * 100)}" step="5"><span class="vcc-slv" id="vcc-cp-op-val">${Math.round(state.cpOpacity * 100)}%</span></div>
        <p class="vcc-hint">${siteHasOwnOpacity() ? t('vs.opacitySite', { domain }) : t('vs.opacityGlobal')}</p>
      `),

      // ── Barra de controle ──
      barSection(),

      // ── Vídeos na página ──
      acc('vi', '▣', t('sec.videos'), escapeHTML`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px">
          <span class="vcc-sub-title" style="margin:0" id="vcc-vid-count">${t('vi.countOther', { n: 0 })}</span>
          <button class="vcc-abt" id="vcc-vid-all">${t('vi.selectAll')}</button>
        </div>
        <p class="vcc-hint" style="margin:0 0 6px">${t('vi.hint')}</p>
        <div id="vcc-vid-list"></div>
      `, false, true),

      // ── Sessão e compatibilidade ──
      acc('st', '◎', t('sec.stats'), escapeHTML`
        <div class="vcc-stat-grid">
          <div class="vcc-sc"><div class="vcc-sv" id="stat-saved">0s</div><div class="vcc-sl">${t('st.saved')}</div></div>
          <div class="vcc-sc"><div class="vcc-sv" id="stat-watched">0s</div><div class="vcc-sl">${t('st.watched')}</div></div>
          <div class="vcc-sc"><div class="vcc-sv" id="stat-avgspd">—</div><div class="vcc-sl">${t('st.avgSpeed')}</div></div>
          <div class="vcc-sc"><div class="vcc-sv" id="stat-quality">—</div><div class="vcc-sl">${t('st.quality')}</div></div>
        </div>
        <p class="vcc-sub-title">${t('st.compat', { domain })}</p>
        <div id="vcc-compat"></div>
      `, false, true),
    ];

    // No Tampermonkey não há página de configurações: tudo fica no painel.
    if (!IS_EXTENSION) sections.push(...fullPanelSections());

    setSafeHTML(content, sections);

    bindCPEvents();
    buildPresets();
    if (!IS_EXTENSION) buildKeysList();
    buildVideoList();
    if (!IS_EXTENSION) refreshStorageList();
    requestAnimationFrame(updateScrollCue);
  }

  // Seções de configuração, só no painel do Tampermonkey.
  function fullPanelSections() {
    return [
      // ── Atalhos de teclado ──
      acc('ks', '⌨', t('sec.keys'), escapeHTML`
        <div class="vcc-scope-tabs" id="vcc-scope-tabs">
          <button class="vcc-scope-tab active" data-scope="default">${t('ks.default')}</button>
          <button class="vcc-scope-tab" data-scope="${domain}">${domain}</button>
          <button class="vcc-scope-tab" id="vcc-add-scope">${t('ks.addDomain')}</button>
        </div>
        <p class="vcc-hint" id="vcc-scope-hint" style="margin-top:0">${t('ks.hintGlobal')}</p>
        <div id="vcc-keys-list"></div>
        <div class="vcc-abts" style="margin-top:8px">
          <button class="vcc-abt" id="vcc-keys-copy-to-domain">${t('ks.copyTo', { domain })}</button>
          <button class="vcc-abt" id="vcc-keys-factory">${t('ks.factory')}</button>
        </div>
        <p class="vcc-hint">${t('ks.help')}</p>
      `),

      // ── Preferências: tema, idioma, incrementos ──
      acc('beh', '⚙', t('sec.behavior'), escapeHTML`
        <p class="vcc-sub-title">${t('theme.title')}</p>
        ${seg('vcc-theme-tabs', SHARED.THEMES_PREFS.map(p => [p, p === 'auto' ? t('theme.auto', { name: t('theme.' + SHARED.resolveTheme('auto')) }) : t('theme.' + p)]), state.themePref)}
        <p class="vcc-sub-title">🌐 ${t('lang.title')}</p>
        <div class="vcc-seg" id="vcc-lang-tabs" role="group">
          ${['auto', ...I18N.SUPPORTED].map(code => escapeHTML`<button class="${langPref === code ? 'active' : ''}" data-lang="${code}" lang="${code === 'auto' ? lang : code}" aria-pressed="${langPref === code ? 'true' : 'false'}">${code === 'auto' ? t('lang.auto', { name: I18N.SHORT_NAMES[I18N.detect()] }) : I18N.LANGUAGE_NAMES[code]}</button>`)}
        </div>
        <p class="vcc-sub-title" style="margin-top:12px">${t('bh.steps')}</p>
        <div class="vcc-slr">
          <label for="vcc-speed-step">${t('bh.speedStep')}</label>
          <input type="number" id="vcc-speed-step" class="vcc-num-in" min="0.05" max="1" step="0.05" value="${state.speedStep}">
          <span class="vcc-slv" style="min-width:0">×</span>
        </div>
        <div class="vcc-slr">
          <label for="vcc-volume-step">${t('bh.volumeStep')}</label>
          <input type="number" id="vcc-volume-step" class="vcc-num-in" min="1" max="25" step="1" value="${state.volumeStep}">
          <span class="vcc-slv" style="min-width:0">%</span>
        </div>
        <div class="vcc-slr">
          <label for="vcc-seek-step">${t('bh.seekStep')}</label>
          <input type="number" id="vcc-seek-step" class="vcc-num-in" min="1" max="300" step="1" value="${state.seekStep}">
          <span class="vcc-slv" style="min-width:0">s</span>
        </div>
        <div class="vcc-slr">
          <label for="vcc-seek-step-long">${t('bh.seekStepLong')}</label>
          <input type="number" id="vcc-seek-step-long" class="vcc-num-in" min="5" max="3600" step="5" value="${state.seekStepLong}">
          <span class="vcc-slv" style="min-width:0">s</span>
        </div>
        <div class="vcc-slr">
          <label for="vcc-hold-speed">${t('bh.holdSpeed')}</label>
          <input type="number" id="vcc-hold-speed" class="vcc-num-in" min="${SPEED_MIN}" max="${SPEED_MAX}" step="0.25" value="${state.holdSpeed}">
          <span class="vcc-slv" style="min-width:0">×</span>
        </div>
      `),

      // ── Sites ativos ──
      acc('si', '◈', t('sec.sites'), escapeHTML`
        <div id="vcc-sites-list">${buildSitesList()}</div>
        <div class="vcc-abts"><button class="vcc-abt" id="vcc-add-site">${t('si.add')}</button></div>
      `),

      // ── Dados salvos ──
      acc('data', '⊟', t('sec.data'), escapeHTML`
        <p class="vcc-sub-title">${t('dt.stored')}</p>
        <div id="vcc-storage-list" class="vcc-storage-list"></div>
        <div class="vcc-abts" style="margin-bottom:12px">
          <button class="vcc-abt" id="vcc-refresh-storage">${t('dt.refresh')}</button>
          <button class="vcc-abt" id="vcc-copy-all-storage">${t('dt.copyAll')}</button>
          <button class="vcc-abt danger" id="vcc-clear-storage">${t('dt.deleteAll')}</button>
        </div>
        <p class="vcc-sub-title">${t('dt.backup')}</p>
        <p class="vcc-hint" style="margin-top:0">${t('dt.backupHint')}</p>
        <div class="vcc-abts" style="margin-bottom:12px">
          <button class="vcc-abt" id="vcc-export">${t('dt.export')}</button>
          <button class="vcc-abt" id="vcc-import">${t('dt.import')}</button>
        </div>
        <div class="vcc-danger-zone">
          <div class="vcc-danger-title">${t('dt.resets')}</div>
          <div class="vcc-abts">
            <button class="vcc-abt" id="vcc-reset-keys">${t('dt.resetKeys')}</button>
            <button class="vcc-abt danger" id="vcc-reset-all">${t('dt.resetAll')}</button>
          </div>
        </div>
      `),
    ];
  }

  function renderSiteStatus() {
    const status = cpEl?.querySelector('#vcc-site-status');
    if (!status) return;
    if (state.videoControlsActive) {
      status.replaceChildren();
      return;
    }
    setSafeHTML(status, escapeHTML`
      <div class="vcc-site-warning" role="alert">
        <div class="vcc-site-warning-title">${t('site.inactiveTitle')}</div>
        <div class="vcc-site-warning-text">${t('site.inactiveText')}</div>
        <button class="vcc-abt primary" id="vcc-activate-site">${t('site.enable', { domain })}</button>
      </div>`);
    status.querySelector('#vcc-activate-site').addEventListener('click', activateCurrentSite);
  }

  // Reconstrói o painel mantendo seções abertas, rolagem e posição.
  function rebuildPanel() {
    if (!cpEl) return;
    const openIds = [...cpEl.querySelectorAll('.vcc-acc-body.open')].map(b => b.id);
    const scrollTop = cpEl.querySelector('#vcc-cp-scroll')?.scrollTop || 0;
    const left = cpEl.style.getPropertyValue('left');
    const top = cpEl.style.getPropertyValue('top');
    const transform = cpEl.style.getPropertyValue('transform');
    cpEl.remove();
    capturingKey = null;
    currentScope = 'default';
    KEYS = loadKeys(domain);
    buildCP();
    cpEl.querySelectorAll('.vcc-acc-body').forEach(body => {
      const open = openIds.includes(body.id);
      setAccordion(body.id.slice('vcc-body-'.length), open);
    });
    if (left) {
      cpEl.style.setProperty('left', left, 'important');
      cpEl.style.setProperty('top', top, 'important');
      cpEl.style.setProperty('transform', transform || 'none', 'important');
    }
    const scroller = cpEl.querySelector('#vcc-cp-scroll');
    if (scroller) scroller.scrollTop = scrollTop;
    if (state.cpVisible) {
      updateStats(); refreshStorageList(); updateLoopStatus();
    }
    updateScrollCue();
  }

  function setAccordion(id, open) {
    const body = cpEl?.querySelector(`#vcc-body-${id}`);
    if (!body) return;
    body.classList.toggle('open', open);
    body.style.display = open ? 'block' : 'none';
    cpEl.querySelector(`#vcc-arr-${id}`)?.classList.toggle('open', open);
    cpEl.querySelector(`[data-acc="${id}"]`)?.setAttribute('aria-expanded', String(open));
  }

  // ─────────────────────────────────────────────
  // BIND EVENTOS DO PAINEL
  // ─────────────────────────────────────────────
  function q(sel) { return cpEl.querySelector(sel); }

  function bindTog(id, cb) {
    const el = cpEl.querySelector(`#vcc-tog-${id}`); if (!el) return;
    el.addEventListener('click', () => {
      if (el.disabled) return;
      el.classList.toggle('on');
      const on = el.classList.contains('on');
      el.setAttribute('aria-checked', String(on));
      cb(on);
    });
  }

  function bindCPEvents() {
    // Acordeões
    cpEl.querySelectorAll('.vcc-acc-hdr').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.acc;
        setAccordion(id, !q(`#vcc-body-${id}`).classList.contains('open'));
        updateScrollCue();
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
      const n = parseFloat(e.target.value); if (!isNaN(n)) setSpeed(n);
    });
    q('#vcc-seek-back').addEventListener('click', () => applySeek(-state.seekStep));
    q('#vcc-seek-fwd' ).addEventListener('click', () => applySeek(+state.seekStep));
    q('#vcc-seek-back-long').addEventListener('click', () => applySeek(-state.seekStepLong));
    q('#vcc-seek-fwd-long' ).addEventListener('click', () => applySeek(+state.seekStepLong));
    q('#vcc-frame-back').addEventListener('click', () => stepFrame(-1));
    q('#vcc-frame-fwd' ).addEventListener('click', () => stepFrame(+1));

    // Áudio
    q('#vcc-volume-down').addEventListener('click', () => changeVolume(-state.volumeStep));
    q('#vcc-volume-up').addEventListener('click', () => changeVolume(+state.volumeStep));
    q('#vcc-volume-mute').addEventListener('click', toggleMute);
    q('#vcc-volume').addEventListener('input', e => applyVolume(parseInt(e.target.value) / 100, true));

    // Navegação
    q('#vcc-loop-a').addEventListener('click',     () => { setLoopPoint('A'); updateLoopStatus(); });
    q('#vcc-loop-b').addEventListener('click',     () => { setLoopPoint('B'); updateLoopStatus(); });
    q('#vcc-loop-clear').addEventListener('click', () => { clearLoop(); updateLoopStatus(); });
    const pipBtn = q('#vcc-pip');
    if (pipBtn && !pipBtn.disabled) pipBtn.addEventListener('click', activatePiP);
    q('#vcc-timestamp' ).addEventListener('click', copyTimestamp);
    q('#vcc-snapshot').addEventListener('click', captureFrame);
    q('#vcc-loop-save').addEventListener('click', () => {
      if (loopA === null || loopB === null) return;
      addMark({ a: Math.min(loopA, loopB), b: Math.max(loopA, loopB) });
    });
    q('#vcc-mark-add').addEventListener('click', () => addMark());
    q('#vcc-mark-prev').addEventListener('click', () => jumpMark(-1));
    q('#vcc-mark-next').addEventListener('click', () => jumpMark(+1));
    bindTog('resume', setResume);

    // Imagem
    bindTog('invert', on => setFilter('invert', on));
    cpEl.querySelectorAll('input[data-filter]').forEach(input => input.addEventListener('input', () => {
      q(`#vcc-${input.dataset.filter}-val`).textContent = input.value + '%';
      setFilter(input.dataset.filter, parseInt(input.value));
    }));
    q('#vcc-rot-left').addEventListener('click', () => rotateVideos(-90));
    q('#vcc-rot-right').addEventListener('click', () => rotateVideos(+90));
    q('#vcc-rot-reset').addEventListener('click', () => rotateVideos(0));
    bindTog('rotremember', setRotationRemember);
    q('#vcc-zoom-out').addEventListener('click', () => changeZoom(-ZOOM_STEP));
    q('#vcc-zoom-in').addEventListener('click', () => changeZoom(+ZOOM_STEP));
    q('#vcc-zoom-reset').addEventListener('click', () => changeZoom(0));
    cpEl.querySelectorAll('#vcc-pan-row button').forEach(b => b.addEventListener('click', () => {
      const [dx, dy] = b.dataset.pan.split(',').map(Number); panView(dx, dy);
    }));
    bindTog('mirror', on => toggleMirror(on));
    q('#vcc-image-reset').addEventListener('click', resetImage);
    q('#vcc-cb-op')?.addEventListener('input', e => {
      setOpacity('cbOpacity', parseInt(e.target.value) / 100);
      bars.forEach(bar => bar.el.style.setProperty('opacity', state.cbOpacity, 'important'));
      q('#vcc-cb-op-val').textContent = e.target.value + '%';
    });
    q('#vcc-cp-op')?.addEventListener('input', e => {
      setOpacity('cpOpacity', parseInt(e.target.value) / 100);
      cpEl.style.setProperty('opacity', state.cpOpacity, 'important');
      q('#vcc-cp-op-val').textContent = e.target.value + '%';
    });

    // Barra de controle
    cpEl.querySelectorAll('#vcc-bar-mode button').forEach(b => b.addEventListener('click', () => setBarMode(b.dataset.value)));
    bindTog('barauto', on => setBarOption('barAuto', on));
    bindTog('barpervideo', on => setBarOption('barLayout', on ? 'perVideo' : 'single'));
    bindTog('barwheel', on => setBarOption('barWheel', on));
    cpEl.querySelectorAll('#vcc-bar-anchor button').forEach(b => b.addEventListener('click', () => setBarOption('barAnchor', b.dataset.anchor)));
    q('#vcc-alert-dur')?.addEventListener('input', e => {
      state.alertDuration = parseInt(e.target.value);
      save(gk('alertDuration'), state.alertDuration);
      q('#vcc-alert-dur-val').textContent = state.alertDuration + 'ms';
    });

    // Vídeos
    q('#vcc-vid-all').addEventListener('click', toggleAllVideos);

    if (!IS_EXTENSION) bindFullPanelEvents();
  }

  // Opacidade no painel: ajusta o padrão global, ou o valor próprio do site se
  // ele tiver um (definido na página de configurações).
  function siteHasOwnOpacity() {
    return load(sk('cbOpacity'), null) !== null || load(sk('cpOpacity'), null) !== null;
  }

  function setOpacity(kind, value) {
    state[kind] = value;
    save(load(sk(kind), null) !== null ? sk(kind) : gk(kind), value);
  }

  function bindFullPanelEvents() {
    // Atalhos
    q('#vcc-add-scope').addEventListener('click', () => {
      const d = prompt(t('ks.domainPrompt')); if (d && d.trim()) addScopeTab(d.trim());
    });
    cpEl.querySelectorAll('.vcc-scope-tab[data-scope]').forEach(tab => {
      tab.addEventListener('click', () => setScope(tab.dataset.scope));
    });
    q('#vcc-keys-copy-to-domain').addEventListener('click', () => {
      const target     = currentScope === 'default' ? domain : currentScope;
      const globalKeys = { ...FACTORY_KEYS, ...load(gk('keys'), {}) };
      save(`vcc_${target}_keys`, globalKeys);
      alert(t('ks.copied', { domain: target }));
    });
    q('#vcc-keys-factory').addEventListener('click', () => {
      if (!confirm(t('ks.factoryConfirm'))) return;
      if (currentScope === 'default') del(gk('keys'));
      else del(`vcc_${currentScope}_keys`);
      KEYS = loadKeys(domain); buildKeysList();
    });

    // Preferências
    cpEl.querySelectorAll('#vcc-theme-tabs button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.value)));
    cpEl.querySelectorAll('#vcc-lang-tabs [data-lang]').forEach(btn => btn.addEventListener('click', () => setLanguage(btn.dataset.lang)));
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
    q('#vcc-seek-step-long').addEventListener('change', e => {
      const v = parseInt(e.target.value);
      if (!isNaN(v) && v >= 5 && v <= 3600) { state.seekStepLong = v; save(gk('seekStepLong'), v); rebuildPanel(); }
      else e.target.value = state.seekStepLong;
    });
    q('#vcc-hold-speed').addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v >= SPEED_MIN && v <= SPEED_MAX) { state.holdSpeed = clampSpeed(v); save(gk('holdSpeed'), state.holdSpeed); }
      else e.target.value = state.holdSpeed;
    });
    q('#vcc-volume-step').addEventListener('change', e => {
      const v = parseInt(e.target.value);
      if (!isNaN(v) && v >= 1 && v <= 25) { state.volumeStep = v; save(gk('volumeStep'), state.volumeStep); }
      else e.target.value = state.volumeStep;
    });

    // Sites
    cpEl.querySelectorAll('[data-site-tog]').forEach(bindSiteToggle);
    q('#vcc-add-site').addEventListener('click', () => {
      const d = prompt(t('si.prompt')); if (d && d.trim()) addSiteRow(d.trim(), true);
    });

    // Dados
    q('#vcc-refresh-storage').addEventListener('click', refreshStorageList);
    q('#vcc-copy-all-storage').addEventListener('click', () => {
      const all = getAllVccKeys().map(k => {
        let v = ''; try { v = JSON.stringify(GM_getValue(k)); } catch {}
        return `${k}: ${v}`;
      }).join('\n');
      navigator.clipboard.writeText(all).then(() => flashCB(t('flash.copied'), null, true), () => {});
    });
    q('#vcc-export').addEventListener('click', exportSettings);
    q('#vcc-import').addEventListener('click', importSettings);
    q('#vcc-clear-storage').addEventListener('click', () => {
      if (!confirm(t('dt.deleteConfirm'))) return;
      getAllVccKeys().forEach(del); refreshStorageList(); alert(t('dt.deleted'));
    });
    q('#vcc-reset-keys').addEventListener('click', () => {
      if (!confirm(t('dt.resetKeysConfirm'))) return;
      getAllVccKeys().filter(k => k.endsWith('_keys')).forEach(del);
      KEYS = { ...FACTORY_KEYS }; buildKeysList();
    });
    q('#vcc-reset-all').addEventListener('click', () => {
      if (!confirm(t('dt.resetAllConfirm'))) return;
      getAllVccKeys().forEach(del); location.reload();
    });
  }

  // ─────────────────────────────────────────────
  // PRESETS
  // ─────────────────────────────────────────────
  function buildPresets() {
    const grid = cpEl.querySelector('#vcc-presets'); if (!grid) return;
    setSafeHTML(grid, escapeHTML`${PRESET_SPEEDS.map(s =>
      escapeHTML`<button class="vcc-pc${Math.abs(state.speed - s) < 0.01 ? ' sel' : ''}" data-speed="${s}">${s}×</button>`
    )}<button class="vcc-pc" id="vcc-preset-add" title="${t('pb.presetPrompt')}" aria-label="${t('pb.presetPrompt')}">+</button>`);

    grid.querySelectorAll('.vcc-pc[data-speed]').forEach(c => {
      c.addEventListener('click', () => setSpeed(parseFloat(c.dataset.speed)));
    });
    grid.querySelector('#vcc-preset-add').addEventListener('click', () => {
      const v = prompt(t('pb.presetPrompt')); if (!v) return;
      const n = parseFloat(v);
      if (isNaN(n) || n < SPEED_MIN || n > SPEED_MAX) return alert(t('pb.invalidValue'));
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
  // TEMPO RESTANTE
  // ─────────────────────────────────────────────
  function updateETA() {
    if (!cpEl) return;
    const eta = cpEl.querySelector('#vcc-eta'); if (!eta) return;
    const vid = state.videos[state.primaryVideo];
    if (!vid || !isFinite(vid.duration) || vid.duration === 0) {
      setSafeHTML(eta, escapeHTML`<span>${t('pb.noDuration')}</span>`); return;
    }
    const speed = videoSpeed(vid);
    const rem = (vid.duration - vid.currentTime) / speed;
    let clock = '';
    try { clock = new Date(Date.now() + rem * 1000).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }); } catch {}
    setSafeHTML(eta, [
      ...tStrong('pb.eta', { time: fmtDuration(rem), speed: fmtSpeed(speed) + '×' }),
      ...(clock ? [escapeHTML`<br>`, ...tStrong('pb.endsAt', { clock })] : []),
    ]);
  }

  // ─────────────────────────────────────────────
  // LISTA DE VÍDEOS
  // ─────────────────────────────────────────────
  function buildVideoList() {
    const list = cpEl ? cpEl.querySelector('#vcc-vid-list') : null; if (!list) return;
    list.replaceChildren();

    state.videos.forEach((vid, i) => {
      if (!vid.isConnected) return;
      const isPrimary = i === state.primaryVideo;
      const isTarget  = state.targetVideos.has(i);
      const dur = isFinite(vid.duration) ? fmtDuration(vid.duration) : '?';
      const res = vid.videoWidth ? `${vid.videoWidth}×${vid.videoHeight}` : '—';
      let srcLabel = t('vi.video', { n: i + 1 });
      try { srcLabel = new URL(vid.currentSrc || vid.src).hostname || srcLabel; } catch {}

      const row = document.createElement('div');
      row.className = 'vcc-vrow';
      setSafeHTML(row, escapeHTML`
        <button class="vcc-vthumb${isPrimary ? ' primary' : ''}" title="${t(isPrimary ? 'vi.main' : 'vi.setMain')}" aria-label="${t(isPrimary ? 'vi.main' : 'vi.setMain')}">${isPrimary ? '★' : '#' + (i + 1)}</button>
        <div style="flex:1;min-width:0">
          <div class="vcc-vname">${srcLabel}${isPrimary ? escapeHTML`<span class="vcc-primary-badge">${t('vi.mainBadge')}</span>` : ''}</div>
          <div class="vcc-vmeta">${res} · ${dur}</div>
        </div>
        <div class="vcc-vid-actions">
          <button class="vcc-vid-btn${isPrimary ? ' on' : ''}" data-act="primary" title="${t(isPrimary ? 'vi.isMain' : 'vi.setMain')}" aria-label="${t(isPrimary ? 'vi.isMain' : 'vi.setMain')}">★</button>
          <button class="vcc-vid-btn" data-act="playpause" title="${t('vi.playPause')}" aria-label="${t('vi.playPause')}">${vid.paused ? '▶' : '⏸'}</button>
          <button class="vcc-vid-btn${vid.style.visibility === 'hidden' ? ' on' : ''}" data-act="hide" title="${t('vi.hide')}" aria-label="${t('vi.hide')}">◻</button>
          <button class="vcc-vid-btn" data-act="mute" title="${t('vi.mute')}" aria-label="${t('vi.mute')}">${vid.muted ? '✕♪' : '♪'}</button>
          <button class="vcc-vid-btn danger" data-act="remove" title="${t('vi.remove')}" aria-label="${t('vi.remove')}">✕</button>
        </div>
        <button class="vcc-chk${isTarget ? ' on' : ''}" data-vidx="${i}" role="checkbox" aria-checked="${isTarget ? 'true' : 'false'}" aria-label="${t('vi.target')}">${isTarget ? '✓' : ''}</button>
      `);

      row.querySelector('.vcc-vthumb').addEventListener('click', () => {
        state.primaryVideo = i;
        buildVideoList();
        updateETA();
        positionBars();
        updateImageUI(); renderMarks();
      });

      row.querySelector('.vcc-chk').addEventListener('click', e => {
        const el = e.currentTarget;
        const idx = parseInt(el.dataset.vidx);
        const on  = state.targetVideos.has(idx);
        if (on) state.targetVideos.delete(idx); else state.targetVideos.add(idx);
        el.classList.toggle('on', !on); el.textContent = on ? '' : '✓'; el.setAttribute('aria-checked', String(!on));
      });

      row.querySelectorAll('.vcc-vid-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          switch (btn.dataset.act) {
            case 'primary':
              state.primaryVideo = i; buildVideoList(); updateETA(); positionBars(); updateImageUI(); renderMarks(); break;
            case 'playpause':
              try { vid.paused ? vid.play() : vid.pause(); } catch {}
              setTimeout(() => { btn.textContent = vid.paused ? '▶' : '⏸'; }, 50); break;
            case 'hide':
              vid.style.visibility = vid.style.visibility === 'hidden' ? 'visible' : 'hidden';
              btn.classList.toggle('on', vid.style.visibility === 'hidden'); break;
            case 'mute':
              try { vid.muted = !vid.muted; } catch {}
              btn.textContent = vid.muted ? '✕♪' : '♪'; break;
            case 'remove': {
              if (!confirm(t('vi.removeConfirm'))) return;
              try { vid.remove(); } catch {}
              state.videos.splice(i, 1);
              const newSet = new Set();
              state.targetVideos.forEach(idx => { if (idx < i) newSet.add(idx); else if (idx > i) newSet.add(idx - 1); });
              state.targetVideos.clear(); newSet.forEach(idx => state.targetVideos.add(idx));
              if (state.primaryVideo >= state.videos.length) state.primaryVideo = Math.max(0, state.videos.length - 1);
              syncBars(); buildVideoList(); break;
            }
          }
        });
      });

      list.appendChild(row);
    });

    const count = cpEl.querySelector('#vcc-vid-count');
    if (count) {
      const n = state.videos.filter(v => v.isConnected).length;
      count.textContent = t(n === 1 ? 'vi.countOne' : 'vi.countOther', { n });
    }
  }

  function updateVideoList() { if (cpEl && state.cpVisible) buildVideoList(); }

  function toggleAllVideos() {
    const all = state.videos.every((_, i) => state.targetVideos.has(i));
    if (all) state.targetVideos.clear();
    else state.videos.forEach((_, i) => state.targetVideos.add(i));
    buildVideoList();
  }

  // ─────────────────────────────────────────────
  // ATALHOS EDITÁVEIS (painel do Tampermonkey)
  // ─────────────────────────────────────────────
  function buildKeysList() {
    const list = cpEl?.querySelector('#vcc-keys-list'); if (!list) return;

    const keyRows = KEY_ACTIONS.map(a => escapeHTML`
      <div class="vcc-kbd-row">
        <span class="vcc-kbd-action">${t('key.' + a.id)}</span>
        <span style="display:flex;align-items:center;gap:3px">
          <span class="vcc-kbd-key" data-action="${a.id}" role="button" tabindex="0">${KEYS[a.id] || '—'}</span>
          <button class="vcc-kbd-clear" data-clear="${a.id}" title="${t('ks.remove')}" aria-label="${t('ks.remove')}">✕</button>
        </span>
      </div>`);

    // Numerais fixos (não editáveis)
    setSafeHTML(list, escapeHTML`${keyRows}
      <div class="vcc-kbd-row fixed">
        <span class="vcc-kbd-action">${t('ks.fixedPlay')}</span>
        <span class="vcc-kbd-key">0</span>
      </div>
      <div class="vcc-kbd-row fixed">
        <span class="vcc-kbd-action">${t('ks.fixedPresets')}</span>
        <span style="display:flex;gap:3px">
          <span class="vcc-kbd-key">1</span>
          <span class="vcc-kbd-key">…</span>
          <span class="vcc-kbd-key">7</span>
        </span>
      </div>`);

    list.querySelectorAll('.vcc-kbd-key[data-action]').forEach(el => el.addEventListener('click', () => startCapture(el)));

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
    if (copyBtn) copyBtn.textContent = t('ks.copyTo', { domain: currentScope === 'default' ? domain : currentScope });
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

      const k = SHARED.bindingFromEvent(e);
      const fail = msgKey => {
        keyEl.classList.remove('capturing'); keyEl.classList.add('error');
        keyEl.textContent = t(msgKey);
        setTimeout(() => { keyEl.classList.remove('error'); keyEl.textContent = keyEl._orig; capturingKey = null; }, 1300);
        document.removeEventListener('keydown', handler, true);
      };
      if (!k) return fail('ks.invalid');

      const dup = Object.entries(KEYS).find(([act, bnd]) =>
        bnd && act !== keyEl.dataset.action && bnd.toUpperCase() === k.toUpperCase()
      );
      if (dup) return fail('ks.inUse');

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
    cpEl.querySelectorAll('.vcc-scope-tab[data-scope]').forEach(tab => tab.classList.toggle('active', tab.dataset.scope === scope));
    KEYS = loadKeys(scope === 'default' ? 'default' : scope);
    const hint = cpEl.querySelector('#vcc-scope-hint');
    if (hint) hint.textContent = scope === 'default' ? t('ks.hintGlobal') : t('ks.hintScope', { scope });
    buildKeysList();
  }

  function addScopeTab(d) {
    d = SHARED.normalizeSite(d);
    const tabs   = cpEl.querySelector('#vcc-scope-tabs');
    const addBtn = cpEl.querySelector('#vcc-add-scope');
    if (tabs.querySelector(`[data-scope="${CSS.escape(d)}"]`)) { setScope(d); return; }
    const btn = document.createElement('button');
    btn.className = 'vcc-scope-tab'; btn.dataset.scope = d; btn.textContent = d;
    btn.addEventListener('click', () => setScope(d));
    tabs.insertBefore(btn, addBtn); setScope(d);
  }

  // ─────────────────────────────────────────────
  // SITES
  // ─────────────────────────────────────────────
  const normalizeSite = SHARED.normalizeSite;

  function updateCPVolume() {
    if (!cpEl) return;
    const slider = cpEl.querySelector('#vcc-volume');
    const value = cpEl.querySelector('#vcc-volume-val');
    const button = cpEl.querySelector('#vcc-volume-mute');
    if (slider) slider.value = Math.round(state.volume * 100);
    if (value) value.textContent = state.muted ? t('au.muted') : `${Math.round(state.volume * 100)}%`;
    if (button) button.textContent = t(state.muted ? 'au.unmute' : 'au.mute');
  }

  function getActiveSites() {
    const list = load(gk('activeSites'), []);
    return (Array.isArray(list) ? list : []).map(normalizeSite).filter(Boolean);
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
      .map(s => siteRowHTML(s, isSiteActive(s)));
  }

  function siteRowHTML(s, on) {
    return escapeHTML`<div class="vcc-site-row" data-site="${s}">
      <div class="vcc-site-name" id="vcc-site-${s}">${s}</div>
      <button class="vcc-tog${on ? ' on' : ''}" data-site-tog="${s}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-labelledby="vcc-site-${s}"><span class="vcc-tog-t"></span></button>
    </div>`;
  }

  function addSiteRow(s, on) {
    s = normalizeSite(s);
    const list = cpEl.querySelector('#vcc-sites-list');
    if (!list || list.querySelector(`[data-site="${CSS.escape(s)}"]`)) return;
    appendSafeHTML(list, siteRowHTML(s, on));
    bindSiteToggle(list.querySelector(`[data-site-tog="${CSS.escape(s)}"]`));
    setSiteActive(s, on);
  }

  function bindSiteToggle(el) {
    if (!el || el._vccBound) return;
    el._vccBound = true;
    el.addEventListener('click', function () {
      this.classList.toggle('on');
      const site = this.dataset.siteTog;
      const on = this.classList.contains('on');
      this.setAttribute('aria-checked', String(on));
      setSiteActive(site, on);
      if (normalizeSite(site) === domain || domain.endsWith('.' + normalizeSite(site))) {
        if (on) activateCurrentSite(); else deactivateCurrentSite();
      }
    });
  }

  // ─────────────────────────────────────────────
  // DADOS SALVOS (painel do Tampermonkey)
  // ─────────────────────────────────────────────
  function refreshStorageList() {
    const list = cpEl?.querySelector('#vcc-storage-list'); if (!list) return;
    const keys = getAllVccKeys();
    if (!keys.length) { setSafeHTML(list, escapeHTML`<span>${t('dt.empty')}</span>`); return; }
    setSafeHTML(list, keys.map(k => {
      let val = ''; try { val = JSON.stringify(GM_getValue(k)); } catch {}
      const line = `${k}: ${val}`;
      return escapeHTML`<div class="vcc-storage-row">
        <span class="k" title="${k}">${k}</span>
        <span class="v" title="${val}">${val}</span>
        <button class="vcc-kbd-clear" data-copy-line="${line}" title="${t('dt.copyLine')}" aria-label="${t('dt.copyLine')}">⎘</button>
      </div>`;
    }));
    list.querySelectorAll('[data-copy-line]').forEach(btn => btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copyLine).then(() => flashCB(t('flash.copied'), null, true), () => {});
    }));
  }

  // Backup em arquivo (o mesmo formato da página de configurações da extensão).
  function exportSettings() {
    const entries = {};
    getAllVccKeys().forEach(k => { entries[k] = load(k, null); });
    let version = '';
    try { version = GM_info?.script?.version || ''; } catch {}
    const json = JSON.stringify(SHARED.buildExport(entries, version), null, 2);
    downloadBlob(new Blob([json], { type: 'application/json' }), SHARED.exportFileName());
  }

  function importSettings() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return;
      const result = SHARED.parseImport(await file.text());
      if (result.error) { alert(t('dt.importInvalid')); return; }
      if (!confirm(t('dt.importConfirm'))) return;
      getAllVccKeys().forEach(del);
      Object.entries(result.data).forEach(([k, v]) => save(k, v));
      location.reload();
    });
    input.click();
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
    const saveBtn = cpEl.querySelector('#vcc-loop-save');
    if (saveBtn) saveBtn.disabled = loopA === null || loopB === null;
    if (loopA === null && loopB === null) {
      setSafeHTML(el, escapeHTML`<span class="none">${t('nv.noLoop')}</span>`); return;
    }
    const aStr = loopA !== null ? escapeHTML`<span class="pt">${fmtTimecode(loopA)}</span>` : escapeHTML`<span class="none">${t('nv.notSet')}</span>`;
    const bStr = loopB !== null ? escapeHTML`<span class="pt">${fmtTimecode(loopB)}</span>` : escapeHTML`<span class="none">${t('nv.notSet')}</span>`;
    const active = loopA !== null && loopB !== null;
    setSafeHTML(el, escapeHTML`A: ${aStr} &nbsp;→&nbsp; B: ${bStr}${active ? escapeHTML` &nbsp;<span class="on">${t('nv.active')}</span>` : ''}`);
  }

  // ─────────────────────────────────────────────
  // FUNCIONALIDADES AVANÇADAS
  // ─────────────────────────────────────────────
  async function activatePiP() {
    const vid = state.videos[state.primaryVideo]; if (!vid) return;
    try { document.pictureInPictureElement ? await document.exitPictureInPicture() : await vid.requestPictureInPicture(); }
    catch (e) { alert(t('nv.pipError', { error: e.message })); }
  }

  function copyTimestamp() {
    const vid = state.videos[state.primaryVideo]; if (!vid) return;
    const secs = Math.floor(vid.currentTime);
    navigator.clipboard.writeText(`${location.href.split('?')[0]}?t=${secs}`).then(() => flashCB(t('flash.copied'), [vid], true), () => {});
  }

  // ─────────────────────────────────────────────
  // IMAGEM: FILTROS
  // Brilho, contraste, saturação e inversão valem para todos os vídeos da
  // página, até recarregar.
  // ─────────────────────────────────────────────
  function filterCSS() {
    const f = state.filter;
    if (!f.invert && f.brightness === 100 && f.contrast === 100 && f.saturate === 100) return '';
    return `invert(${f.invert ? 1 : 0}) brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%)`;
  }

  function applyFilterTo(vid) {
    const css = filterCSS();
    try {
      if (css) { vid.style.filter = css; vid._vccFiltered = true; }
      else if (vid._vccFiltered) { vid.style.filter = ''; vid._vccFiltered = false; }
    } catch {}
  }

  function applyVideoFilter() { state.videos.forEach(applyFilterTo); }

  function setFilter(name, value) {
    state.filter[name] = value;
    applyVideoFilter();
  }

  // ─────────────────────────────────────────────
  // IMAGEM: ROTAÇÃO, ZOOM E ESPELHAMENTO
  //
  // Tudo com CSS (transform) no próprio <video>, sem mexer no arquivo:
  //   rotação  — passos de 90°; a 90°/270° a imagem é ajustada para caber
  //   zoom     — de 1× a 5×, com a parte visível movida pelos botões de direção
  //   espelho  — inverte a imagem na horizontal
  // O que passar da área original do player é recortado (clip-path), para não
  // cobrir o resto da página. Vale até recarregar; a rotação pode ser lembrada
  // por site.
  // ─────────────────────────────────────────────
  const ZOOM_MIN = 1, ZOOM_MAX = 5, ZOOM_STEP = 0.25;
  const VIEW_PROPS = ['transform', 'clip-path'];

  const videoRotation = vid => vid?._vccRot || 0;
  const videoZoom = vid => vid?._vccZoom || 1;
  const hasView = vid => !!(videoRotation(vid) || videoZoom(vid) !== 1 || vid._vccFlip);

  // Escala para a imagem girada a 90°/270° caber na caixa do elemento.
  function rotationFit(vid, deg) {
    if (deg % 180 === 0) return 1;
    const w = vid.clientWidth, h = vid.clientHeight;
    if (!w || !h) return 1;
    // Área ocupada pela imagem dentro da caixa (object-fit: contain, o padrão).
    let cw = w, ch = h;
    let fit = 'contain';
    try { fit = getComputedStyle(vid).objectFit || 'contain'; } catch {}
    if ((fit === 'contain' || fit === 'scale-down') && vid.videoWidth && vid.videoHeight) {
      const k = Math.min(w / vid.videoWidth, h / vid.videoHeight);
      cw = vid.videoWidth * k; ch = vid.videoHeight * k;
    }
    return Math.min(w / ch, h / cw);
  }

  // Medidas da imagem transformada. O deslocamento (pan) é limitado para a
  // imagem nunca descolar das bordas do player.
  function viewGeometry(vid) {
    const deg = videoRotation(vid), odd = deg % 180 !== 0;
    const w = vid.clientWidth, h = vid.clientHeight;
    const S = Math.round(rotationFit(vid, deg) * videoZoom(vid) * 10000) / 10000;
    const dispW = (odd ? h : w) * S, dispH = (odd ? w : h) * S;
    const maxX = Math.max(0, (dispW - w) / 2), maxY = Math.max(0, (dispH - h) / 2);
    const pan = vid._vccPan || { x: 0, y: 0 };
    const px = Math.round(Math.max(-maxX, Math.min(maxX, pan.x)) * 10) / 10;
    const py = Math.round(Math.max(-maxY, Math.min(maxY, pan.y)) * 10) / 10;
    vid._vccPan = { x: px, y: py };
    return { deg, odd, w, h, S, dispW, dispH, px, py, maxX, maxY };
  }

  // Recorte que mantém visível só a área original do player, escrito nas
  // coordenadas do próprio elemento (antes da transformação).
  function viewClip(g, flip) {
    const cx = -g.px, cy = -g.py;
    const [rx, ry] = { 0: [cx, cy], 90: [cy, -cx], 180: [-cx, -cy], 270: [-cy, cx] }[g.deg];
    const lx = (flip ? -rx : rx) / g.S, ly = ry / g.S;
    const hw = (g.odd ? g.h : g.w) / (2 * g.S), hh = (g.odd ? g.w : g.h) / (2 * g.S);
    const insets = [g.h / 2 + ly - hh, g.w / 2 - lx - hw, g.h / 2 - ly - hh, g.w / 2 + lx - hw].map(n => Math.max(0, n));
    return insets.some(n => n > 0.5) ? `inset(${insets.map(n => n.toFixed(1) + 'px').join(' ')})` : '';
  }

  // Deslocamento entre o ponto de origem das transformações do elemento e o
  // centro dele, para girar sempre em torno do centro (alguns players usam
  // outra origem).
  function centerOffset(vid) {
    try {
      const [ox, oy] = getComputedStyle(vid).transformOrigin.split(' ').map(parseFloat);
      const dx = vid.offsetWidth / 2 - ox, dy = vid.offsetHeight / 2 - oy;
      if (isFinite(dx) && isFinite(dy) && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) return [Math.round(dx * 10) / 10, Math.round(dy * 10) / 10];
    } catch {}
    return null;
  }

  function applyView(vid) {
    try {
      const st = vid.style;
      const active = hasView(vid);
      if (!vid._vccBase) {
        if (!active) return;
        // Estilos originais, para devolver ao desfazer.
        const saved = {};
        VIEW_PROPS.forEach(p => { saved[p] = [st.getPropertyValue(p), st.getPropertyPriority(p)]; });
        // Transformação que o site já aplicava (inline ou por CSS) é mantida.
        let own = saved.transform[0];
        if (!own) { const c = getComputedStyle(vid).transform; if (c && c !== 'none') own = c; }
        vid._vccBase = { saved, own: own || '' };
      }
      const restore = p => {
        const [value, priority] = vid._vccBase.saved[p];
        if (value) st.setProperty(p, value, priority); else st.removeProperty(p);
      };
      if (!active) {
        VIEW_PROPS.forEach(restore);
        delete vid._vccBase; delete vid._vccPan;
        return;
      }
      const g = viewGeometry(vid);
      const off = centerOffset(vid);
      const parts = [
        g.px || g.py ? `translate(${g.px}px, ${g.py}px)` : '',
        g.deg ? `rotate(${g.deg}deg)` : '',
        `scale(${g.S})`,
        vid._vccFlip ? 'scaleX(-1)' : '',
      ].filter(Boolean).join(' ');
      const around = off ? `translate(${off[0]}px, ${off[1]}px) ${parts} translate(${-off[0]}px, ${-off[1]}px)` : parts;
      st.setProperty('transform', `${vid._vccBase.own} ${around}`.trim(), 'important');
      const clip = viewClip(g, vid._vccFlip);
      if (clip) st.setProperty('clip-path', clip, 'important'); else restore('clip-path');
    } catch {}
  }

  // Recalcula quando o player muda de tamanho ou de vídeo.
  function watchView(vid) {
    if (vid._vccViewWatch) return;
    vid._vccViewWatch = true;
    vid.addEventListener('loadedmetadata', () => applyView(vid));
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (hasView(vid)) applyView(vid); }).observe(vid);
  }

  // Retângulo do player na janela. Com rotação ou zoom, o elemento ocupa uma
  // área diferente da original; devolve a área original (a parte visível),
  // para a barra continuar dentro do player.
  function videoBox(vid) {
    const r = vid.getBoundingClientRect();
    if (!vid._vccBase || !hasView(vid) || !r.width || !r.height) return r;
    const g = viewGeometry(vid);
    if (!g.dispW) return r;
    const f = r.width / g.dispW;
    const w = g.w * f, h = g.h * f;
    const left = r.left + r.width / 2 - g.px * f - w / 2, top = r.top + r.height / 2 - g.py * f - h / 2;
    return { left, top, width: w, height: h, right: left + w, bottom: top + h };
  }

  function updateViewAfterChange(list) {
    list.forEach(vid => { watchView(vid); applyView(vid); });
    updateImageUI();
    schedulePosition();
  }

  // delta = +90 (horário), -90 (anti-horário) ou 0 (volta ao normal).
  function rotateVideos(delta) {
    const list = targetVideoList();
    if (!list.length) return;
    list.forEach(vid => { vid._vccRot = delta === 0 ? 0 : (((videoRotation(vid) + delta) % 360) + 360) % 360; });
    updateViewAfterChange(list);
    const shown = vid => videoRotation(vid || state.videos[state.primaryVideo] || list[0]);
    if (state.siteRotation !== null) { state.siteRotation = shown(); save(sk('rotation'), state.siteRotation); }
    flashCB(bar => t('flash.rotation', { deg: shown(bar.video) }), list);
  }

  // Lembrar a rotação neste site: os próximos vídeos já abrem girados.
  function setRotationRemember(on) {
    if (on) { state.siteRotation = videoRotation(state.videos[state.primaryVideo]); save(sk('rotation'), state.siteRotation); }
    else { state.siteRotation = null; del(sk('rotation')); }
  }

  function changeZoom(delta) {
    const list = targetVideoList();
    if (!list.length) return;
    list.forEach(vid => {
      const z = delta === 0 ? 1 : Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round((videoZoom(vid) + delta) / ZOOM_STEP) * ZOOM_STEP));
      vid._vccZoom = z;
      if (z === 1) vid._vccPan = { x: 0, y: 0 };
    });
    updateViewAfterChange(list);
    flashCB(bar => t('flash.zoom', { n: Math.round(videoZoom(bar.video || state.videos[state.primaryVideo] || list[0]) * 100) }), list);
  }

  // Move a parte visível da imagem ampliada: dx/dy = -1, 0 ou +1.
  function panView(dx, dy) {
    const list = targetVideoList().filter(hasView);
    list.forEach(vid => {
      const pan = vid._vccPan || { x: 0, y: 0 };
      // Ver mais à direita = deslocar a imagem para a esquerda.
      vid._vccPan = { x: pan.x - dx * vid.clientWidth * 0.1, y: pan.y - dy * vid.clientHeight * 0.1 };
    });
    updateViewAfterChange(list);
  }

  function toggleMirror(force) {
    const list = targetVideoList();
    if (!list.length) return;
    const on = typeof force === 'boolean' ? force : !(state.videos[state.primaryVideo] || list[0])._vccFlip;
    list.forEach(vid => { vid._vccFlip = on; });
    updateViewAfterChange(list);
    flashCB(t(on ? 'flash.mirrorOn' : 'flash.mirrorOff'), list);
  }

  // Volta a imagem ao normal: filtros, rotação, zoom e espelho.
  function resetImage() {
    state.filter = { invert: false, brightness: 100, contrast: 100, saturate: 100 };
    applyVideoFilter();
    const list = state.videos.filter(v => v.isConnected);
    list.forEach(vid => { vid._vccRot = 0; vid._vccZoom = 1; vid._vccFlip = false; vid._vccPan = { x: 0, y: 0 }; });
    if (state.siteRotation !== null) { state.siteRotation = 0; save(sk('rotation'), 0); }
    list.forEach(applyView);
    schedulePosition();
    rebuildPanel();
  }

  // Atualiza os valores da seção Imagem sem reconstruir o painel.
  function updateImageUI() {
    if (!cpEl) return;
    const vid = state.videos[state.primaryVideo];
    const set = (id, text) => { const el = cpEl.querySelector(id); if (el) el.textContent = text; };
    set('#vcc-rot-val', `${videoRotation(vid)}°`);
    set('#vcc-zoom-val', `${Math.round(videoZoom(vid) * 100)}%`);
    const mirror = cpEl.querySelector('#vcc-tog-mirror');
    if (mirror) { mirror.classList.toggle('on', !!vid?._vccFlip); mirror.setAttribute('aria-checked', String(!!vid?._vccFlip)); }
    const canPan = !!vid && hasView(vid) && (() => { const g = viewGeometry(vid); return g.maxX > 1 || g.maxY > 1; })();
    cpEl.querySelector('#vcc-pan-row')?.classList.toggle('vcc-off', !canPan);
    cpEl.querySelectorAll('#vcc-pan-row button').forEach(b => { b.disabled = !canPan; });
  }

  // ─────────────────────────────────────────────
  // DADOS POR VÍDEO: RETOMAR DE ONDE PAROU E MARCADORES
  //
  // Ficam salvos só neste navegador, por site. Cada vídeo é identificado por
  // um resumo do endereço da página + a duração, e não pelo endereço em si.
  // ─────────────────────────────────────────────
  const RESUME_MIN_DURATION = 60;   // vídeos curtos (anúncios, vinhetas) não entram
  const RESUME_EDGE = 10;           // segundos ignorados no começo e no fim
  const MAX_RESUME_ENTRIES = 100, MAX_MARK_VIDEOS = 200, MAX_MARKS = 50;

  function videoKey(vid) {
    const d = vid?.duration;
    if (!isFinite(d) || d <= 0) return null;
    let page = location.href;
    try {
      const u = new URL(location.href);
      u.hash = '';
      ['t', 'start', 'time_continue'].forEach(p => u.searchParams.delete(p));
      page = u.origin + u.pathname + u.search;
    } catch {}
    return `${SHARED.hashString(page)}.${Math.round(d)}`;
  }

  // Mantém só as entradas mais recentes.
  function trimEntries(all, max) {
    const keys = Object.keys(all);
    if (keys.length <= max) return all;
    keys.sort((a, b) => (all[b].at || 0) - (all[a].at || 0)).slice(max).forEach(k => { delete all[k]; });
    return all;
  }

  // ── Retomar de onde parou ──
  function saveResume(vid, force = false) {
    if (!state.resume || !state.videoControlsActive) return;
    const dur = vid.duration, pos = vid.currentTime;
    if (!isFinite(dur) || dur < RESUME_MIN_DURATION) return;
    if (!force && Math.abs(pos - (vid._vccResumeSaved ?? -99)) < 5) return;
    const key = videoKey(vid); if (!key) return;
    vid._vccResumeSaved = pos;
    const all = load(sk('resumePos'), {});
    if (pos < RESUME_EDGE || pos > dur - RESUME_EDGE) {
      if (!(key in all)) return;        // começo ou fim: nada a retomar
      delete all[key];
    } else {
      all[key] = { t: Math.round(pos * 10) / 10, at: Date.now() };
    }
    save(sk('resumePos'), trimEntries(all, MAX_RESUME_ENTRIES));
  }

  function tryResume(vid) {
    if (!state.resume || !state.videoControlsActive) return;
    const key = videoKey(vid);
    if (!key || vid._vccResumed === key) return;
    vid._vccResumed = key;
    const entry = load(sk('resumePos'), {})[key];
    if (!entry || !(entry.t >= RESUME_EDGE)) return;
    // Só retoma se o vídeo ainda está no começo (o site pode ter retomado por conta própria).
    if (vid.currentTime > 3 || vid.duration < RESUME_MIN_DURATION) return;
    try { vid.currentTime = Math.max(0, entry.t - 2); } catch { return; }
    vid._vccResumeSaved = entry.t;
    flashCB(t('flash.resumed', { time: fmtTimecode(entry.t) }), [vid]);
  }

  function setResume(on) {
    state.resume = on;
    if (on) { save(sk('resume'), true); state.videos.forEach(v => saveResume(v, true)); }
    else del(sk('resume'));
  }

  window.addEventListener('pagehide', () => state.videos.forEach(v => saveResume(v, true)));

  // ── Marcadores ──
  function loadMarks(key) {
    const entry = key ? load(sk('marks'), {})[key] : null;
    return Array.isArray(entry?.list) ? entry.list : [];
  }

  function saveMarks(key, list) {
    const all = load(sk('marks'), {});
    if (list.length) all[key] = { at: Date.now(), list: list.slice().sort((a, b) => a.t - b.t).slice(0, MAX_MARKS) };
    else delete all[key];
    if (Object.keys(all).length) save(sk('marks'), trimEntries(all, MAX_MARK_VIDEOS));
    else del(sk('marks'));
  }

  // Marca o momento atual; com `range` = { a, b }, salva um trecho (loop).
  function addMark(range = null) {
    const vid = state.videos[state.primaryVideo];
    const key = videoKey(vid);
    if (!key) { flashCB(t('flash.noMarks'), null, true); return; }
    const list = loadMarks(key).slice();
    const round = v => Math.round(v * 10) / 10;
    const mark = range ? { t: round(range.a), b: round(range.b), n: '' } : { t: round(vid.currentTime), n: '' };
    if (!list.some(m => Math.abs(m.t - mark.t) < 0.5 && (m.b ?? null) === (mark.b ?? null))) list.push(mark);
    saveMarks(key, list);
    renderMarks();
    flashCB(t('flash.markAdded', { time: fmtTimecode(mark.t) }), [vid], !!range);
  }

  function goToMark(mark) {
    const vid = state.videos[state.primaryVideo]; if (!vid) return;
    if (mark.b != null) { loopA = mark.t; loopB = mark.b; enableLoop(); updateLoopStatus(); }
    try { vid.currentTime = mark.t; } catch {}
    const name = mark.n ? (mark.n.length > 20 ? mark.n.slice(0, 19) + '…' : mark.n) : fmtTimecode(mark.t);
    flashCB(t('flash.mark', { name }), [vid]);
  }

  // dir = -1 (marcador anterior) ou +1 (próximo).
  function jumpMark(dir) {
    const vid = state.videos[state.primaryVideo];
    const list = loadMarks(videoKey(vid));
    if (!list.length) { flashCB(t('flash.noMarks')); return; }
    const now = vid.currentTime;
    const next = dir > 0 ? list.find(m => m.t > now + 0.5) : [...list].reverse().find(m => m.t < now - 2);
    if (next) goToMark(next); else flashCB(t('flash.noMarks'));
  }

  function renderMarks() {
    const box = cpEl?.querySelector('#vcc-marks-list'); if (!box) return;
    if (box.contains(document.activeElement) && document.activeElement.matches?.('input')) return;   // não interrompe a digitação
    const vid = state.videos[state.primaryVideo];
    const key = videoKey(vid);
    cpEl.querySelectorAll('#vcc-mark-add, #vcc-mark-prev, #vcc-mark-next').forEach(b => { b.disabled = !key; });
    if (!key) { setSafeHTML(box, escapeHTML`<p class="vcc-hint">${t('nv.marksUnavailable')}</p>`); return; }
    const list = loadMarks(key);
    if (!list.length) { setSafeHTML(box, escapeHTML`<p class="vcc-hint">${t('nv.noMarks')}</p>`); return; }
    setSafeHTML(box, list.map((m, i) => {
      const label = m.b != null ? `${fmtTimecode(m.t)} → ${fmtTimecode(m.b)}` : fmtTimecode(m.t);
      return escapeHTML`<div class="vcc-mark-row">
        <button class="vcc-mark-time" data-mark="${i}" title="${t(m.b != null ? 'nv.markLoop' : 'nv.markJump', { time: label })}">${m.b != null ? '⟳ ' : ''}${label}</button>
        <input class="vcc-mark-name" data-mark-name="${i}" type="text" maxlength="60" value="${m.n || ''}" placeholder="${t('nv.markName')}" aria-label="${t('nv.markName')}">
        <button class="vcc-kbd-clear" data-mark-del="${i}" title="${t('nv.markDelete')}" aria-label="${t('nv.markDelete')}">✕</button>
      </div>`;
    }));
    box.querySelectorAll('[data-mark]').forEach(b => b.addEventListener('click', () => goToMark(list[+b.dataset.mark])));
    box.querySelectorAll('[data-mark-del]').forEach(b => b.addEventListener('click', () => {
      saveMarks(key, list.filter((_, i) => i !== +b.dataset.markDel)); renderMarks();
    }));
    box.querySelectorAll('[data-mark-name]').forEach(input => {
      // As teclas digitadas não devem acionar atalhos do site.
      input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') input.blur(); });
      input.addEventListener('change', () => {
        const next = list.map((m, i) => (i === +input.dataset.markName ? { ...m, n: input.value.trim().slice(0, 60) } : m));
        saveMarks(key, next);
      });
      input.addEventListener('blur', () => setTimeout(renderMarks, 0));
    });
  }

  // ─────────────────────────────────────────────
  // CAPTURA DO QUADRO ATUAL
  // Salva a imagem que está na tela (com rotação e espelho) como PNG. Vídeos
  // protegidos (DRM) ou servidos de outro domínio sem permissão não podem ser
  // lidos pelo navegador; nesse caso, só avisa.
  // ─────────────────────────────────────────────
  function captureFrame() {
    const vid = state.videos[state.primaryVideo];
    const fail = () => flashCB(t('flash.snapshotFail'), vid ? [vid] : null, true);
    if (!vid || !vid.videoWidth || vid.mediaKeys) return fail();
    try {
      const deg = videoRotation(vid), odd = deg % 180 !== 0;
      const w = vid.videoWidth, h = vid.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = odd ? h : w; canvas.height = odd ? w : h;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(deg * Math.PI / 180);
      if (vid._vccFlip) ctx.scale(-1, 1);
      ctx.drawImage(vid, -w / 2, -h / 2, w, h);
      canvas.toBlob(blob => {
        if (!blob) return fail();
        const title = (document.title || domain).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'video';
        downloadBlob(blob, `${title}-${fmtTimecode(vid.currentTime).replace(/:/g, '.')}.png`);
        flashCB(t('flash.snapshot'), [vid], true);
      }, 'image/png');
    } catch { fail(); }
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.documentElement.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // ─────────────────────────────────────────────
  // COMPATIBILIDADE
  // ─────────────────────────────────────────────
  const COMPAT_CHECKS = [
    { label: 'st.speedControl', check: () => 'ok' },
    { label: 'st.pip',          check: () => document.pictureInPictureEnabled ? 'ok' : 'unavailable' },
  ];

  function renderCompatibility() {
    const el = cpEl?.querySelector('#vcc-compat'); if (!el) return;
    setSafeHTML(el, COMPAT_CHECKS.map(c => {
      const st = c.check ? c.check() : 'ok';
      const [dot, cls, tag] = st === 'ok' ? ['vcc-dot-ok','vcc-ok',t('st.available')] : st === 'partial' ? ['vcc-dot-warn','vcc-warn',t('st.partial')] : ['vcc-dot-err','vcc-err',t('st.unavailable')];
      return escapeHTML`<div class="vcc-ci">
        <div class="vcc-cdot ${dot}"></div>
        <div class="vcc-ct">${t(c.label)} — <span class="vcc-ctag ${cls}">${tag}</span></div>
      </div>`;
    }));
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
  // ABRIR / FECHAR O PAINEL
  // ─────────────────────────────────────────────
  function toggleCPVisibility() {
    state.cpVisible = !state.cpVisible;
    if (!cpEl) buildCP();
    placeInPage(cpEl);
    cpEl.style.setProperty('display', state.cpVisible ? 'flex' : 'none', 'important');
    if (state.cpVisible) {
      updateCPSpeed(); updateETA(); buildVideoList();
      renderCompatibility(); updateStats(); refreshStorageList();
      updateBarSectionUI(); updateLoopStatus(); updateImageUI(); renderMarks();
      requestAnimationFrame(updateScrollCue);
    }
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

  // Com milésimos, para o quadro a quadro: "1:23.456".
  function fmtTimecodeMs(secs) {
    const whole = Math.floor(secs);
    return `${fmtTimecode(whole)}.${String(Math.round((secs - whole) * 1000)).padStart(3, '0').slice(0, 3)}`;
  }

  // ─────────────────────────────────────────────
  // ATIVAÇÃO DO SITE
  // ─────────────────────────────────────────────
  let videoEngineStarted = false;

  function startVideoEngine() {
    state.videoControlsActive = true;
    if (!videoEngineStarted) {
      videoEngineStarted = true;
      state.sessionStart = Date.now();
      state.speedHistory = [];
      scanVideos();
      startObserver();
    }
    rebuildBars();
  }

  function activateCurrentSite() {
    setSiteActive(domain, true);
    startVideoEngine();
    rebuildPanel();
    flashCB(t('flash.siteEnabled'), null, true);
  }

  // Desliga os controles na página atual (os vídeos mantêm a velocidade atual).
  function deactivateCurrentSite() {
    state.videoControlsActive = false;
    removeAllBars();
    updatePositionLoop();
    rebuildPanel();
  }

  // ─────────────────────────────────────────────
  // IDIOMA E TEMA
  // ─────────────────────────────────────────────
  function applyLanguage(pref) {
    const nextPref = I18N.SUPPORTED.includes(pref) ? pref : 'auto';
    const nextLang = I18N.resolve(nextPref);
    if (nextPref === langPref && nextLang === lang) return;
    langPref = nextPref;
    lang = nextLang;
    t = I18N.translator(lang);
    rebuildBars();
    rebuildPanel();
  }

  // Escolha feita no painel: salva (vale para todos os sites) e aplica.
  function setLanguage(pref) {
    save(gk('language'), pref);
    applyLanguage(pref);
  }

  function setTheme(pref) {
    state.themePref = SHARED.THEMES_PREFS.includes(pref) ? pref : 'auto';
    save(gk('theme'), state.themePref);
    applyThemeEverywhere();
    rebuildPanel();
  }

  // ─────────────────────────────────────────────
  // SINCRONIZAÇÃO (extensão)
  //
  // A página de configurações, o menu do ícone e outras abas gravam no
  // armazenamento da extensão; aqui as mudanças são aplicadas na hora.
  // ─────────────────────────────────────────────
  function settingsSnapshot() {
    return JSON.stringify([
      state.cbMode, state.cbOpacity, state.cpOpacity, state.alertDuration, state.seekStep,
      state.speedStep, state.volumeStep, state.themePref, state.barAuto, state.barAnchor,
      state.barLayout, state.cbPos, langPref, KEYS,
      state.seekStepLong, state.holdSpeed, state.barWheel, state.resume, state.siteRotation,
    ]);
  }

  function reloadFromStorage() {
    const before = settingsSnapshot();
    const prevSpeed = state.speed, prevVolume = state.volume, prevMuted = state.muted;
    const prevRotation = state.siteRotation;
    loadState();
    KEYS = loadKeys(domain);
    lang = I18N.resolve(langPref);
    t = I18N.translator(lang);

    const active = isSiteActive();
    if (active && !state.videoControlsActive) { startVideoEngine(); rebuildPanel(); return; }
    if (!active && state.videoControlsActive) { deactivateCurrentSite(); return; }

    if (Math.abs(prevSpeed - state.speed) > 0.001) applySpeed(state.speed, false);
    if (prevVolume !== state.volume || prevMuted !== state.muted) {
      targetVideoList().forEach(vid => { try { vid.volume = state.volume; vid.muted = state.muted; } catch {} });
      updateBarsDisplay(); updateCPVolume();
    }
    // Rotação lembrada mudou na página de configurações: aplica aos vídeos abertos.
    if (state.siteRotation !== prevRotation && state.siteRotation !== null) {
      const list = state.videos.filter(v => v.isConnected);
      list.forEach(vid => { vid._vccRot = state.siteRotation; });
      updateViewAfterChange(list);
    }
    if (settingsSnapshot() !== before) {
      rebuildBars();
      rebuildPanel();
      if (cpEl) cpEl.style.setProperty('opacity', state.cpOpacity, 'important');
    }
  }

  let reloadTimer = null;
  const extensionStorage = extensionApi?.storage;
  if (extensionStorage?.onChanged?.addListener) {
    extensionStorage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      // Dados por vídeo (posições, marcadores) mudam o tempo todo e não são configurações.
      const videoData = SHARED.VIDEO_DATA_KEYS.map(n => sk(n));
      const keys = Object.keys(changes);
      if (keys.includes(sk('marks'))) setTimeout(renderMarks, 80);
      const relevant = keys.some(k => (k.startsWith('vcc_global_') || k.startsWith(`vcc_${domain}_`)) && !videoData.includes(k));
      if (!relevant) return;
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => storageReady.then(reloadFromStorage), 60);
    });
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  function init() {
    loadState();
    lang = I18N.resolve(langPref);
    t = I18N.translator(lang);
    KEYS = loadKeys(domain);
    injectStyles();
    if (isSiteActive()) startVideoEngine();
  }

  // Mensagens do menu do ícone (popup) da extensão.
  function handleExtensionMessage(message) {
    switch (message?.type) {
      case 'VCC_TOGGLE_PANEL':
        toggleCPVisibility();
        return { ok: true };
      case 'VCC_OPEN_PANEL':
        if (!state.cpVisible) toggleCPVisibility();
        return { ok: true };
      case 'VCC_GET_STATUS':
        return { ok: true, domain, active: isSiteActive() };
      case 'VCC_SET_SITE_ACTIVE':
        if (message.on) {
          activateCurrentSite();
        } else {
          // Remove o domínio e qualquer domínio-pai que o ative.
          saveActiveSites(getActiveSites().filter(s => !(domain === s || domain.endsWith('.' + s))));
          deactivateCurrentSite();
        }
        return { ok: true, domain, active: isSiteActive(), needsReload: false };
      default:
        return null;
    }
  }

  if (extensionRuntime?.onMessage?.addListener) {
    extensionRuntime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!String(message?.type || '').startsWith('VCC_') || message.type === 'VCC_OPEN_OPTIONS') return false;
      storageReady
        .then(() => handleExtensionMessage(message))
        .then(sendResponse, err => sendResponse({ ok: false, error: String(err) }));
      return true; // resposta assíncrona (Chrome e Firefox)
    });
  }

  storageReady.then(() => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  });

})();
