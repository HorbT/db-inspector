/**
 * Script to bundle Python dependencies for the Electron app.
 * Installs Python packages to a local directory for inclusion in the build.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PYTHON_DIR = path.join(ROOT, 'python-backend');
const REQUIREMENTS = path.join(PYTHON_DIR, 'requirements.txt');

function getPythonCommand() {
  const commands = ['python', 'python3'];
  for (const cmd of commands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'pipe' });
      return cmd;
    } catch {}
  }
  return 'python';
}

function main() {
  console.log('[bundle-python] Installing Python dependencies...');

  const pythonCmd = getPythonCommand();
  console.log(`[bundle-python] Using Python: ${pythonCmd}`);

  if (!fs.existsSync(REQUIREMENTS)) {
    console.warn('[bundle-python] requirements.txt not found, skipping.');
    return;
  }

  try {
    // Install to the python-backend directory's local lib
    const targetDir = path.join(PYTHON_DIR, 'lib');
    execSync(
      `"${pythonCmd}" -m pip install -r "${REQUIREMENTS}" --target "${targetDir}" --upgrade`,
      { stdio: 'inherit', cwd: ROOT }
    );
    console.log('[bundle-python] Python dependencies installed successfully.');
  } catch (err) {
    console.error('[bundle-python] Failed to install Python dependencies:', err.message);
    console.log('[bundle-python] You may need to install them manually before running the app.');
  }
}

main();
