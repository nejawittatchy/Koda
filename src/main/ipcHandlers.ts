import { ipcMain, BrowserWindow } from 'electron'
import StoreImport from 'electron-store'
import { logViaWebApp } from './sheets'
import { registerShortcuts } from './shortcut'
import { initWellness } from './wellness'
import { initQuotes, stopQuotes, fetchAndNotifyQuote } from './quotes'

// Fix for Store is not a constructor error in CJS/ESM interop
// Handle all possible import scenarios for electron-store
// @ts-ignore: electron-store type mismatch in some environments
const StoreConstructor = StoreImport.default || StoreImport
// @ts-ignore: electron-store constructor type varies between ESM and CJS
const store = new StoreConstructor()

export function setupIpcHandlers(mainWindow: BrowserWindow): void {
  // Handle getting settings
  ipcMain.handle('get-settings', () => {
    return {
      tabName: store.get('tabName', ''),
      shortcut: store.get('shortcut', 'Alt+Shift+L'),
      webAppUrl: store.get('webAppUrl', ''),
      wellnessEnabled: store.get('wellnessEnabled', true),
      wellnessInterval: store.get('wellnessInterval', 1),
      wellnessBreak: store.get('wellnessBreak', 20),
      quotesEnabled: store.get('quotesEnabled', false)
    }
  })

  // Handle saving settings
  ipcMain.handle('save-settings', (_, settings) => {
    store.set('tabName', settings.tabName)
    store.set('shortcut', settings.shortcut)
    store.set('webAppUrl', settings.webAppUrl)
    store.set('wellnessEnabled', settings.wellnessEnabled)
    store.set('wellnessInterval', settings.wellnessInterval)
    store.set('wellnessBreak', settings.wellnessBreak)
    store.set('quotesEnabled', settings.quotesEnabled)
    
    // Re-register shortcuts, wellness, and quotes with new settings
    registerShortcuts(mainWindow)
    initWellness(mainWindow)
    stopQuotes()
    initQuotes()
    
    return { success: true }
  })

  // Handle logging task
  ipcMain.handle('log-task', async (_, taskData) => {
    try {
      const webAppUrl = store.get('webAppUrl') as string
      if (!webAppUrl) throw new Error('Web App URL missing in settings.')
      
      const tabName = store.get('tabName', 'Sheet1') as string
      await logViaWebApp(webAppUrl, { ...taskData, tabName })
      return { success: true }
    } catch (error: any) {
      console.error('Failed to log task:', error)
      return { success: false, error: error.message }
    }
  })

  // Handle testing connection
  ipcMain.handle('test-quote', async () => {
    await fetchAndNotifyQuote()
    return { success: true }
  })

  // Handle testing connection
  ipcMain.handle('test-connection', async (_, settings: any) => {
    try {
      const taskData = {
        date: new Date().toLocaleDateString(),
        duration: '0 mins',
        customer: 'TEST',
        issue: 'Connection Test',
        status: 'SUCCESS',
        remark: 'Test entry from App Settings'
      }

      if (!settings.webAppUrl) throw new Error('Web App URL missing.')
      await logViaWebApp(settings.webAppUrl, { ...taskData, tabName: settings.tabName })
      return { success: true }
    } catch (error: any) {
      console.error('Connection test failed:', error)
      return { success: false, error: error.message }
    }
  })
}
