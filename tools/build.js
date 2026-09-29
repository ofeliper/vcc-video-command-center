// Gera todas as versões do VCC a partir do mesmo código-fonte:
//
//   dist/chrome/                  extensão para Chrome/Edge (Manifest V3)
//   dist/firefox/                 extensão para Firefox (Manifest V3)
//   dist/userscript/vcc.user.js   script para Tampermonkey (i18n.js + shared.js + vcc.js)
//
// A versão vem só do package.json e é gravada nos manifests e no
// cabeçalho do userscript. Nenhum arquivo é transformado além disso:
// o código é copiado como está (sem minificação ou bundling).

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const r = (...p) => path.join(root, ...p);
const { version } = require(r('package.json'));

const TARGETS = ['chrome', 'firefox'];

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Mescla objetos recursivamente; listas e valores simples do override substituem os da base.
function merge(base, override) {
  if (Array.isArray(base) || Array.isArray(override) || typeof base !== 'object' || typeof override !== 'object' || !base || !override) {
    return override === undefined ? base : override;
  }
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) out[k] = k in base ? merge(base[k], v) : v;
  return out;
}

function buildManifest(target) {
  const { manifest_version, name, ...rest } = merge(readJSON(r('manifests', 'base.json')), readJSON(r('manifests', `${target}.json`)));
  delete rest.version;
  return { manifest_version, name, version, ...rest };
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

function buildExtension(target) {
  const out = r('dist', target);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(buildManifest(target), null, 2) + '\n');
  copyFile(r('src', 'extension', 'gm-compat.js'), path.join(out, 'js', 'gm-compat.js'));
  copyFile(r('src', 'core', 'i18n.js'), path.join(out, 'js', 'i18n.js'));
  copyFile(r('src', 'core', 'shared.js'), path.join(out, 'js', 'shared.js'));
  copyFile(r('src', 'core', 'vcc.js'), path.join(out, 'js', 'vcc.js'));
  copyFile(r('src', 'extension', 'background.js'), path.join(out, 'js', 'background.js'));
  copyDir(r('src', 'extension', 'popup'), path.join(out, 'popup'));
  copyDir(r('src', 'extension', 'options'), path.join(out, 'options'));
  copyDir(r('src', 'extension', '_locales'), path.join(out, '_locales'));
  copyDir(r('assets', 'icons'), path.join(out, 'icons'));
  console.log(`Built dist/${target} (v${version})`);
}

// Userscript = cabeçalho + traduções + definições compartilhadas + código principal, em um arquivo só.
function userscriptSource() {
  const header = fs.readFileSync(r('src', 'userscript', 'header.txt'), 'utf8').replace('{{version}}', version);
  return [
    header,
    fs.readFileSync(r('src', 'core', 'i18n.js'), 'utf8'),
    fs.readFileSync(r('src', 'core', 'shared.js'), 'utf8'),
    fs.readFileSync(r('src', 'core', 'vcc.js'), 'utf8'),
  ].join('\n');
}

function buildUserscript() {
  const out = r('dist', 'userscript', 'vcc.user.js');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, userscriptSource());
  console.log(`Built dist/userscript/vcc.user.js (v${version})`);
}

module.exports = { version, TARGETS, buildManifest, userscriptSource };

if (require.main === module) {
  TARGETS.forEach(buildExtension);
  buildUserscript();
}
