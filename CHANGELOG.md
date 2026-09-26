# Changelog

Todas as mudanças relevantes do VCC. A versão é a mesma para a extensão (Firefox e Chrome) e para o
userscript do Tampermonkey.

## [0.6.2] — 2026-09-26

### Alterado
- Repositório reorganizado por papel: código principal em `src/core/`, partes da extensão em
  `src/extension/`, manifests em `manifests/` (base comum + diferenças por navegador), ícones em
  `assets/icons/` e textos das lojas em `store/`.
- A versão agora fica só no `package.json`; o build grava nos manifests e no cabeçalho do userscript.
- O userscript do Tampermonkey passa a ser gerado pelo build em `dist/userscript/vcc.user.js`
  (novo endereço de instalação e atualização).
- Os zips das lojas levam a versão no nome (`releases/vcc-firefox-0.6.2.zip`).
- Manifests incluem o link do projeto (`homepage_url`).

### Adicionado
- `npm run check` também confere se o userscript publicado está em dia com o código.
- `npm run release`: build, checagens, zips e verificador da Mozilla em um comando.

## [0.6.1] — 2026-09-26

### Alterado
- Toda a interface é montada sem `innerHTML`: o HTML passa por uma função que escapa os valores e é
  inserido como elementos. Resultado: 0 erros e 0 alertas no verificador da Mozilla. A aparência
  não mudou.

## [0.6.0] — 2026-09-26

### Adicionado
- Menu no ícone da barra de ferramentas: mostra se o VCC tem acesso ao site, pede a permissão
  (só neste site ou em todos), explica como liberar depois se for recusada, abre o painel e liga ou
  desliga os controles de vídeo no site.

### Alterado
- Manifest do Firefox pronto para a loja da Mozilla: ID definitivo, declaração de que não coleta
  dados e versão mínima Firefox 140 (Android 142). O service worker, sem suporte no Firefox, foi
  removido.

### Corrigido
- Nomes de site e teclas de atalho são escapados antes de aparecer na interface.
- O botão de copiar da lista de dados salvos não usa mais código inline, que era bloqueado em sites
  com CSP estrita.

## [0.5.1] — 2026-09-26

### Corrigido
- O VCC não aparecia no YouTube: o site exige Trusted Types e bloqueava a criação da barra e do
  painel.

## [0.5.0] — 2026-07-12

### Adicionado
- Painel disponível em qualquer página pela tecla H; os controles de vídeo só funcionam nos sites
  ativados.

## [0.4.1] — 2026-07-12

### Adicionado
- Play/pause do vídeo principal (tecla 0) e escolha do vídeo principal.

## [0.4.0] — 2026-07-12

### Adicionado
- Controles de volume e mudo.

## [0.3.0] — 2026-05-11

### Adicionado
- Primeira versão publicada no repositório: userscript para Tampermonkey e pacotes de extensão para
  Chrome e Firefox gerados a partir do mesmo código, com velocidade, avanço/retrocesso, atalhos
  configuráveis, Picture-in-Picture, loop A→B, vários vídeos por página e ajustes visuais.
