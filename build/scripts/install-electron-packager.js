/**
 * Script to install electron-packager if not already installed
 */

const { spawnSync } = require('child_process');
const path = require('path');

// Root directory
const root = path.resolve(__dirname, '..', '..');

try {
  // Try to find electron-packager
  console.log('Checking for electron-packager...');
  require.resolve('electron-packager');
  console.log('electron-packager is already installed.');
} catch (error) {
  console.log('electron-packager not found. Installing...');
  const result = spawnSync('npm', ['install', '--save-dev', '@electron/packager'], {
    stdio: 'inherit',
    cwd: root
  });

  if (result.status !== 0) {
    console.error('Failed to install @electron/packager');
    process.exit(1);
  }

  console.log('Successfully installed @electron/packager');
}

process.exit(0);