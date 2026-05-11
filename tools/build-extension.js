const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = ['chrome', 'firefox'];

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

for (const target of targets) {
  const outDir = path.join(root, 'dist', target);
  rmrf(outDir);

  copyFile(
    path.join(root, 'extension', 'manifests', `${target}.json`),
    path.join(outDir, 'manifest.json')
  );
  copyFile(
    path.join(root, 'extension', 'src', 'gm-compat.js'),
    path.join(outDir, 'src', 'gm-compat.js')
  );
  copyFile(
    path.join(root, 'userscript', 'tampermonkey-vcc.user.js'),
    path.join(outDir, 'src', 'tampermonkey-vcc.user.js')
  );

  console.log(`Built dist/${target}`);
}
