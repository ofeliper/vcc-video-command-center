# VCC — Video Command Center

O VCC é um painel de controle para vídeos HTML5 no navegador: velocidade de 0,1× a 16×, atalhos de
teclado personalizáveis, loop A→B, Picture-in-Picture, volume, brilho e controle de páginas com
vários vídeos. Funciona no YouTube e na maioria dos sites com vídeo.

Está disponível como **extensão para Firefox**, **extensão para Chrome** (e Edge) e **userscript
para Tampermonkey**, todos gerados a partir do mesmo código, em **português (pt-BR)** e
**inglês (en-US)**.

> O VCC é um controle pessoal de reprodução. Ele **não** baixa vídeos, não extrai streams, não remove
> anúncios, não contorna paywalls e não interfere em proteções de conteúdo (DRM). Também não coleta
> nem envia dados.

- [Recursos](#recursos)
- [Instalação](#instalação)
- [Como usar](#como-usar)
- [Idioma](#idioma)
- [Permissões e privacidade](#permissões-e-privacidade)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Desenvolvimento](#desenvolvimento)
- [Publicar uma nova versão](#publicar-uma-nova-versão)
- [Changelog](CHANGELOG.md)

---

## Recursos

**Velocidade**
- De 0,1× a 16×, com passo configurável ou presets de 1× a 4× (teclas 1 a 7).
- Alternância rápida para 2× e volta à velocidade normal.
- Tempo restante do vídeo na velocidade atual.
- A velocidade é reaplicada quando o player a reinicia (troca de vídeo, anúncio, play).

**Atalhos de teclado**
- Avançar/voltar, velocidade, volume, mudo e painel sem tirar a mão do teclado.
- Todos os atalhos podem ser trocados, globalmente ou só para um site.
- Tecla 0: play/pause do vídeo principal.

**Extras**
- Loop A→B, Picture-in-Picture e cópia do timestamp atual.
- Brilho e inversão de cores.
- Páginas com vários vídeos: escolha o principal, aplique os controles a alguns ou a todos, oculte,
  silencie ou remova cada um.
- Barra de controle compacta sobre a página (arrastável, com modos visível / só alertas / oculta) e
  opacidade ajustável da barra e do painel.
- Estatísticas da sessão (tempo assistido, tempo economizado) e verificação de compatibilidade.

**Em desenvolvimento** — aparecem no painel, mas ainda não têm efeito: volume boost, normalização de
volume, skip de silêncio e salvar posição por URL.

## Instalação

### Firefox

- **Loja da Mozilla (addons.mozilla.org):** em análise. O link será adicionado aqui quando for
  aprovado.
- **Teste temporário** (some ao fechar o Firefox): gere o build (veja [Desenvolvimento](#desenvolvimento)),
  abra `about:debugging#/runtime/this-firefox`, clique em *Carregar extensão temporária* e escolha
  `dist/firefox/manifest.json`.

Requer Firefox 140 ou mais recente (Firefox para Android 142).

### Chrome e Edge

- **Chrome Web Store:** ainda não publicado.
- **Sem a loja:** gere o build, abra `chrome://extensions` (ou `edge://extensions`), ative o
  *Modo do desenvolvedor*, clique em *Carregar sem compactação* e escolha a pasta `dist/chrome`.

### Tampermonkey

Com o Tampermonkey instalado, abra o link abaixo e confirme a instalação:

https://raw.githubusercontent.com/ofeliper/vcc-video-command-center/main/dist/userscript/vcc.user.js

O Tampermonkey verifica atualizações nesse mesmo endereço.

> As configurações da extensão e do Tampermonkey ficam em lugares separados; instalar um não leva as
> configurações do outro.

## Como usar

1. Abra uma página com vídeo e clique no ícone do VCC na barra de ferramentas.
2. Se o menu pedir, permita o acesso ao site (só nele ou em todos os sites).
3. Ligue **Controles de vídeo** para aquele site.

A qualquer momento, a tecla **H** abre o painel completo. Sem ativar o site, o painel mostra só as
configurações gerais e um botão para ativá-lo.

### Menu do ícone (extensão)

- Mostra se o VCC tem acesso ao site atual e pede a permissão quando falta. Se ela for recusada,
  explica como liberar depois (botão de extensões da barra ou *Gerenciar extensão → Permissões*).
- **Abrir painel**: o mesmo que a tecla H.
- **Controles de vídeo**: liga ou desliga o VCC no site atual.

### Atalhos padrão

| Tecla | Ação |
|---|---|
| S / D | Diminuir / aumentar velocidade |
| R | Voltar para 1× |
| G | Alternar 2× |
| Z / X | Voltar / avançar (10 s por padrão) |
| Q / E | Diminuir / aumentar volume |
| M | Mudo |
| V | Modo da barra de controle (visível → só alertas → oculta) |
| H | Abrir / fechar o painel |
| 0 | Play / pause do vídeo principal *(fixo)* |
| 1 a 7 | Presets 1×, 1,25×, 1,5×, 1,75×, 2×, 3×, 4× *(fixos)* |

Os atalhos não disparam enquanto você digita em campos de texto. Troque qualquer um em
**Painel → Atalhos de teclado**.

## Idioma

O VCC tem interface em **português (pt-BR)** e **inglês (en-US)**.

- **Automático (padrão):** segue o idioma do navegador. Navegador em português → pt-BR; qualquer
  outro idioma → en-US.
- **Escolha manual**, em dois lugares:
  - **Painel (tecla H) → Comportamento e idioma → 🌐 Idioma / Language**;
  - **menu do ícone**, no seletor *🌐 Idioma* do rodapé (só na extensão).

As opções aparecem no próprio idioma ("Português (Brasil)", "English"), para facilitar a troca de
volta mesmo sem entender o idioma atual. A escolha vale para todos os sites e é aplicada na hora,
sem recarregar a página; na extensão, também nas abas já abertas. No Tampermonkey, as outras abas
passam a usar o novo idioma quando forem recarregadas.

O nome e a descrição da extensão no gerenciador de extensões seguem sempre o idioma do navegador
(pasta `_locales`), independentemente da escolha acima.

### Onde ficam as configurações

Atalhos, velocidade, volume, opacidades, sites ativados e demais preferências ficam no
armazenamento local do navegador (na extensão, `storage.local`; no Tampermonkey, o armazenamento
dele). Sobrevivem a reinícios e atualizações e são apagados ao desinstalar. No Firefox, os dados
ficam ligados ao ID da extensão (`vcc-video-command-center@ofeliper`), que por isso não deve mudar.

O painel tem a seção **Dados salvos e redefinições** para ver, copiar e apagar esses dados.

## Permissões e privacidade

| Permissão | Para quê |
|---|---|
| Acesso a todos os sites (`<all_urls>`) | Carregar a interface do VCC nas páginas para o atalho H e o painel funcionarem em qualquer site com vídeo. Os controles só atuam nos sites que você ativar. No Firefox, dá para restringir esse acesso a sites específicos em *Gerenciar extensão → Permissões*, e o menu do ícone pede o acesso ao site atual quando falta. |
| `storage` | Guardar as preferências no navegador. |
| `activeTab` | Deixar o menu do ícone ler o endereço da aba atual quando você clica nele, para mostrar o site e se o VCC tem acesso. |

O VCC não coleta, não envia e não compartilha dados, não tem anúncios nem rastreamento e não
carrega código remoto. Veja a [política de privacidade](PRIVACY.md).

## Estrutura do repositório

```text
src/
  core/
    vcc.js                    Código principal do VCC (usado pela extensão e pelo userscript)
    i18n.js                   Traduções pt-BR e en-US e detecção do idioma
  extension/
    gm-compat.js              Adapta o armazenamento da extensão às funções GM_* do Tampermonkey
    popup/                    Menu do ícone (popup.html, popup.js, popup.css)
    _locales/                 Nome e descrição da extensão por idioma (en, pt_BR)
  userscript/header.txt       Cabeçalho ==UserScript== (a versão é preenchida pelo build)
manifests/
  base.json                   Manifest comum aos dois navegadores
  chrome.json                 Diferenças do Chrome
  firefox.json                Diferenças do Firefox (ID, versão mínima, coleta de dados)
assets/icons/                 Ícones 16, 32, 48 e 128 px (PNG usados pela extensão)
  source/                     Desenhos originais em SVG: icon.svg (32 px ou mais) e
                              icon-16.svg (versão simplificada para 16 px)
store/
  firefox.md                  Textos da página na loja da Mozilla
  chrome.md                   Textos da página na Chrome Web Store
  screenshots/pt-BR/           Capturas de 1280×800 em português
  screenshots/en-US/           Capturas de 1280×800 em inglês
tools/
  build.js                    Gera dist/ (extensões e userscript)
  package.js                  Gera os zips das lojas em releases/
  check.js                    Checagens antes de publicar
dist/                         Gerado pelo build (fora do git, exceto o userscript)
  chrome/  firefox/
  userscript/vcc.user.js      i18n.js + vcc.js num arquivo só. Versionado no git: é daqui
                              que o Tampermonkey instala e atualiza
releases/                     Zips gerados (fora do git)
CHANGELOG.md  PRIVACY.md  package.json
```

**Por que um código só:** a extensão e o userscript usam o mesmo `src/core/vcc.js` (e as mesmas
traduções de `src/core/i18n.js`). A extensão
fornece as funções `GM_getValue`/`GM_setValue`/… por meio do `gm-compat.js`, então o código
principal não precisa saber onde está rodando. Uma correção vale para todas as versões.

**Como os manifests são montados:** o build mescla `manifests/base.json` com o arquivo do navegador
(objetos são mesclados; listas e valores simples do arquivo do navegador substituem os da base) e
grava a versão do `package.json`.

**Sem transformação de código:** o build só copia os arquivos e preenche a versão. Não há
minificação, bundler ou motor de templates. Por isso as lojas não exigem o envio do código-fonte
separado.

## Desenvolvimento

Requisito: [Node.js](https://nodejs.org/) 18 ou mais recente. Não há dependências para instalar.

```bash
npm run build          # gera dist/chrome, dist/firefox e dist/userscript/vcc.user.js
npm run check          # sintaxe, manifests, traduções e userscript em dia com o código
npm run package        # build + zips em releases/vcc-<navegador>-<versão>.zip
npm run lint:firefox   # verificador oficial da Mozilla (web-ext) sobre dist/firefox
npm run release        # tudo acima em sequência
```

Para testar mudanças, rode `npm run build` e recarregue a extensão (no Firefox, *Recarregar* em
`about:debugging`; no Chrome, o botão de recarregar em `chrome://extensions`) e a página do vídeo.

**Dicas para mexer no código**

- Todo HTML da interface é montado com a tag ``escapeHTML`...` ``, que escapa os valores
  interpolados, e inserido com `setSafeHTML()` / `appendSafeHTML()`. Não use `innerHTML` nem
  `insertAdjacentHTML`: o verificador da Mozilla aponta como alerta e sites como o YouTube bloqueiam
  (Trusted Types).
- **Nenhum texto visível fica direto no código.** Todo texto passa por `t('chave')`, com a chave
  definida em `src/core/i18n.js` **nos dois idiomas** (`{nome}` vira parâmetro:
  `t('ks.copyTo', { domain })`). Para textos com partes em negrito, use `tStrong()`. No menu do
  ícone, use o atributo `data-i18n="chave"` no HTML. O `npm run check` falha se um idioma tiver
  chaves que o outro não tem ou se o código usar uma chave inexistente.
- O idioma atual está em `lang` e a preferência em `langPref`; `applyLanguage()` reconstrói a barra e
  o painel quando ele muda.
- O menu do ícone conversa com a página por mensagens `VCC_GET_STATUS`, `VCC_OPEN_PANEL`,
  `VCC_TOGGLE_PANEL` e `VCC_SET_SITE_ACTIVE`, tratadas no fim de `src/core/vcc.js`.

## Publicar uma nova versão

1. Atualize a versão (só no `package.json`):
   ```bash
   npm version patch --no-git-tag-version   # 0.7.0 → 0.7.1 (use minor para 0.8.0)
   ```
2. Descreva as mudanças no [CHANGELOG.md](CHANGELOG.md).
3. Gere e verifique tudo:
   ```bash
   npm run release
   ```
   O resultado esperado é `0 errors, 0 warnings` no verificador da Mozilla.
4. Faça commit **incluindo `dist/userscript/vcc.user.js`** e push. O Tampermonkey atualiza a partir
   desse arquivo; o `npm run check` avisa se ele ficou desatualizado.
5. Envie os zips às lojas:
   - **Firefox:** em https://addons.mozilla.org/developers/, abra o VCC e envie
     `releases/vcc-firefox-<versão>.zip` como nova versão. Às perguntas sobre ferramentas de build,
     responda **não** (o código não é gerado nem minificado). Use o CHANGELOG nas notas da versão.
   - **Chrome:** no painel da Chrome Web Store, envie `releases/vcc-chrome-<versão>.zip`.

Os textos das páginas das lojas (descrições em português e inglês, tags, comentários do
desenvolvedor e legendas das capturas) e as capturas nos dois idiomas estão em [`store/`](store/).

## Suporte

Encontrou um problema ou tem uma sugestão? Abra uma
[issue](https://github.com/ofeliper/vcc-video-command-center/issues) informando o site, o navegador
e a versão do VCC. Para assuntos que não cabem numa issue: ofeliper.dev@gmail.com.
