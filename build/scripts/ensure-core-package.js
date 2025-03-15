/**
 * Ensures that the core package exists for local development
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Root directory
const root = path.resolve(__dirname, '..', '..');
const packageJson = require(path.join(root, 'package.json'));

// Find all local dependencies
const localDeps = Object.entries(packageJson.dependencies || {})
  .concat(Object.entries(packageJson.devDependencies || {}))
  .filter(([_, version]) => version.startsWith('file:'))
  .map(([name, version]) => ({ name, path: version.substring(5) }));

// Ensure each local package exists
localDeps.forEach(dep => {
  const localPath = path.resolve(root, dep.path);

  if (!fs.existsSync(localPath)) {
    console.log(`Creating placeholder for local package: ${dep.name} at ${localPath}`);

    // Create directory
    fs.mkdirSync(localPath, { recursive: true });

    // Create basic package.json
    const packageContent = {
      name: dep.name,
      version: "0.0.1",
      description: "Placeholder package",
      main: "index.js",
      private: true
    };

    fs.writeFileSync(path.join(localPath, 'package.json'), JSON.stringify(packageContent, null, 2));

    // Create minimal index.js
    fs.writeFileSync(path.join(localPath, 'index.js'), `
// Placeholder module for ${dep.name}
console.warn('Using placeholder implementation of ${dep.name}');

module.exports = {
  isPlaceholder: true,
  // Add any functions/properties that your code expects
};
`);

    console.log(`Created placeholder package for ${dep.name}`);
  }
});

console.log('All local packages checked');