const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  // Get the correct path for the preload script
  const preloadPath = app.isPackaged
    ? path.join(process.resourcesPath, 'preload.js')
    : path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    }
  });

  // Load the index.html file
  const indexPath = path.join(__dirname, 'build', 'index.html');
  win.loadFile(indexPath);

  // Add IPC handlers
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    return result.filePaths[0];
  });

  ipcMain.handle('save-file', async (event, { filePath, data }) => {
    try {
      await fs.promises.writeFile(filePath, Buffer.from(data));
      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      return false;
    }
  });

  ipcMain.handle('create-directory', async (event, dirPath) => {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error('Error creating directory:', error);
      return false;
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 