/**
 * Build configuration settings formerly defined in .npmrc
 */

const fs = require('fs');
const path = require('path');

// Read from .npmrc for backward compatibility
function readFromNpmrc(rcPath) {
  const config = {};
  if (fs.existsSync(rcPath)) {
    const content = fs.readFileSync(rcPath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;

      // Parse values with quotes like: disturl="https://nodejs.org/dist"
      const match = line.match(/^([^=]+)=(?:"([^"]*)"|(.*))$/);
      if (match) {
        const key = match[1].trim();
        const value = (match[2] || match[3] || '').trim();
        config[key] = value;
      }
    }
  }
  return config;
}

// Root directory
const root = path.dirname(path.dirname(__dirname));

// Read configurations from various .npmrc files
const mainConfig = readFromNpmrc(path.join(root, '.npmrc'));
const remoteConfig = readFromNpmrc(path.join(root, 'remote', '.npmrc'));
const buildConfig = readFromNpmrc(path.join(root, 'build', '.npmrc'));

module.exports = {
  // Main electron configuration
  electron: {
    disturl: mainConfig.disturl || 'https://electronjs.org/headers',
    target: mainConfig.target || '22.3.25',
    build_from_source: mainConfig.build_from_source === 'true',
    runtime: mainConfig.runtime || 'electron',
    timeout: parseInt(mainConfig.timeout || '600000', 10),
    ms_build_id: mainConfig.ms_build_id || ''
  },

  // Remote/Node.js configuration
  remote: {
    disturl: remoteConfig.disturl || 'https://nodejs.org/dist',
    target: remoteConfig.target || '20.18.1',
    ms_build_id: remoteConfig.ms_build_id || '307485',
    runtime: remoteConfig.runtime || 'node',
    build_from_source: remoteConfig.build_from_source === 'true',
    legacy_peer_deps: remoteConfig.legacy_peer_deps === 'true',
    timeout: parseInt(remoteConfig.timeout || '180000', 10)
  },

  // Build configuration
  build: {
    disturl: buildConfig.disturl || 'https://nodejs.org/dist',
    runtime: buildConfig.runtime || 'node',
    build_from_source: buildConfig.build_from_source === 'true',
    legacy_peer_deps: buildConfig.legacy_peer_deps === 'true',
    timeout: parseInt(buildConfig.timeout || '180000', 10)
  }
};