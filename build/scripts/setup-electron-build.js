/**
 * Comprehensive setup script for electron builds
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Root directory
const root = path.resolve(__dirname, '..', '..');

console.log('🔄 Setting up electron build environment...');

// Step 1: Run the dependency check
console.log('\n📦 Checking for missing dependencies...');
require('./check-dependencies');

// Step 2: Ensure local dependencies exist
console.log('\n🔧 Ensuring local dependencies exist...');
require('./ensure-core-package');

// Step 3: Install electron-packager if not installed
console.log('\n🔌 Checking for electron-packager...');
try {
  require('electron-packager');
  console.log('✅ electron-packager is installed');
} catch (error) {
  console.log('❌ electron-packager not found. Installing...');
  spawnSync('npm', ['install', '--save-dev', 'electron-packager'], {
    stdio: 'inherit',
    cwd: root
  });
}

// Step 4: Run a simple npm install to ensure all deps are installed
console.log('\n🔄 Running npm install to ensure dependencies are up to date...');
spawnSync('npm', ['install'], {
  stdio: 'inherit',
  cwd: root
});

console.log('\n✅ Setup complete! You can now run the electron build.');