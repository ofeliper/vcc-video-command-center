// ==UserScript==
// @name         VCC — Video Command Center
// @namespace    https://github.com/ofeliper/vcc-video-command-center
// @version      0.8.0
// @description  Centro de controle local para players HTML5, voltado a uso pessoal e sem recursos de download, extração de stream ou contorno de DRM.
// @author       ofeliper
// @homepageURL  https://github.com/ofeliper/vcc-video-command-center
// @supportURL   https://github.com/ofeliper/vcc-video-command-center/issues
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/ofeliper/vcc-video-command-center/main/dist/userscript/vcc.user.js
// @downloadURL  https://raw.githubusercontent.com/ofeliper/vcc-video-command-center/main/dist/userscript/vcc.user.js
// ==/UserScript==

// Traduções do VCC (pt-BR e en-US), usadas pelo painel, pela barra de controle
// e pelo menu do ícone. Funciona igual na extensão e no Tampermonkey.
//
// Preferência salva em "vcc_global_language": 'auto' (padrão), 'pt-BR' ou 'en-US'.
// Em 'auto', navegador em português → pt-BR; qualquer outro idioma → en-US.
//
// Para adicionar um texto: crie a mesma chave nos dois idiomas. {nome} é
// substituído pelo parâmetro de mesmo nome.
(function (root) {
  'use strict';

  const MESSAGES = {
    'pt-BR': {
      // Idioma
      'lang.title': 'Idioma / Language',
      'lang.auto': 'Automático ({name})',

      // Barra de controle
      'cb.back': 'retroceder',
      'cb.slower': 'velocidade −',
      'cb.drag': 'Arraste para mover',
      'cb.faster': 'velocidade +',
      'cb.fwd': 'avançar',
      'cb.volDown': 'volume −',
      'cb.muteToggle': 'alternar mudo',
      'cb.volUp': 'volume +',
      'cb.panel': 'painel',

      // Mensagens rápidas na barra
      'flash.muted': 'MUDO',
      'flash.volume': 'volume {n}%',
      'flash.play': '▶ play',
      'flash.pause': '⏸ pause',
      'flash.mode': 'modo: {mode}',
      'flash.copied': '✓ copiado',
      'flash.siteEnabled': '✓ site ativado',

      // Modos da barra
      'mode.visible': 'visível',
      'mode.alerts': 'só alertas',
      'mode.hidden': 'oculta',

      // Aviso de site inativo
      'site.inactiveTitle': '⚠ VCC não está ativo neste site',
      'site.inactiveText': "Enquanto este site estiver inativo, o VCC não detecta nem controla os vídeos da página.",
      'site.enable': 'Ativar VCC em {domain}',

      // Reprodução
      'sec.playback': 'Reprodução',
      'pb.reset': 'reset',
      'pb.toggle2x': 'alternar 2×',
      'pb.presets': 'Presets',
      'pb.seekBack': '« retroceder',
      'pb.seekFwd': 'avançar »',
      'pb.eta': 'Faltam {time} na velocidade atual de {speed}',
      'pb.noDuration': 'duração não disponível',
      'pb.presetPrompt': 'Velocidade do novo preset (ex: 0.5):',
      'pb.invalidValue': 'Valor inválido.',

      // Áudio
      'sec.audio': 'Áudio',
      'au.volume': 'Volume',
      'au.lower': '🔉 diminuir',
      'au.raise': 'aumentar 🔊',
      'au.mute': 'mudo',
      'au.unmute': 'restaurar volume',
      'au.muted': 'MUDO',

      // Navegação avançada
      'sec.nav': 'Navegação avançada',
      'nv.loop': "Loop A→B",
      'nv.loopSub': "Marque o ponto A e o ponto B para repetir o trecho entre eles.",
      'nv.setA': 'marcar ponto A',
      'nv.setB': 'marcar ponto B',
      'nv.clear': 'limpar loop',
      'nv.noLoop': 'nenhum loop configurado',
      'nv.notSet': 'não definido',
      'nv.active': '● ativo',
      'nv.pip': 'Picture-in-Picture',
      'nv.pipOn': 'ativar PiP',
      'nv.pipUnavailable': 'indisponível neste site',
      'nv.pipError': 'PiP indisponível: {error}',
      'nv.timestamp': 'copiar timestamp',

      // Visual
      'sec.visual': "Imagem",
      'vs.invert': 'Inversão de cores',
      'vs.invertSub': 'Útil para assistir no escuro',
      'vs.brightness': 'Brilho',
      'vs.opacity': 'Opacidade',
      'vs.barOpacity': 'Barra de controle',
      'vs.panelOpacity': 'Painel',

      // Vídeos na página
      'sec.videos': 'Vídeos na página',
      'vi.countOne': '{n} vídeo detectado',
      'vi.countOther': '{n} vídeos detectados',
      'vi.selectAll': 'selecionar todos',
      'vi.hint': 'Clique no indicador ★ ou no botão ★ para escolher o vídeo principal. A tecla 0 alterna play/pause nele.',
      'vi.video': 'vídeo {n}',
      'vi.main': 'Vídeo principal',
      'vi.setMain': 'Definir como vídeo principal',
      'vi.isMain': 'Este é o vídeo principal',
      'vi.mainBadge': 'principal',
      'vi.playPause': 'Play / Pause',
      'vi.hide': 'Ocultar / mostrar',
      'vi.mute': 'Mutar',
      'vi.remove': 'Remover da página',
      'vi.removeConfirm': 'Remover este elemento de vídeo da página?',

      // Atalhos
      'sec.keys': 'Atalhos de teclado',
      'ks.default': 'padrão (global)',
      'ks.addDomain': '+ domínio',
      'ks.domainPrompt': 'Domínio (ex: exemplo.com):',
      'ks.hintGlobal': 'Atalhos globais — usados quando não há configuração específica para o domínio.',
      'ks.hintScope': 'Atalhos específicos para {scope} — substituem o padrão neste domínio.',
      'ks.copyTo': 'copiar para {domain}',
      'ks.copied': 'Atalhos globais copiados para {domain}.',
      'ks.factory': 'restaurar padrões de fábrica',
      'ks.factoryConfirm': 'Restaurar atalhos de fábrica para este escopo?',
      'ks.help': 'Clique em qualquer tecla para reatribuir. Esc cancela. ✕ remove o atalho.',
      'ks.remove': 'Remover atalho',
      'ks.fixedPlay': 'Play / pause do vídeo principal (fixo)',
      'ks.fixedPresets': 'Presets 1.0×…4.0× (fixos)',
      'ks.invalid': 'inválida',
      'ks.inUse': 'em uso',
      'key.slowDown': 'Diminuir velocidade',
      'key.speedUp': 'Aumentar velocidade',
      'key.resetSpeed': 'Voltar para 1×',
      'key.toggle2x': 'Alternar 2×',
      'key.seekBack': 'Retroceder',
      'key.seekFwd': 'Avançar',
      'key.volumeDown': 'Diminuir volume',
      'key.volumeUp': 'Aumentar volume',
      'key.toggleMute': 'Mudo / restaurar volume',
      'key.toggleCB': 'Modo da barra (cicla)',
      'key.toggleCP': 'Abrir/fechar painel',

      // Comportamento e idioma
      'sec.behavior': "Preferências",
      'bh.steps': 'Valores de incremento',
      'bh.speedStep': 'Passo de velocidade',
      'bh.volumeStep': 'Passo de volume',
      'bh.seekStep': 'Passo de avanço',
      'bh.alertDuration': 'Duração do alerta',
      'bh.alertHint': 'Duração do aviso no modo "só alertas".',

      // Sites ativos
      'sec.sites': 'Sites ativos',
      'si.add': '+ adicionar domínio',
      'si.prompt': 'Domínio (ex: meusite.com):',

      // Estatísticas e compatibilidade
      'sec.stats': "Sessão e compatibilidade",
      'st.saved': 'tempo economizado',
      'st.watched': 'assistido nesta sessão',
      'st.avgSpeed': 'velocidade média',
      'st.quality': 'qualidade detectada',
      'st.compat': 'Compatibilidade — {domain}',
      'st.speedControl': 'Controle de velocidade',
      'st.pip': 'Picture-in-Picture',
      'st.available': 'disponível',
      'st.partial': 'parcial',
      'st.unavailable': 'indisponível',

      // Dados salvos
      'sec.data': 'Dados salvos e redefinições',
      'dt.stored': 'Dados armazenados pelo VCC',
      'dt.refresh': '↺ atualizar',
      'dt.copyAll': '⎘ copiar tudo',
      'dt.deleteAll': 'apagar todos os dados',
      'dt.resets': 'Redefinições',
      'dt.resetKeys': 'restaurar atalhos de fábrica',
      'dt.resetAll': 'restaurar todas as configurações',
      'dt.empty': '(nenhum dado salvo)',
      'dt.copyLine': 'Copiar linha',
      'dt.deleteConfirm': 'Apagar TODOS os dados do VCC?',
      'dt.deleted': 'Dados apagados.',
      'dt.resetKeysConfirm': 'Restaurar TODOS os atalhos para os padrões de fábrica?',
      'dt.resetAllConfirm': 'Restaurar TODAS as configurações? A página será recarregada.',

      // Menu do ícone
      'pop.unsupported': 'O VCC não funciona nesta página. Abra um site comum para usar o painel.',
      'pop.noAccess': '● Sem acesso a este site',
      'pop.noAccessText': 'Para o VCC funcionar aqui, permita que ele acesse o site.',
      'pop.grantSite': 'Permitir neste site',
      'pop.grantAll': 'Permitir em todos os sites',
      'pop.deniedTitle': 'Permissão não concedida.',
      'pop.deniedText': 'Para liberar depois, clique no botão de extensões da barra (ícone de peça de quebra-cabeça), procure o VCC e ative o acesso ao site — ou vá em Gerenciar extensão → Permissões e ative o acesso a todos os sites.',
      'pop.accessGranted': '● Acesso liberado',
      'pop.reloadText': 'Recarregue a página para o VCC começar a funcionar nela.',
      'pop.reload': 'Recarregar página',
      'pop.openPanel': 'Abrir painel',
      'pop.videoControls': 'Controles de vídeo',
      'pop.videoControlsAria': 'Controles de vídeo neste site',
      'pop.activeOn': 'ativos neste site',
      'pop.activeOff': 'desativados neste site',
      'pop.accessAll': 'Acesso: todos os sites',
      'pop.accessSome': 'Acesso: sites escolhidos',
      'pop.allowAll': 'Liberar todos',
      'pop.language': 'Idioma',

      // 0.8.0: barra, tema, menu e página de configurações
      'cp.close': "Fechar",
      'cp.settings': "Configurações",
      'site.inactiveBadge': "site inativo",
      'pb.speedInput': "Velocidade",
      'vi.target': "Controlar este vídeo",
      'sec.bar': "Barra de controle",
      'bar.mode': "Modo",
      'bar.modeHint': "A tecla {key} alterna entre os modos.",
      'bar.auto': "Posicionar automaticamente",
      'bar.autoSub': "Dentro do vídeo, no canto escolhido abaixo",
      'bar.anchor': "Posição no vídeo",
      'bar.perVideo': "Uma barra em cada vídeo",
      'bar.perVideoSub': "Cada barra controla só o próprio vídeo",
      'bar.perVideoNeedsAuto': "Requer o posicionamento automático",
      'bar.freeHint': "Arraste a barra pela alça ⋮⋮ para mudar de lugar.",
      'anchor.top-left': "Em cima, à esquerda",
      'anchor.top-center': "Em cima, no centro",
      'anchor.top-right': "Em cima, à direita",
      'anchor.bottom-left': "Embaixo, à esquerda",
      'anchor.bottom-center': "Embaixo, no centro",
      'anchor.bottom-right': "Embaixo, à direita",
      'theme.title': "Tema",
      'theme.auto': "Automático ({name})",
      'theme.light': "Claro",
      'theme.dark': "Escuro",
      'pop.theme': "Tema",
      'pop.settings': "Configurações",
      'pop.version': "Versão {v}",
      'opt.title': "Configurações do VCC",
      'opt.nav.appearance': "Aparência",
      'opt.nav.language': "Idioma",
      'opt.nav.keys': "Atalhos",
      'opt.nav.behavior': "Comportamento",
      'opt.nav.sites': "Sites",
      'opt.nav.data': "Dados",
      'opt.nav.about': "Sobre",
      'opt.saved': "Salvo",
      'opt.opacityDefaults': "Opacidade padrão",
      'opt.opacityHint': "Vale para os sites sem opacidade própria (veja Sites).",
      'opt.langHint': "Automático segue o idioma do navegador: português → Português (Brasil); qualquer outro → English.",
      'opt.keysHint': "Atalhos usados em todos os sites. Para mudar só em um site, use a seção Sites.",
      'opt.sitesHint': "Sites onde o VCC está ativo ou que têm configurações salvas. Os ajustes feitos aqui valem só para o site.",
      'opt.addSitePlaceholder': "exemplo.com",
      'opt.invalidDomain': "Domínio inválido.",
      'opt.noSites': "Nenhum site ainda. Ative o VCC num site pelo menu do ícone ou adicione um domínio acima.",
      'opt.siteActive': "Controles de vídeo ativos",
      'opt.siteOn': "ativo",
      'opt.siteOff': "inativo",
      'opt.siteSpeed': "Velocidade salva",
      'opt.siteVolume': "Volume salvo",
      'opt.siteMuted': "Mudo",
      'opt.useDefault': "Usar o padrão ({value})",
      'opt.siteBarPos': "Posição da barra (modo livre)",
      'opt.posDefault': "padrão (canto superior esquerdo)",
      'opt.resetPos': "Redefinir posição",
      'opt.siteKeys': "Atalhos deste site",
      'opt.siteKeysGlobal': "Usar os atalhos globais",
      'opt.siteKeysCustom': "Personalizar para este site",
      'opt.siteDelete': "Apagar configurações deste site",
      'opt.siteDeleteConfirm': "Apagar todas as configurações de {domain}?",
      'opt.dataCount': "{n} itens salvos",
      'opt.showData': "Ver dados salvos",
      'opt.resetAllConfirm': "Restaurar TODAS as configurações para os padrões de fábrica?",
      'opt.aboutText': "Controle pessoal de reprodução para vídeos HTML5. O VCC não coleta nem envia dados: tudo fica no seu navegador.",
      'opt.source': "Código-fonte (GitHub)",
      'opt.issues': "Relatar um problema",
      'opt.privacy': "Política de privacidade",
      'opt.contact': "Contato",
    },

    'en-US': {
      'lang.title': 'Language / Idioma',
      'lang.auto': 'Automatic ({name})',

      'cb.back': 'seek back',
      'cb.slower': 'speed −',
      'cb.drag': 'Drag to move',
      'cb.faster': 'speed +',
      'cb.fwd': 'seek forward',
      'cb.volDown': 'volume −',
      'cb.muteToggle': 'toggle mute',
      'cb.volUp': 'volume +',
      'cb.panel': 'panel',

      'flash.muted': 'MUTED',
      'flash.volume': 'volume {n}%',
      'flash.play': '▶ play',
      'flash.pause': '⏸ pause',
      'flash.mode': 'mode: {mode}',
      'flash.copied': '✓ copied',
      'flash.siteEnabled': '✓ site enabled',

      'mode.visible': 'visible',
      'mode.alerts': 'alerts only',
      'mode.hidden': 'hidden',

      'site.inactiveTitle': '⚠ VCC is not enabled on this site',
      'site.inactiveText': "While this site is off, VCC doesn’t detect or control the videos on this page.",
      'site.enable': 'Enable VCC on {domain}',

      'sec.playback': 'Playback',
      'pb.reset': 'reset',
      'pb.toggle2x': 'toggle 2×',
      'pb.presets': 'Presets',
      'pb.seekBack': '« back',
      'pb.seekFwd': 'forward »',
      'pb.eta': '{time} left at the current speed of {speed}',
      'pb.noDuration': 'duration unavailable',
      'pb.presetPrompt': 'Speed for the new preset (e.g. 0.5):',
      'pb.invalidValue': 'Invalid value.',

      'sec.audio': 'Audio',
      'au.volume': 'Volume',
      'au.lower': '🔉 lower',
      'au.raise': 'raise 🔊',
      'au.mute': 'mute',
      'au.unmute': 'unmute',
      'au.muted': 'MUTED',

      'sec.nav': 'Advanced navigation',
      'nv.loop': "A→B loop",
      'nv.loopSub': "Set point A and point B to repeat the section between them.",
      'nv.setA': 'set point A',
      'nv.setB': 'set point B',
      'nv.clear': 'clear loop',
      'nv.noLoop': 'no loop set',
      'nv.notSet': 'not set',
      'nv.active': '● active',
      'nv.pip': 'Picture-in-Picture',
      'nv.pipOn': 'toggle PiP',
      'nv.pipUnavailable': 'unavailable on this site',
      'nv.pipError': 'PiP unavailable: {error}',
      'nv.timestamp': 'copy timestamp',

      'sec.visual': "Picture",
      'vs.invert': 'Invert colors',
      'vs.invertSub': 'Handy for watching in the dark',
      'vs.brightness': 'Brightness',
      'vs.opacity': 'Opacity',
      'vs.barOpacity': 'Control bar',
      'vs.panelOpacity': 'Panel',

      'sec.videos': 'Videos on this page',
      'vi.countOne': '{n} video detected',
      'vi.countOther': '{n} videos detected',
      'vi.selectAll': 'select all',
      'vi.hint': 'Click the ★ marker or the ★ button to choose the main video. Key 0 toggles play/pause on it.',
      'vi.video': 'video {n}',
      'vi.main': 'Main video',
      'vi.setMain': 'Set as main video',
      'vi.isMain': 'This is the main video',
      'vi.mainBadge': 'main',
      'vi.playPause': 'Play / Pause',
      'vi.hide': 'Hide / show',
      'vi.mute': 'Mute',
      'vi.remove': 'Remove from page',
      'vi.removeConfirm': 'Remove this video element from the page?',

      'sec.keys': 'Keyboard shortcuts',
      'ks.default': 'default (global)',
      'ks.addDomain': '+ domain',
      'ks.domainPrompt': 'Domain (e.g. example.com):',
      'ks.hintGlobal': 'Global shortcuts — used when a domain has no specific setup.',
      'ks.hintScope': 'Shortcuts for {scope} — they override the defaults on this domain.',
      'ks.copyTo': 'copy to {domain}',
      'ks.copied': 'Global shortcuts copied to {domain}.',
      'ks.factory': 'restore factory defaults',
      'ks.factoryConfirm': 'Restore factory shortcuts for this scope?',
      'ks.help': 'Click any key to reassign it. Esc cancels. ✕ removes the shortcut.',
      'ks.remove': 'Remove shortcut',
      'ks.fixedPlay': 'Play / pause main video (fixed)',
      'ks.fixedPresets': 'Presets 1.0×…4.0× (fixed)',
      'ks.invalid': 'invalid',
      'ks.inUse': 'in use',
      'key.slowDown': 'Slow down',
      'key.speedUp': 'Speed up',
      'key.resetSpeed': 'Reset to 1×',
      'key.toggle2x': 'Toggle 2×',
      'key.seekBack': 'Seek back',
      'key.seekFwd': 'Seek forward',
      'key.volumeDown': 'Volume down',
      'key.volumeUp': 'Volume up',
      'key.toggleMute': 'Mute / unmute',
      'key.toggleCB': 'Bar mode (cycles)',
      'key.toggleCP': 'Open/close panel',

      'sec.behavior': "Preferences",
      'bh.steps': 'Step sizes',
      'bh.speedStep': 'Speed step',
      'bh.volumeStep': 'Volume step',
      'bh.seekStep': 'Seek step',
      'bh.alertDuration': 'Alert duration',
      'bh.alertHint': 'How long the alert stays up in "alerts only" mode.',

      'sec.sites': 'Enabled sites',
      'si.add': '+ add domain',
      'si.prompt': 'Domain (e.g. mysite.com):',

      'sec.stats': "Session & compatibility",
      'st.saved': 'time saved',
      'st.watched': 'watched this session',
      'st.avgSpeed': 'average speed',
      'st.quality': 'detected quality',
      'st.compat': 'Compatibility — {domain}',
      'st.speedControl': 'Speed control',
      'st.pip': 'Picture-in-Picture',
      'st.available': 'available',
      'st.partial': 'partial',
      'st.unavailable': 'unavailable',

      'sec.data': 'Saved data & resets',
      'dt.stored': 'Data stored by VCC',
      'dt.refresh': '↺ refresh',
      'dt.copyAll': '⎘ copy all',
      'dt.deleteAll': 'delete all data',
      'dt.resets': 'Resets',
      'dt.resetKeys': 'restore factory shortcuts',
      'dt.resetAll': 'reset all settings',
      'dt.empty': '(no saved data)',
      'dt.copyLine': 'Copy line',
      'dt.deleteConfirm': 'Delete ALL VCC data?',
      'dt.deleted': 'Data deleted.',
      'dt.resetKeysConfirm': 'Restore ALL shortcuts to factory defaults?',
      'dt.resetAllConfirm': 'Reset ALL settings? The page will reload.',

      'pop.unsupported': 'VCC can’t run on this page. Open a regular website to use the panel.',
      'pop.noAccess': '● No access to this site',
      'pop.noAccessText': 'To use VCC here, allow it to access this site.',
      'pop.grantSite': 'Allow on this site',
      'pop.grantAll': 'Allow on all sites',
      'pop.deniedTitle': 'Permission not granted.',
      'pop.deniedText': 'To allow it later, click the Extensions button in the toolbar (puzzle-piece icon), find VCC and allow access to the site — or go to Manage Extension → Permissions and allow access to all websites.',
      'pop.accessGranted': '● Access granted',
      'pop.reloadText': 'Reload the page to start VCC on it.',
      'pop.reload': 'Reload page',
      'pop.openPanel': 'Open panel',
      'pop.videoControls': 'Video controls',
      'pop.videoControlsAria': 'Video controls on this site',
      'pop.activeOn': 'on for this site',
      'pop.activeOff': 'off for this site',
      'pop.accessAll': 'Access: all sites',
      'pop.accessSome': 'Access: selected sites',
      'pop.allowAll': 'Allow all',
      'pop.language': 'Language',

      // 0.8.0: barra, tema, menu e página de configurações
      'cp.close': "Close",
      'cp.settings': "Settings",
      'site.inactiveBadge': "site off",
      'pb.speedInput': "Speed",
      'vi.target': "Control this video",
      'sec.bar': "Control bar",
      'bar.mode': "Mode",
      'bar.modeHint': "The {key} key cycles through the modes.",
      'bar.auto': "Position automatically",
      'bar.autoSub': "Inside the video, in the corner chosen below",
      'bar.anchor': "Position in the video",
      'bar.perVideo': "One bar per video",
      'bar.perVideoSub': "Each bar controls only its own video",
      'bar.perVideoNeedsAuto': "Requires automatic positioning",
      'bar.freeHint': "Drag the bar by its ⋮⋮ handle to move it.",
      'anchor.top-left': "Top left",
      'anchor.top-center': "Top center",
      'anchor.top-right': "Top right",
      'anchor.bottom-left': "Bottom left",
      'anchor.bottom-center': "Bottom center",
      'anchor.bottom-right': "Bottom right",
      'theme.title': "Theme",
      'theme.auto': "Automatic ({name})",
      'theme.light': "Light",
      'theme.dark': "Dark",
      'pop.theme': "Theme",
      'pop.settings': "Settings",
      'pop.version': "Version {v}",
      'opt.title': "VCC Settings",
      'opt.nav.appearance': "Appearance",
      'opt.nav.language': "Language",
      'opt.nav.keys': "Shortcuts",
      'opt.nav.behavior': "Behavior",
      'opt.nav.sites': "Sites",
      'opt.nav.data': "Data",
      'opt.nav.about': "About",
      'opt.saved': "Saved",
      'opt.opacityDefaults': "Default opacity",
      'opt.opacityHint': "Applies to sites without their own opacity (see Sites).",
      'opt.langHint': "Automatic follows the browser language: Portuguese → Português (Brasil); anything else → English.",
      'opt.keysHint': "Shortcuts used on every site. To change them for one site only, use the Sites section.",
      'opt.sitesHint': "Sites where VCC is on or that have saved settings. Changes made here apply to that site only.",
      'opt.addSitePlaceholder': "example.com",
      'opt.invalidDomain': "Invalid domain.",
      'opt.noSites': "No sites yet. Turn VCC on for a site from the toolbar menu or add a domain above.",
      'opt.siteActive': "Video controls on",
      'opt.siteOn': "on",
      'opt.siteOff': "off",
      'opt.siteSpeed': "Saved speed",
      'opt.siteVolume': "Saved volume",
      'opt.siteMuted': "Muted",
      'opt.useDefault': "Use default ({value})",
      'opt.siteBarPos': "Bar position (free mode)",
      'opt.posDefault': "default (top left corner)",
      'opt.resetPos': "Reset position",
      'opt.siteKeys': "Shortcuts for this site",
      'opt.siteKeysGlobal': "Use the global shortcuts",
      'opt.siteKeysCustom': "Customize for this site",
      'opt.siteDelete': "Delete this site’s settings",
      'opt.siteDeleteConfirm': "Delete all settings for {domain}?",
      'opt.dataCount': "{n} saved items",
      'opt.showData': "Show saved data",
      'opt.resetAllConfirm': "Reset ALL settings to factory defaults?",
      'opt.aboutText': "Personal playback controls for HTML5 videos. VCC doesn’t collect or send any data: everything stays in your browser.",
      'opt.source': "Source code (GitHub)",
      'opt.issues': "Report a problem",
      'opt.privacy': "Privacy policy",
      'opt.contact': "Contact",
    },
  };

  const SUPPORTED = ['pt-BR', 'en-US'];
  const FALLBACK = 'en-US';

  // Nome de cada idioma no próprio idioma, para quem não entende o idioma atual.
  const LANGUAGE_NAMES = { 'pt-BR': 'Português (Brasil)', 'en-US': 'English' };
  // Versão curta, usada em "Automático (Português)".
  const SHORT_NAMES = { 'pt-BR': 'Português', 'en-US': 'English' };

  function browserLanguage() {
    let lang = '';
    try { lang = (root.browser || root.chrome)?.i18n?.getUILanguage?.() || ''; } catch {}
    if (!lang) { try { lang = root.navigator?.language || ''; } catch {} }
    return lang;
  }

  // Idioma usado em "Automático".
  function detect() {
    return /^pt(\b|[-_])/i.test(browserLanguage()) ? 'pt-BR' : FALLBACK;
  }

  // Converte a preferência salva ('auto' | 'pt-BR' | 'en-US') no idioma efetivo.
  function resolve(pref) {
    return SUPPORTED.includes(pref) ? pref : detect();
  }

  function translator(lang) {
    const dict = MESSAGES[lang] || MESSAGES[FALLBACK];
    return function t(key, params) {
      const text = dict[key] ?? MESSAGES[FALLBACK][key] ?? key;
      return params ? text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : text;
    };
  }

  root.VCC_I18N = {
    MESSAGES,
    SUPPORTED,
    LANGUAGE_NAMES,
    SHORT_NAMES,
    STORAGE_KEY: 'vcc_global_language',
    detect,
    resolve,
    translator,
  };
})(globalThis);

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
    cbOpacity: 1,             // opacidade padrão da barra (0.1–1)
    cpOpacity: 1,             // opacidade padrão do painel (0.2–1)
    alertDuration: 500,       // ms que a barra fica visível no modo "alertas"
    seekStep: 10,             // segundos
    speedStep: 0.1,           // ×
    volumeStep: 5,            // %
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    language: 'auto',         // 'auto' | 'pt-BR' | 'en-US'
    barAuto: false,           // posicionar a barra automaticamente dentro do vídeo
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
    speedStep:     DEFAULTS.speedStep,
    volume:        1.0,
    lastVolume:    1.0,
    muted:         false,
    volumeStep:    DEFAULTS.volumeStep,
    themePref:     DEFAULTS.theme,
    barAuto:       DEFAULTS.barAuto,
    barAnchor:     DEFAULTS.barAnchor,
    barLayout:     DEFAULTS.barLayout,
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
    state.speedStep     = clamp(load(gk('speedStep'),     DEFAULTS.speedStep), 0.05, 1, DEFAULTS.speedStep);
    state.volume        = clamp(load(sk('volume'), 1.0), 0, 1, 1.0);
    state.lastVolume    = clamp(load(sk('lastVolume'), state.volume || 1.0), 0.01, 1, 1.0);
    state.muted         = !!load(sk('muted'), false);
    state.volumeStep    = clamp(load(gk('volumeStep'), DEFAULTS.volumeStep), 1, 25, DEFAULTS.volumeStep);
    state.themePref     = oneOf(load(gk('theme'), DEFAULTS.theme), SHARED.THEMES_PREFS, DEFAULTS.theme);
    state.barAuto       = !!load(gk('barAuto'), DEFAULTS.barAuto);
    state.barAnchor     = oneOf(load(gk('barAnchor'), DEFAULTS.barAnchor), SHARED.BAR_ANCHORS, DEFAULTS.barAnchor);
    state.barLayout     = oneOf(load(gk('barLayout'), DEFAULTS.barLayout), ['single', 'perVideo'], DEFAULTS.barLayout);
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
  //
  // A velocidade "global" (state.speed) vale para os vídeos selecionados.
  // No modo "uma barra em cada vídeo", cada barra pode dar ao próprio vídeo
  // uma velocidade diferente (vid._vccSpeed); os atalhos voltam a usar a global.
  // ─────────────────────────────────────────────
  function clampSpeed(v) {
    return Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round(v * 100) / 100));
  }

  const videoSpeed = vid => vid._vccSpeed ?? state.speed;

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
    flashCB(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
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

    // Reaplica quando o src muda (troca de mídia, playlists ou próximo item)
    vid.addEventListener('emptied', () => {
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
      .vcc-bar .vcc-bar-speed { min-width: 44px; color: var(--vcc-text); cursor: default; }
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
      <span class="vcc-bar-label vcc-bar-speed" aria-live="polite">1.0×</span>
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
      if (act === 'back')  { seekVideo(vid, -state.seekStep); flashCB(`-${state.seekStep}s`, [vid]); }
      if (act === 'fwd')   { seekVideo(vid, +state.seekStep); flashCB(`+${state.seekStep}s`, [vid]); }
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

  // Mostra um aviso rápido na barra (velocidade, volume…). `videos` limita às
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
      if (label && text != null) label.textContent = text;
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

  // ── Posicionamento ──
  function positionBar(bar) {
    const el = bar.el;
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
    try { r = vid && vid.isConnected ? vid.getBoundingClientRect() : null; } catch {}
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
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return; dragging = false;
      const r = el.getBoundingClientRect(); if (onDrop) onDrop(r.left, r.top);
    });
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
        <div id="vcc-cp-fade" aria-hidden="true">▾</div>
      </div>
      ${IS_EXTENSION ? escapeHTML`<div id="vcc-cp-foot"><button class="vcc-abt" id="vcc-open-settings">⚙ ${t('cp.settings')}</button></div>` : ''}
    `);

    // Mesmo root que a barra: escapa overflow/clip do <body>
    document.documentElement.appendChild(cpEl);
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
  }

  // Degradê no pé do painel enquanto houver conteúdo abaixo.
  function updateScrollCue() {
    const s = cpEl?.querySelector('#vcc-cp-scroll');
    const fade = cpEl?.querySelector('#vcc-cp-fade');
    if (!s || !fade) return;
    fade.classList.toggle('show', s.scrollHeight - s.scrollTop - s.clientHeight > 6);
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
          <button class="vcc-abt" id="vcc-seek-back">${t('pb.seekBack')}</button>
          <button class="vcc-abt" id="vcc-seek-fwd">${t('pb.seekFwd')}</button>
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
        </div>
        <div class="vcc-loop-status" id="vcc-loop-status">
          <span class="none">${t('nv.noLoop')}</span>
        </div>
        <div class="vcc-row" style="margin-top:6px">
          <div class="vcc-row-label">${t('nv.pip')}</div>
          <button class="vcc-abt" id="vcc-pip"${!document.pictureInPictureEnabled ? ' disabled' : ''}>${t(document.pictureInPictureEnabled ? 'nv.pipOn' : 'nv.pipUnavailable')}</button>
        </div>
        <div class="vcc-abts" style="margin-top:2px">
          <button class="vcc-abt" id="vcc-timestamp">${t('nv.timestamp')}</button>
        </div>
      `, false, true),

      // ── Imagem ──
      acc('vs', '◑', t('sec.visual'), escapeHTML`
        ${tog('invert', false, t('vs.invert'), t('vs.invertSub'), { videoControl: true })}
        <div class="vcc-slr vcc-video-control${state.videoControlsActive ? '' : ' vcc-disabled'}"><label for="vcc-brightness">${t('vs.brightness')}</label><input type="range" id="vcc-brightness" min="10" max="200" value="100" step="5"><span class="vcc-slv" id="vcc-brightness-val">100%</span></div>
        ${IS_EXTENSION ? '' : escapeHTML`
          <p class="vcc-sub-title" style="margin-top:10px">${t('vs.opacity')}</p>
          <div class="vcc-slr"><label for="vcc-cb-op">${t('vs.barOpacity')}</label><input type="range" id="vcc-cb-op" min="10" max="100" value="${Math.round(state.cbOpacity * 100)}" step="5"><span class="vcc-slv" id="vcc-cb-op-val">${Math.round(state.cbOpacity * 100)}%</span></div>
          <div class="vcc-slr"><label for="vcc-cp-op">${t('vs.panelOpacity')}</label><input type="range" id="vcc-cp-op" min="20" max="100" value="${Math.round(state.cpOpacity * 100)}" step="5"><span class="vcc-slv" id="vcc-cp-op-val">${Math.round(state.cpOpacity * 100)}%</span></div>`}
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

    // Imagem
    bindTog('invert', () => applyVideoFilter());
    q('#vcc-brightness').addEventListener('input', e => {
      q('#vcc-brightness-val').textContent = e.target.value + '%'; applyVideoFilter();
    });
    q('#vcc-cb-op')?.addEventListener('input', e => {
      state.cbOpacity = parseInt(e.target.value) / 100;
      save(sk('cbOpacity'), state.cbOpacity);
      bars.forEach(bar => bar.el.style.setProperty('opacity', state.cbOpacity, 'important'));
      q('#vcc-cb-op-val').textContent = e.target.value + '%';
    });
    q('#vcc-cp-op')?.addEventListener('input', e => {
      state.cpOpacity = parseInt(e.target.value) / 100;
      save(sk('cpOpacity'), state.cpOpacity);
      cpEl.style.setProperty('opacity', state.cpOpacity, 'important');
      q('#vcc-cp-op-val').textContent = e.target.value + '%';
    });

    // Barra de controle
    cpEl.querySelectorAll('#vcc-bar-mode button').forEach(b => b.addEventListener('click', () => setBarMode(b.dataset.value)));
    bindTog('barauto', on => setBarOption('barAuto', on));
    bindTog('barpervideo', on => setBarOption('barLayout', on ? 'perVideo' : 'single'));
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
    setSafeHTML(eta, tStrong('pb.eta', { time: fmtDuration(rem), speed: fmtSpeed(speed) + '×' }));
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
              state.primaryVideo = i; buildVideoList(); updateETA(); positionBars(); break;
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

  function applyVideoFilter() {
    const invert = cpEl?.querySelector('#vcc-tog-invert')?.classList.contains('on') ? 1 : 0;
    const bright = cpEl?.querySelector('#vcc-brightness')?.value ?? 100;
    state.videos.forEach(v => { try { v.style.filter = `invert(${invert}) brightness(${bright}%)`; } catch {} });
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
    cpEl.style.setProperty('display', state.cpVisible ? 'flex' : 'none', 'important');
    if (state.cpVisible) {
      updateCPSpeed(); updateETA(); buildVideoList();
      renderCompatibility(); updateStats(); refreshStorageList();
      updateBarSectionUI(); updateLoopStatus();
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
    ]);
  }

  function reloadFromStorage() {
    const before = settingsSnapshot();
    const prevSpeed = state.speed, prevVolume = state.volume, prevMuted = state.muted;
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
      const relevant = Object.keys(changes).some(k => k.startsWith('vcc_global_') || k.startsWith(`vcc_${domain}_`));
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
