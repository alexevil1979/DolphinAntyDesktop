import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { IpcHandlerRegistry } from './ipc-handlers';
import { AppDatabase } from './database/database';
import { ApiServer } from './api/api-server';

let mainWindow: BrowserWindow | null = null;
let ipcRegistry: IpcHandlerRegistry | null = null;
let apiServer: ApiServer | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'DolphinAnty Desktop',
    icon: path.join(__dirname, '../../assets/icon.png'),
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0e1a',
      symbolColor: '#8892b0',
      height: 36,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initialize(): Promise<void> {
  const database = new AppDatabase();
  ipcRegistry = await IpcHandlerRegistry.create(database);
  ipcRegistry.register();

  const settings = database.loadSettings();
  if (settings.apiEnabled) {
    const managers = ipcRegistry.getManagers();
    apiServer = new ApiServer(
      managers.profileManager,
      managers.proxyManager,
      managers.launcher,
      managers.scenarioEngine,
      managers.bulkActions
    );
    try {
      await apiServer.start(settings.apiPort);
    } catch (err) {
      console.error('Failed to start API server:', err);
    }
  }
}

async function cleanup(): Promise<void> {
  if (apiServer) {
    await apiServer.stop().catch(() => {});
  }
  if (ipcRegistry) {
    await ipcRegistry.shutdown().catch(() => {});
  }
}

app.whenReady().then(async () => {
  await initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
