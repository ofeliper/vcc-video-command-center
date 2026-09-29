# Changelog

Todas as mudanças relevantes do VCC. A versão é a mesma para a extensão (Firefox e Chrome) e para o
userscript do Tampermonkey.

## [0.8.0] — 2026-09-29

### Adicionado
- **Página de configurações** (extensão): aparência, idioma, atalhos, comportamento, sites com
  ajustes próprios (ativar, velocidade, volume, opacidade, posição da barra, atalhos, apagar), dados e
  sobre. Abre pelo menu do ícone, pelo painel ou pelo gerenciador de extensões, e as mudanças valem na
  hora nas abas abertas.
- **Tema claro e escuro**, com opção automática que segue o sistema, no painel, na barra, no menu e
  na página de configurações. `npm run check` mede o contraste dos dois temas.
- **Barra de controle:**
  - posicionamento automático dentro do vídeo, no canto escolhido (em cima ou embaixo × esquerda,
    centro ou direita), acompanhando rolagem e redimensionamento;
  - opção de uma barra em cada vídeo, cada uma controlando só o próprio vídeo;
  - alça ⋮⋮ para arrastar a barra no modo livre.
- Menu do ícone com tema, botão de configurações e versão.
- Degradês com setas no topo e no pé do painel quando há mais conteúdo acima ou abaixo.

### Alterado
- Padrões: barra no modo **só alertas**, com alerta de **700 ms**, **posicionada automaticamente**
  dentro do vídeo e com opacidade de **80%**; painel com opacidade de **100%** (quem já tinha
  escolhido mantém o valor).
- A opacidade da barra e do painel pode ser ajustada no painel (seção Imagem) e na página de
  configurações. No painel, ela muda o padrão global, ou o valor do site quando ele tem um próprio.
- Nova paleta com todos os textos em contraste ≥ 4,5:1 (antes o nome do site no topo do painel tinha
  cerca de 2:1) e barra de rolagem visível.
- Na extensão, o painel (tecla H) ficou enxuto, só com os controles do vídeo; as configurações foram
  para a página de configurações. No Tampermonkey, o painel continua completo.
- A barra mostra um aviso rápido ao mudar a velocidade (útil no modo só alertas). No modo *oculta*, só
  a troca de modo aparece.
- Ligar ou desligar os controles num site vale na hora, sem recarregar a página.

### Removido
- Opções que apareciam no painel mas não funcionavam: volume boost, normalização de volume, skip de
  silêncio, salvar posição por URL e a chave "Loop A→B" (o loop continua pelos botões A e B).

## [0.7.1] — 2026-09-27

### Corrigido
- Não dava para arrastar a barra de controle: a posição nova era anulada pela proteção de estilo da
  barra (`all: initial !important`) e ela ia parar fora da tela, e essa posição errada ficava salva.
- A posição salva da barra agora é sempre mantida dentro da janela, o que também recupera barras que
  ficaram fora da tela por causa do bug acima.

### Alterado
- Opacidade padrão da barra de controle e do painel: 90% (antes 30% e 75%), para facilitar a
  leitura. Quem já tinha ajustado a opacidade mantém o valor escolhido.

## [0.7.0] — 2026-09-26

### Adicionado
- Interface em inglês (en-US) além de português (pt-BR): painel, barra de controle, menu do ícone,
  alertas e confirmações.
- Idioma automático pelo navegador (português → pt-BR; qualquer outro idioma → en-US), com escolha
  manual em **Painel → Comportamento e idioma** e no rodapé do **menu do ícone**. A troca vale para
  todos os sites e é aplicada na hora, inclusive nas abas já abertas.
- Nome e descrição da extensão traduzidos no gerenciador de extensões (`_locales`).
- `npm run check` confere se os dois idiomas têm os mesmos textos e se toda chave usada existe.

### Alterado
- Novo ícone: botão de play dentro de um medidor de velocidade, com cantos arredondados e versão
  simplificada para 16 px (barra de ferramentas). Fontes em `assets/icons/source/`.
- Termos em inglês que apareciam no português foram traduzidos: "Control Box"/"CB" → "barra de
  controle", "Control Panel"/"CP" → "painel", "Toggle 2×" → "Alternar 2×".
- Capturas de tela das lojas em português e inglês (`store/screenshots/pt-BR` e `en-US`).

### Corrigido
- O status do loop A→B mostrava as tags HTML como texto depois de marcar os pontos A e B
  (regressão da 0.6.1).

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
