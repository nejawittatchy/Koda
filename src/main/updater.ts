import { autoUpdater } from 'electron-updater'
import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log'

// Configure logging
autoUpdater.logger = log
// @ts-ignore: electron-log types
autoUpdater.logger.transports.file.level = 'info'

export function initUpdater(mainWindow: BrowserWindow): void {
  // Listen for check-for-updates from renderer
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Listen for download-update from renderer
  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Listen for install-update from renderer
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  // Send update status to renderer
  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('updater-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('updater-status', { status: 'available', info })
  })

  autoUpdater.on('update-not-available', (info) => {
    mainWindow.webContents.send('updater-status', { status: 'not-available', info })
  })

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('updater-status', { status: 'error', error: err.message })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('updater-status', { status: 'downloading', progress: progressObj })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('updater-status', { status: 'downloaded', info })
  })
}
