/**
 * Script to check and report missing dependencies
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Root directory
const root = path.resolve(__dirname, '..', '..');

function checkDependencies() {
  console.log('Checking for missing dependencies...');

  // Run npm list to get the list of installed packages
  const result = spawnSync('npm', ['list', '--json', '--depth=0'], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    console.warn('Warning: npm list command returned an error');
  }

  const installedPackages = JSON.parse(result.stdout).dependencies || {};

  // Get the dependencies from package.json
  const packageJson = require(path.join(root, 'package.json'));
  const declaredDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const missingDependencies = [];
  const localDependencies = [];

  // Check for missing or local dependencies
  Object.entries(declaredDependencies).forEach(([name, version]) => {
    if (version.startsWith('file:')) {
      localDependencies.push({ name, path: version.substring(5) });
      return;
    }

    if (!installedPackages[name]) {
      missingDependencies.push({ name, version });
    }
  });

  // Report findings
  if (missingDependencies.length > 0) {
    console.log('\nMissing dependencies:');
    missingDependencies.forEach(dep => {
      console.log(`- ${dep.name}@${dep.version}`);
    });

    // Generate the install command
    const installCmd = `npm install --save ${missingDependencies.map(dep => `${dep.name}@${dep.version}`).join(' ')}`;
    console.log('\nRun the following command to install missing dependencies:');
    console.log(installCmd);
  } else {
    console.log('All declared dependencies are installed.');
  }

  if (localDependencies.length > 0) {
    console.log('\nLocal dependencies:');
    localDependencies.forEach(dep => {
      const localPath = path.resolve(root, dep.path);
      const exists = fs.existsSync(localPath);
      console.log(`- ${dep.name} -> ${dep.path} (${exists ? 'exists' : 'MISSING'})`);
    });
  }

  return missingDependencies.length === 0 &&
         localDependencies.every(dep => fs.existsSync(path.resolve(root, dep.path)));
}

if (require.main === module) {
  const result = checkDependencies();
  process.exit(result ? 0 : 1);
} else {
  module.exports = checkDependencies;
}