/**
 * Electron build script
 */

const packager = require('electron-packager');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const buildConfig = require('../config');

// Root directory
const root = path.dirname(path.dirname(__dirname));

async function packageApp() {
  console.log('Packaging Electron application...');

  // First, verify that the main entry point exists
  const packageJson = require(path.join(root, 'package.json'));
  const mainPath = packageJson.main.startsWith('./') ?
    packageJson.main.substring(2) :
    packageJson.main;

  const fullMainPath = path.join(root, mainPath);

  console.log(`Looking for main entry point at: ${fullMainPath}`);

  if (!fs.existsSync(fullMainPath)) {
    console.error(`ERROR: Main entry point not found at ${fullMainPath}`);
    console.log('Make sure to compile the application before packaging.');
    process.exit(1);
  }

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
      asar: config.main.asar,
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
      // Point explicitly to the main file
      executableName: packageJson.name,
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