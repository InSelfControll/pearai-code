/**
 * Ensures that the main entry point for Electron exists
 */

const fs = require('fs');
const path = require('path');

// Root directory
const root = path.dirname(path.dirname(__dirname));

// Get the main entry point from package.json
const packageJson = require(path.join(root, 'package.json'));
const mainPath = packageJson.main.startsWith('./') ?
  packageJson.main.substring(2) :
  packageJson.main;

const fullMainPath = path.join(root, mainPath);
const mainDir = path.dirname(fullMainPath);

// Create a basic main file if it doesn't exist
if (!fs.existsSync(fullMainPath)) {
  console.log(`Main entry point not found at ${fullMainPath}. Creating it...`);

  // Make sure the directory exists
  if (!fs.existsSync(mainDir)) {
    fs.mkdirSync(mainDir, { recursive: true });
    console.log(`Created directory: ${mainDir}`);
  }

  // Basic electron main script
  const mainContent = `
// This is a generated entry point for Electron
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the main HTML file or any other starting point
  mainWindow.loadFile(path.join(__dirname, '../resources/app/out/main.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
`;

  fs.writeFileSync(fullMainPath, mainContent);
  console.log(`Created main entry point at ${fullMainPath}`);
}

console.log('Main entry point is ready for packaging');