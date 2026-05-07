/**
 * Script to copy resource files during build.
 * Copies plugins/ and resources/ to the dist directory for packaging.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Source not found: ${src}`);
    return;
  }
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  console.log('[copy-resources] Copying resource files...');

  // Copy plugins to dist
  const pluginsSrc = path.join(ROOT, 'plugins');
  const pluginsDest = path.join(DIST, 'plugins');
  copyDir(pluginsSrc, pluginsDest);
  console.log('[copy-resources] Plugins copied.');

  // Copy resources to dist
  const resourcesSrc = path.join(ROOT, 'resources');
  const resourcesDest = path.join(DIST, 'resources');
  copyDir(resourcesSrc, resourcesDest);
  console.log('[copy-resources] Resources copied.');

  // Copy python-backend to dist
  const pythonSrc = path.join(ROOT, 'python-backend');
  const pythonDest = path.join(DIST, 'python-backend');
  copyDir(pythonSrc, pythonDest);
  console.log('[copy-resources] Python backend copied.');

  console.log('[copy-resources] Done.');
}

main();
