# Página na loja da Mozilla (addons.mozilla.org)

Textos usados na página do VCC. Mantenha este arquivo em dia quando mudar a página na loja.

- **Nome:** VCC - Video Command Center
- **Categoria sugerida:** Fotos, música e vídeos
- **Tags:** `youtube`, `streaming`
  (não usar `video downloader`, `video converter` nem `user scripts`: o VCC não faz nada disso)
- **Página inicial:** https://github.com/ofeliper/vcc-video-command-center
- **Site de suporte:** https://github.com/ofeliper/vcc-video-command-center/issues
- **E-mail de suporte:** ofeliper.dev@gmail.com
- **Política de privacidade:** conteúdo de [`PRIVACY.md`](../PRIVACY.md)
- **Ícone:** `assets/icons/icon-128.png`
- **Capturas:** 1280×800, nesta ordem (a primeira é o destaque) —
  [`screenshots/pt-BR/`](screenshots/pt-BR/) para a página em português e
  [`screenshots/en-US/`](screenshots/en-US/) para a página em inglês

## Resumo (até 250 caracteres)

**Português**

> Controle total dos vídeos do navegador: velocidade de 0,1× a 16×, atalhos de teclado personalizáveis, loop A→B, Picture-in-Picture, volume e brilho, tudo num painel leve que funciona no YouTube e em qualquer site com vídeo HTML5.

**English**

> Take full control of browser videos: 0.1×–16× speed, customizable keyboard shortcuts, A→B loop, Picture-in-Picture, volume and brightness — in a lightweight panel that works on YouTube and any HTML5 video site.

## Descrição

### Português

```
O VCC (Video Command Center) coloca um painel de controle sobre qualquer vídeo HTML5 do navegador — no YouTube, em cursos online, redes sociais e na maioria dos sites com vídeo.

Ideal para assistir aulas mais rápido, rever um trecho várias vezes ou simplesmente ter os mesmos atalhos em todo site.

⚡ VELOCIDADE
• De 0,1× a 16×, com ajuste fino ou presets de 1× a 4× (teclas 1 a 7)
• Alternância rápida para 2× e volta à velocidade normal com uma tecla
• Mostra quanto tempo falta para o vídeo acabar na velocidade atual
• Estatísticas da sessão: tempo assistido e tempo economizado

⌨️ ATALHOS DE TECLADO
• Avançar e voltar, velocidade, volume e mudo sem tirar a mão do teclado
• Todos os atalhos podem ser trocados — globalmente ou só para um site
• Tecla 0 para play/pause do vídeo principal

🎬 RECURSOS EXTRAS
• Loop A→B para repetir um trecho
• Picture-in-Picture
• Copiar o momento atual do vídeo (timestamp)
• Brilho e inversão de cores para assistir no escuro
• Páginas com vários vídeos: escolha o principal, controle alguns ou todos, oculte ou silencie cada um
• Em português e inglês, com troca de idioma pelo painel ou pelo menu do ícone

🧭 COMO USAR
1. Abra uma página com vídeo e clique no ícone do VCC na barra de ferramentas.
2. Se pedido, permita o acesso ao site.
3. Ative os controles de vídeo naquele site e pronto.
Você pode abrir o painel completo a qualquer momento com a tecla H.

Atalhos padrão: S/D velocidade − / +, R velocidade normal, G alterna 2×, Z/X voltar / avançar, Q/E volume − / +, M mudo, V modo da barra, H painel.

🔒 PRIVACIDADE
O VCC não coleta, não envia e não compartilha nenhum dado. Todas as configurações ficam salvas apenas no seu navegador. Não há anúncios, rastreamento ou código remoto.

O VCC é um controle pessoal de reprodução. Ele não baixa vídeos, não extrai streams, não remove anúncios, não contorna paywalls e não interfere em proteções de conteúdo (DRM).

Por que ele pede acesso a todos os sites? Para que o atalho H e o painel funcionem em qualquer página com vídeo. Os controles só são ativados nos sites que você escolher, e você pode restringir o acesso a sites específicos nas permissões da extensão.

Código aberto: https://github.com/ofeliper/vcc-video-command-center
Encontrou um problema ou tem uma sugestão? Abra uma issue no GitHub.
```

### English

