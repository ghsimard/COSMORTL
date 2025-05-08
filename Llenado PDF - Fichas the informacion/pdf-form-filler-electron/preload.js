const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  invoke: async (channel, data) => {
    const validChannels = ['select-directory', 'save-file', 'create-directory'];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    }
    throw new Error(`Invalid channel: ${channel}`);
  }
}); 