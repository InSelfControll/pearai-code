/**
 * Prepares the Electron app for packaging by creating necessary files
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

// Create the out directory if it doesn't exist
if (!fs.existsSync(mainDir)) {
  fs.mkdirSync(mainDir, { recursive: true });
  console.log(`Created directory: ${mainDir}`);
}

// Create a CommonJS-compatible main file
const mainContent = `
// This is a CommonJS Electron main entry point
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the HTML file
  const htmlPath = path.join(__dirname, 'main.html');
  mainWindow.loadFile(htmlPath);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});

// Log the environment for debugging
console.log('Electron app started');
console.log('App path:', app.getAppPath());
console.log('Working directory:', process.cwd());
`;

// Create a simple HTML file to load
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PearAI</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 40px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PearAI Application</h1>
    <p>Electron build initialized successfully.</p>
    <p>This is a placeholder page. Your actual application UI would load here.</p>
  </div>
</body>
</html>
`;

// Write the main.js file
fs.writeFileSync(fullMainPath, mainContent);
console.log(`Created main entry point at ${fullMainPath}`);

// Write the main.html file in the same directory
const htmlPath = path.join(mainDir, 'main.html');
fs.writeFileSync(htmlPath, htmlContent);
console.log(`Created HTML file at ${htmlPath}`);

console.log('Electron app preparation complete');