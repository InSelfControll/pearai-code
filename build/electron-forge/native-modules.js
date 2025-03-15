/**
 * This script handles native module rebuilding for Electron
 */
const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function rebuildNativeModules() {
  console.log('Rebuilding native modules for Electron...');

  // Read config from environment or use defaults
  const electronVersion = process.env.npm_config_target || '22.3.25';
  const arch = process.env.npm_config_arch || process.arch;
  const platform = process.env.npm_config_platform || process.platform;

  // Set parameters for electron-rebuild
  const args = [
    'electron-rebuild',
    '--version', electronVersion,
    '--arch', arch,
    '--platform', platform,
    '--module-dir', path.join(__dirname, '../../node_modules')
  ];

  // Set timeout from config or default
  const timeout = parseInt(process.env.npm_config_timeout || '600000', 10);

  try {
    // Execute electron-rebuild
    childProcess.execFileSync(
      'npx',
      args,
      {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit',
        timeout
      }
    );
    console.log('Native modules rebuilt successfully');
  } catch (error) {
    console.error('Failed to rebuild native modules:', error);
    process.exit(1);
  }
}

module.exports = { rebuildNativeModules };