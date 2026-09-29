// Checagens rápidas antes de publicar:
//  1. sintaxe de todos os arquivos JavaScript;
//  2. manifests válidos e com a versão do package.json;
//  3. dist/userscript/vcc.user.js (publicado no git para o Tampermonkey)
//     igual ao que o build gera hoje — evita esquecer de rodar o build.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { version, TARGETS, buildManifest, userscriptSource } = require('./build');

const root = path.resolve(__dirname, '..');
let failed = false;
const fail = msg => { console.error(`✗ ${msg}`); failed = true; };
const ok = msg => console.log(`✓ ${msg}`);

const jsFiles = [
  'src/core/i18n.js',
  'src/core/shared.js',
  'src/core/vcc.js',
  'src/extension/gm-compat.js',
  'src/extension/background.js',
  'src/extension/popup/popup.js',
  'src/extension/options/options.js',
  'tools/build.js',
  'tools/package.js',
  'tools/check.js',
];
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  } catch (e) {
    fail(`${file}: ${String(e.stderr || e.message).trim()}`);
  }
}
if (!failed) ok(`sintaxe de ${jsFiles.length} arquivos JavaScript`);

for (const target of TARGETS) {
  const m = buildManifest(target);
  if (m.version !== version) fail(`manifest ${target}: versão ${m.version} ≠ ${version}`);
  const background = m.background?.service_worker ? [m.background.service_worker] : (m.background?.scripts || []);
  for (const file of [...m.content_scripts.flatMap(c => c.js), ...background, m.action.default_popup, m.options_ui?.page, ...Object.values(m.icons)].filter(Boolean)) {
    const src = file.startsWith('js/vcc') ? 'src/core/vcc.js'
      : file.startsWith('js/i18n') ? 'src/core/i18n.js'
      : file.startsWith('js/shared') ? 'src/core/shared.js'
      : file.startsWith('options/') ? `src/extension/${file}`
      : file.startsWith('js/') ? `src/extension/${path.basename(file)}`
      : file.startsWith('popup/') ? `src/extension/${file}`
      : `assets/${file}`;
    if (!fs.existsSync(path.join(root, src))) fail(`manifest ${target}: ${file} não existe (${src})`);
  }
}
ok(`manifests chrome e firefox (v${version})`);

// Traduções: as mesmas chaves nos dois idiomas, e todas as chaves usadas existem.
require(path.join(root, 'src', 'core', 'i18n.js'));
const { MESSAGES, SUPPORTED } = globalThis.VCC_I18N;
const [base, ...others] = SUPPORTED;
const baseKeys = Object.keys(MESSAGES[base]);
for (const code of others) {
  const keys = Object.keys(MESSAGES[code]);
  const missing = baseKeys.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !baseKeys.includes(k));
  if (missing.length) fail(`i18n ${code}: faltam ${missing.join(', ')}`);
  if (extra.length) fail(`i18n ${code}: sobram ${extra.join(', ')}`);
}
// Toda string com cara de chave ('sec.audio', "pop.reload"…) usada no código precisa existir.
const prefixes = [...new Set(baseKeys.map(k => k.split('.')[0]))].join('|');
const keyPattern = new RegExp(`['"\`]((?:${prefixes})\\.[\\w.]*\\w)['"\`]`, 'g');
const used = new Set();
for (const file of ['src/core/vcc.js', 'src/extension/popup/popup.js', 'src/extension/popup/popup.html', 'src/extension/options/options.js', 'src/extension/options/options.html']) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const m of text.matchAll(keyPattern)) used.add(m[1]);
}
// Chaves montadas dinamicamente: 'key.<ação>' e 'mode.<modo>'.
for (const id of ['slowDown', 'speedUp', 'resetSpeed', 'toggle2x', 'seekBack', 'seekFwd', 'volumeDown', 'volumeUp', 'toggleMute', 'toggleCB', 'toggleCP']) used.add('key.' + id);
for (const mode of ['visible', 'alerts', 'hidden']) used.add('mode.' + mode);
for (const theme of ['light', 'dark']) used.add('theme.' + theme);
for (const a of ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']) used.add('anchor.' + a);
const unknown = [...used].filter(k => !baseKeys.includes(k));
if (unknown.length) fail(`i18n: chaves usadas mas não definidas: ${unknown.join(', ')}`);
else ok(`traduções ${SUPPORTED.join(' e ')} com ${baseKeys.length} textos cada`);

// Nome e descrição da extensão (_locales)
for (const dir of fs.readdirSync(path.join(root, 'src/extension/_locales'))) {
  const msgs = JSON.parse(fs.readFileSync(path.join(root, 'src/extension/_locales', dir, 'messages.json'), 'utf8'));
  for (const key of ['extName', 'extDescription', 'actionTitle']) if (!msgs[key]?.message) fail(`_locales/${dir}: falta ${key}`);
  if ((msgs.extDescription?.message || '').length > 132) fail(`_locales/${dir}: extDescription passa de 132 caracteres`);
}

// Temas: texto ≥ 4,5:1 e elementos de interface ≥ 3:1 (WCAG AA), nos dois temas.
require(path.join(root, 'src', 'core', 'shared.js'));
{
  const { THEMES } = globalThis.VCC_SHARED;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = c.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  let worst = 99;
  for (const [name, p] of Object.entries(THEMES)) {
    const pairs = [];
    for (const fg of ['text', 'text-2', 'text-3', 'accent']) for (const bg of ['bg', 'bg-header', 'surface', 'surface-hover', 'accent-soft']) pairs.push([fg, bg, 4.5]);
    for (const fg of ['danger', 'warn']) for (const bg of ['bg', 'bg-header', 'surface']) pairs.push([fg, bg, 4.5]);
    pairs.push(['danger', 'danger-soft', 4.5], ['warn', 'warn-soft', 4.5], ['on-accent', 'accent-fill', 4.5],
      ['knob', 'accent-fill', 3], ['knob', 'toggle-off', 3], ['scroll-thumb', 'scroll-track', 3], ['border-strong', 'bg', 3]);
    for (const [fg, bg, min] of pairs) {
      const r = ratio(p[fg], p[bg]);
      if (min === 4.5) worst = Math.min(worst, r);
      if (r < min) fail(`tema ${name}: ${fg} sobre ${bg} = ${r.toFixed(2)}:1 (mínimo ${min}:1)`);
    }
  }
  if (!failed) ok(`contraste dos temas claro e escuro (texto ≥ ${worst.toFixed(2)}:1)`);
}

const published = path.join(root, 'dist', 'userscript', 'vcc.user.js');
if (!fs.existsSync(published) || fs.readFileSync(published, 'utf8') !== userscriptSource()) {
  fail('dist/userscript/vcc.user.js está desatualizado — rode "npm run build" e faça commit dele');
} else {
  ok('dist/userscript/vcc.user.js em dia com o código');
}

process.exit(failed ? 1 : 0);
