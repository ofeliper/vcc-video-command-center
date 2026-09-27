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
  'src/core/vcc.js',
  'src/extension/gm-compat.js',
  'src/extension/popup/popup.js',
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
  for (const file of [...m.content_scripts.flatMap(c => c.js), m.action.default_popup, ...Object.values(m.icons)]) {
    const src = file.startsWith('js/vcc') ? 'src/core/vcc.js'
      : file.startsWith('js/i18n') ? 'src/core/i18n.js'
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
for (const file of ['src/core/vcc.js', 'src/extension/popup/popup.js', 'src/extension/popup/popup.html']) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const m of text.matchAll(keyPattern)) used.add(m[1]);
}
// Chaves montadas dinamicamente: 'key.<ação>' e 'mode.<modo>'.
for (const id of ['slowDown', 'speedUp', 'resetSpeed', 'toggle2x', 'seekBack', 'seekFwd', 'volumeDown', 'volumeUp', 'toggleMute', 'toggleCB', 'toggleCP']) used.add('key.' + id);
for (const mode of ['visible', 'alerts', 'hidden']) used.add('mode.' + mode);
const unknown = [...used].filter(k => !baseKeys.includes(k));
if (unknown.length) fail(`i18n: chaves usadas mas não definidas: ${unknown.join(', ')}`);
else ok(`traduções ${SUPPORTED.join(' e ')} com ${baseKeys.length} textos cada`);

// Nome e descrição da extensão (_locales)
for (const dir of fs.readdirSync(path.join(root, 'src/extension/_locales'))) {
  const msgs = JSON.parse(fs.readFileSync(path.join(root, 'src/extension/_locales', dir, 'messages.json'), 'utf8'));
  for (const key of ['extName', 'extDescription', 'actionTitle']) if (!msgs[key]?.message) fail(`_locales/${dir}: falta ${key}`);
  if ((msgs.extDescription?.message || '').length > 132) fail(`_locales/${dir}: extDescription passa de 132 caracteres`);
}

const published = path.join(root, 'dist', 'userscript', 'vcc.user.js');
if (!fs.existsSync(published) || fs.readFileSync(published, 'utf8') !== userscriptSource()) {
  fail('dist/userscript/vcc.user.js está desatualizado — rode "npm run build" e faça commit dele');
} else {
  ok('dist/userscript/vcc.user.js em dia com o código');
}

process.exit(failed ? 1 : 0);
