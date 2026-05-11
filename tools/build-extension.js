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

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else copyFile(srcPath, destPath);
  }
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
    path.join(root, 'extension', 'src', 'service-worker.js'),
    path.join(outDir, 'src', 'service-worker.js')
  );
  copyFile(
    path.join(root, 'userscript', 'tampermonkey-vcc.user.js'),
    path.join(outDir, 'src', 'tampermonkey-vcc.user.js')
  );
  copyDir(
    path.join(root, 'extension', 'assets'),
    path.join(outDir, 'assets')
  );

  console.log(`Built dist/${target}`);
}
