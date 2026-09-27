# Chrome Web Store — página do VCC

Tudo o que o painel de desenvolvedor da Chrome Web Store pede, na ordem das abas. Mantenha este
arquivo em dia quando mudar a página na loja.

- **Pacote:** `releases/vcc-chrome-<versão>.zip` (gerado por `npm run package`)
- **Idiomas da extensão:** inglês (padrão, `default_locale: en`) e português (Brasil)

---

## Aba "Página na loja" (Store listing)

### Idioma

O idioma padrão da página é o **inglês**, porque é o `default_locale` da extensão. Preencha primeiro
em **English**, depois troque o seletor de idioma para **Português (Brasil)** e preencha a versão em
português.

O **nome** e o **resumo** vêm do próprio pacote (`_locales/*/messages.json`) e não são editáveis no
painel.

### Descrição — English

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
1. Pin VCC to the toolbar (Extensions button → pin icon next to VCC).
2. Open a page with a video and click the VCC icon.
3. Turn on video controls for that site — done.
Open the full panel anytime with the H key.

Default shortcuts: S/D speed − / +, R normal speed, G toggle 2×, Z/X back / forward, Q/E volume − / +, M mute, V bar mode, H panel.

🔒 PRIVACY
VCC does not collect, send or share any data. All settings stay in your browser. No ads, no tracking, no remote code.

VCC is a personal playback controller. It does not download media, extract streams, remove ads, bypass paywalls or interfere with content protection (DRM).

Why access to all sites? So the H shortcut and the panel work on any page with video. Controls are only enabled on sites you choose, and you can limit VCC to specific sites in the extension's "Site access" settings.

Open source: https://github.com/ofeliper/vcc-video-command-center
Found a bug or have an idea? Open an issue on GitHub.
```

### Descrição — Português (Brasil)

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
1. Fixe o VCC na barra de ferramentas (botão de extensões → alfinete ao lado do VCC).
2. Abra uma página com vídeo e clique no ícone do VCC.
3. Ative os controles de vídeo naquele site e pronto.
Você pode abrir o painel completo a qualquer momento com a tecla H.

Atalhos padrão: S/D velocidade − / +, R velocidade normal, G alterna 2×, Z/X voltar / avançar, Q/E volume − / +, M mudo, V modo da barra, H painel.

🔒 PRIVACIDADE
O VCC não coleta, não envia e não compartilha nenhum dado. Todas as configurações ficam salvas apenas no seu navegador. Não há anúncios, rastreamento ou código remoto.

O VCC é um controle pessoal de reprodução. Ele não baixa vídeos, não extrai streams, não remove anúncios, não contorna paywalls e não interfere em proteções de conteúdo (DRM).

Por que ele pede acesso a todos os sites? Para que o atalho H e o painel funcionem em qualquer página com vídeo. Os controles só são ativados nos sites que você escolher, e você pode limitar o VCC a sites específicos em "Acesso ao site", nos detalhes da extensão.

Código aberto: https://github.com/ofeliper/vcc-video-command-center
Encontrou um problema ou tem uma sugestão? Abra uma issue no GitHub.
```

### Categoria

**Entretenimento** (Entertainment). Alternativa: **Ferramentas** (Tools).

### Idioma da página

Inglês (principal) e Português (Brasil).

### Imagens

| Campo | Arquivo | Observação |
|---|---|---|
| Ícone da loja (128×128) | [`chrome/store-icon-128.png`](chrome/store-icon-128.png) | Arte de 96×96 com 16 px de margem transparente, como o Chrome pede |
| Capturas globais | [`screenshots/en-US/`](screenshots/en-US/) (4 imagens, 1280×800) | Usadas em qualquer idioma sem capturas próprias |
| Capturas localizadas — Português (Brasil) | [`screenshots/pt-BR/`](screenshots/pt-BR/) (4 imagens, 1280×800) | Envie com o seletor de idioma em Português (Brasil) |
| Bloco promocional pequeno (440×280) — **obrigatório** | [`chrome/promo-small-440x280.png`](chrome/promo-small-440x280.png) | Não é localizado: em inglês |
| Bloco promocional letreiro (1400×560) — opcional | [`chrome/promo-marquee-1400x560.png`](chrome/promo-marquee-1400x560.png) | Só aparece se o Google destacar a extensão |

Ordem das capturas: 1 painel, 2 menu do ícone, 3 atalhos, 4 vários vídeos.

### Campos extras

- **URL oficial:** deixe **Nenhum**. Só aceita sites verificados no Google Search Console; o GitHub não
  entra nisso.
- **URL da página inicial:** https://github.com/ofeliper/vcc-video-command-center
- **URL de suporte:** https://github.com/ofeliper/vcc-video-command-center/issues
- **Conteúdo adulto:** não.

---

## Aba "Privacidade" (Privacy practices)

### Finalidade única (Single purpose)

```
VCC provides personal playback controls (speed, seeking, volume, keyboard shortcuts, A→B loop, Picture-in-Picture) for HTML5 videos on the pages the user chooses.
```

### Justificativa das permissões

**Permissão de host (`<all_urls>`)**
```
VCC's content script loads a local control panel on web pages so the user can open it with the H shortcut on any site with video. Video detection and control only run on domains the user explicitly enables. No page content is read for any other purpose or sent anywhere.
```

**`storage`**
```
Saves the user's preferences locally: playback speed, keyboard shortcuts, volume, panel opacity, interface language and the list of sites where VCC is enabled.
```

**`activeTab`**
```
When the user clicks the VCC toolbar button, the popup reads the current tab's address to show the site name and whether VCC has access to it, and to send the "open panel" command to that tab.
```

### Código remoto

**Não, não estou usando código remoto.** Todo o JavaScript está dentro do pacote.

### Uso de dados

- Não marque nenhum tipo de dado coletado (o VCC não coleta nada).
- Marque as três declarações: não vende nem transfere dados a terceiros fora dos usos aprovados, não
  usa nem transfere dados para fins não relacionados à finalidade única, e não usa nem transfere
  dados para avaliar crédito ou conceder empréstimos.

### Política de privacidade (URL)

https://github.com/ofeliper/vcc-video-command-center/blob/main/PRIVACY.md

---

## Aba "Distribuição"

- **Visibilidade:** Pública
- **Regiões:** Todas as regiões
- **Pagamento:** Sem cobrança (gratuita)

## Depois do envio

- A revisão costuma levar de alguns dias a algumas semanas; o acesso a todos os sites pode deixá-la mais
  longa.
- Novas versões: envie `releases/vcc-chrome-<versão>.zip` em **Pacote → Enviar novo pacote**.
