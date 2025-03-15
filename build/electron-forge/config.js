/**
 * Electron build configuration
 */

const path = require('path');
const fs = require('fs');
const config = require('../config');
const root = path.dirname(path.dirname(__dirname));

// Read package.json to get the main entry point
const packageJson = require(path.join(root, 'package.json'));

module.exports = {
  // Main application configuration
  main: {
    // The entry point should match the "main" field in package.json
    entryPoint: packageJson.main || './out/main.js',
    // Other electron-specific configurations
    electronVersion: config.electron.target,
    appId: 'com.pearai.app',
    buildVersion: packageJson.version,
    productName: packageJson.name || 'PearAI',
    asar: true,
    directories: {
      output: path.join(root, '.build/electron-dist'),
      app: root
    },
    // Files to include
    files: [
      "out/**/*",
      "!**/*.ts",
      "!**/tsconfig.json",
      "!**/tsconfig.*.json",
      "!**/.eslintrc.json"
    ]
  }
};