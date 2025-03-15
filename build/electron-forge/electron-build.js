/**
 * Combined script to ensure main file exists and package the Electron app
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Root directory
const root = path.dirname(path.dirname(__dirname));

// Try to load electron-packager (should be installed by the npm script that runs before this)
let packager;
try {
  // Try the new package name first
  packager = require('@electron/packager');
} catch (error) {
  try {
    // Fall back to the old package name
    packager = require('electron-packager');
  } catch (error) {
    console.error('ERROR: Cannot find electron-packager or @electron/packager.');
    console.error('Please run: npm install --save-dev @electron/packager');
    process.exit(1);
  }
}

const config = require('./config');
const buildConfig = require('../config');

// Check dependencies first
console.log('Checking dependencies...');
try {
  const checkDepsResult = spawnSync('node', [path.join(root, 'build', 'scripts', 'check-dependencies.js')], {
    stdio: 'inherit'
  });

  if (checkDepsResult.status !== 0) {
    console.error('Please install missing dependencies before building');
    process.exit(1);
  }
} catch (error) {
  console.warn('Dependency check failed but continuing anyway:', error.message);
}

// Run the prepare-electron script next
console.log('Preparing Electron app files...');
const result = spawnSync('node', [path.join(__dirname, 'prepare-electron.js')], {
  stdio: 'inherit'
});

if (result.status !== 0) {
  console.error('Failed to prepare Electron app files');
  process.exit(1);
}

// Get the main entry point from package.json
const packageJson = require(path.join(root, 'package.json'));
const mainPath = packageJson.main.startsWith('./') ?
  packageJson.main.substring(2) :
  packageJson.main;

const fullMainPath = path.join(root, mainPath);

// Double-check that the main file exists
if (!fs.existsSync(fullMainPath)) {
  console.error(`ERROR: Main entry point still not found at ${fullMainPath} after preparation!`);
  process.exit(1);
}

console.log(`Verified main entry point exists at: ${fullMainPath}`);
console.log('Main file contents:');
console.log('-------------------');
console.log(fs.readFileSync(fullMainPath, 'utf8').substring(0, 300) + '...');
console.log('-------------------');

// Now proceed with packaging
async function packageApp() {
  console.log('Packaging Electron application...');

  // Create a temporary package.json without "type": "module" for electron-packager
  const tempPackageJsonPath = path.join(root, '.temp-package.json');
  const tempPackageJson = { ...packageJson };
  delete tempPackageJson.type; // Remove the ESM module type

  fs.writeFileSync(tempPackageJsonPath, JSON.stringify(tempPackageJson, null, 2));
  console.log('Created temporary package.json without ESM module type');

  try {
    const options = {
      dir: root,
      out: config.main.directories.output,
      name: config.main.productName,
      platform: process.platform,
      arch: process.arch,
      electronVersion: buildConfig.electron.target,
      asar: false, // Disable asar for debugging
      icon: path.join(root, 'resources', process.platform === 'win32' ? 'win32/code.ico' : 'linux/code.png'),
      ignore: [
        /node_modules\/(?!\.vscode-)/,
        /\.git/,
        /\.temp-package\.json/
      ],
      overwrite: true,
      appVersion: buildConfig.electron.target,
      appBundleId: config.main.appId,
      prune: false,
      // Use the temporary package.json we created
      packageJson: tempPackageJsonPath
    };

    console.log('Packaging with options:', JSON.stringify(options, null, 2));
    const appPaths = await packager(options);
    console.log('Electron app successfully packaged at:', appPaths.join(', '));
  } catch (error) {
    console.error('Error packaging Electron app:', error);
    process.exit(1);
  } finally {
    // Clean up the temporary package.json
    if (fs.existsSync(tempPackageJsonPath)) {
      fs.unlinkSync(tempPackageJsonPath);
      console.log('Removed temporary package.json');
    }
  }
}

// Run the packaging
packageApp();