```
VCC (Video Command Center) adds a control panel to any HTML5 video in your browser — YouTube, online courses, social media and most video sites.

Great for watching lectures faster, replaying a section over and over, or simply having the same shortcuts everywhere.

⚡ SPEED
• 0.1× to 16×, with fine steps or 1×–4× presets (keys 1–7)
• One-key 2× toggle and reset to normal speed
• Shows how much time is left at the current speed
• Session stats: time watched and time saved

⌨️ KEYBOARD SHORTCUTS
• Seek, speed, volume and mute without leaving the keyboard
• Every shortcut can be remapped — globally or per site
• Key 0 plays/pauses the main video

🎬 EXTRAS
• A→B loop to repeat a section
• Picture-in-Picture
• Copy the current video timestamp
• Brightness and color inversion for night viewing
• Pages with several videos: pick the main one, control some or all, hide or mute each
• Available in English and Portuguese — switch languages from the panel or the toolbar menu

🧭 HOW TO USE
1. Open a page with a video and click the VCC icon in the toolbar.
2. If asked, allow access to the site.
3. Turn on video controls for that site — done.
Open the full panel anytime with the H key.

Default shortcuts: S/D speed − / +, R normal speed, G toggle 2×, Z/X back / forward, Q/E volume − / +, M mute, V bar mode, H panel.

🔒 PRIVACY
VCC does not collect, send or share any data. All settings stay in your browser. No ads, no tracking, no remote code.

VCC is a personal playback controller. It does not download media, extract streams, remove ads, bypass paywalls or interfere with content protection (DRM).

Why access to all sites? So the H shortcut and the panel work on any page with video. Controls are only enabled on sites you choose, and you can restrict access to specific sites in the extension's permissions.

Open source: https://github.com/ofeliper/vcc-video-command-center
Found a bug or have an idea? Open an issue on GitHub.
```

## Comentário do desenvolvedor

```
Dicas e limitações conhecidas

• O VCC só funciona nos sites que você ativar. Clique no ícone do VCC e ligue "Controles de vídeo", ou pressione H e use o botão "Ativar VCC".

• Alguns sites têm atalhos próprios que usam as mesmas teclas (por exemplo, M para mudo). Nos sites ativados, os atalhos do VCC têm prioridade. Você pode trocar qualquer atalho no painel, inclusive só para um site específico.

• Em transmissões ao vivo, a velocidade acima de 1× só funciona até alcançar o ponto ao vivo.

• Alguns players reiniciam a velocidade ao trocar de vídeo ou de anúncio. O VCC reaplica a velocidade escolhida automaticamente, mas em players muito personalizados isso pode falhar.

• Vídeos dentro de iframes de outros domínios dependem de o VCC ter acesso também a esse domínio.

• O VCC também existe como script para Tampermonkey, para quem usa outros navegadores:
https://github.com/ofeliper/vcc-video-command-center

Encontrou um problema? Abra uma issue no GitHub informando o site e a versão do Firefox. Isso ajuda muito a corrigir mais rápido.
```

## Legendas das capturas

**Português** (`screenshots/pt-BR/`)

1. `vcc-1-painel.png` — Painel de controle: velocidade de 0,1× a 16×, presets e tempo restante na velocidade atual.
2. `vcc-2-menu.png` — Menu do ícone: abra o painel, ligue ou desligue os controles em cada site e escolha o idioma.
3. `vcc-3-atalhos.png` — Atalhos de teclado personalizáveis, globais ou por site.
4. `vcc-4-varios-videos.png` — Páginas com vários vídeos: escolha o principal e controle os que quiser.

**English** (`screenshots/en-US/`)

1. `vcc-1-panel.png` — Control panel: 0.1×–16× speed, presets and time left at the current speed.
2. `vcc-2-menu.png` — Toolbar menu: open the panel, turn controls on or off per site and pick the language.
3. `vcc-3-shortcuts.png` — Customizable keyboard shortcuts, global or per site.
4. `vcc-4-multiple-videos.png` — Pages with several videos: pick the main one and control the ones you want.

## Envio de versões

- Pacote: `releases/vcc-firefox-<versão>.zip` (gerado por `npm run package`).
- Ferramentas de build / minificação / bundler: **não** — o build só copia os arquivos e preenche a versão.
- Notas da versão: copie a seção correspondente do [CHANGELOG](../CHANGELOG.md).

## Justificativa das permissões (para o revisor)

- `<all_urls>`: carrega a interface local do VCC nas páginas para que o atalho H e o painel estejam
  disponíveis. A detecção e o controle de vídeos só acontecem nos domínios ativados pelo usuário.
- `storage`: guarda as preferências localmente.
- `activeTab`: o menu do ícone lê o endereço da aba atual quando o usuário clica no botão, para
  mostrar o site e se o VCC tem acesso a ele.
- Coleta de dados: nenhuma (`data_collection_permissions: { required: ["none"] }`).
