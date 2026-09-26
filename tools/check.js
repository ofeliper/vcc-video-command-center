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
      : file.startsWith('js/') ? `src/extension/${path.basename(file)}`
      : file.startsWith('popup/') ? `src/extension/${file}`
      : `assets/${file}`;
    if (!fs.existsSync(path.join(root, src))) fail(`manifest ${target}: ${file} não existe (${src})`);
  }
}
ok(`manifests chrome e firefox (v${version})`);

const published = path.join(root, 'dist', 'userscript', 'vcc.user.js');
if (!fs.existsSync(published) || fs.readFileSync(published, 'utf8') !== userscriptSource()) {
  fail('dist/userscript/vcc.user.js está desatualizado — rode "npm run build" e faça commit dele');
} else {
  ok('dist/userscript/vcc.user.js em dia com o código');
}

process.exit(failed ? 1 : 0);
