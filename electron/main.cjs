const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Determine if we're in development or production
const isDev = !app.isPackaged;

// Get the user data path for storing firm data
const userDataPath = app.getPath('userData');
const firmsDir = path.join(userDataPath, 'firms');
const configPath = path.join(userDataPath, 'config.json');

// Ensure firms directory exists
function ensureFirmsDir() {
  if (!fs.existsSync(firmsDir)) {
    fs.mkdirSync(firmsDir, { recursive: true });
  }
}

// Load app config
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return { lastFirmId: null };
}

// Save app config
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

// Get all saved firms
function getAllFirms() {
  ensureFirmsDir();
  try {
    const files = fs.readdirSync(firmsDir).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const filePath = path.join(firmsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        id: data.id,
        name: data.firmSettings?.firmName || 'Unnamed Firm',
        lastModified: fs.statSync(filePath).mtime.toISOString(),
      };
    }).sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  } catch (e) {
    console.error('Failed to get firms:', e);
    return [];
  }
}

// Load a specific firm
function loadFirm(firmId) {
  ensureFirmsDir();
  const filePath = path.join(firmsDir, `${firmId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load firm:', e);
  }
  return null;
}

// Save a firm
function saveFirm(firmData) {
  ensureFirmsDir();
  const filePath = path.join(firmsDir, `${firmData.id}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(firmData, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save firm:', e);
    return false;
  }
}

// Delete a firm
function deleteFirm(firmId) {
  const filePath = path.join(firmsDir, `${firmId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (e) {
    console.error('Failed to delete firm:', e);
  }
  return false;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'Schedule Buddy',
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC handlers for firm operations
ipcMain.handle('firms:getAll', () => getAllFirms());
ipcMain.handle('firms:load', (_, firmId) => loadFirm(firmId));
ipcMain.handle('firms:save', (_, firmData) => saveFirm(firmData));
ipcMain.handle('firms:delete', (_, firmId) => deleteFirm(firmId));
ipcMain.handle('config:get', () => loadConfig());
ipcMain.handle('config:set', (_, config) => {
  saveConfig(config);
  return true;
});
ipcMain.handle('app:isElectron', () => true);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
