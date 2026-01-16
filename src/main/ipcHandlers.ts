import { ipcMain, BrowserWindow } from 'electron'
import Store from 'electron-store'
import { appendTaskToSheet, logViaWebApp } from './sheets'
import { registerShortcuts } from './shortcut'
import { initWellness } from './wellness'
import { initQuotes, stopQuotes, fetchAndNotifyQuote } from './quotes'
import fs from 'fs'

// Fix for Store is not a constructor error in CJS/ESM interop
// @ts-ignore: electron-store type mismatch in some environments
const store = new (Store.default || Store)()

export function setupIpcHandlers(mainWindow: BrowserWindow): void {
  // Handle getting settings
  ipcMain.handle('get-settings', () => {
    return {
      sheetId: store.get('sheetId', ''),
      tabName: store.get('tabName', 'Sheet1'),
      shortcut: store.get('shortcut', 'Alt+Shift+L'),
      keyFilePath: store.get('keyFilePath', ''),
      webAppUrl: store.get('webAppUrl', ''),
      connectionType: store.get('connectionType', 'service'),
      wellnessEnabled: store.get('wellnessEnabled', true),
      wellnessInterval: store.get('wellnessInterval', 1),
      wellnessBreak: store.get('wellnessBreak', 20)
    }
  })

  // Handle saving settings
  ipcMain.handle('save-settings', (_, settings) => {
    store.set('sheetId', settings.sheetId)
    store.set('tabName', settings.tabName)
    store.set('shortcut', settings.shortcut)
    store.set('keyFilePath', settings.keyFilePath)
    store.set('webAppUrl', settings.webAppUrl)
    store.set('connectionType', settings.connectionType)
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
      const connectionType = store.get('connectionType', 'service')
      if (connectionType === 'webapp') {
        const webAppUrl = store.get('webAppUrl') as string
        if (!webAppUrl) throw new Error('Web App URL missing in settings.')
        
        const tabName = store.get('tabName', 'Sheet1') as string
        await logViaWebApp(webAppUrl, { ...taskData, tabName })
      } else {
        const sheetId = store.get('sheetId') as string
        const tabName = store.get('tabName') as string
        const keyFilePath = store.get('keyFilePath') as string
        
        if (!sheetId || !keyFilePath) {
          throw new Error('Spreadsheet ID or Key File path missing in settings.')
        }

        const keyFile = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'))

        await appendTaskToSheet(sheetId, keyFile, tabName, taskData)
      }
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

      if (settings.connectionType === 'webapp') {
        if (!settings.webAppUrl) throw new Error('Web App URL missing.')
        await logViaWebApp(settings.webAppUrl, { ...taskData, tabName: settings.tabName })
      } else {
        if (!settings.sheetId || !settings.keyFilePath) {
          throw new Error('Spreadsheet ID or Key File path missing.')
        }
        const keyFile = JSON.parse(fs.readFileSync(settings.keyFilePath, 'utf8'))
        await appendTaskToSheet(settings.sheetId, keyFile, settings.tabName, taskData)
      }
      return { success: true }
    } catch (error: any) {
      console.error('Connection test failed:', error)
      return { success: false, error: error.message }
    }
  })
}
