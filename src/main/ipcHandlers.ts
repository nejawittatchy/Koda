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
      callTabName: store.get('callTabName', ''),
      callShortcut: store.get('callShortcut', 'Alt+Shift+K'),
      callWebAppUrl: store.get('callWebAppUrl', ''),
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
    store.set('callTabName', settings.callTabName)
    store.set('callShortcut', settings.callShortcut)
    store.set('callWebAppUrl', settings.callWebAppUrl)
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
    } catch (error: unknown) {
      console.error('Failed to log task:', error)
      return { success: false, error: (error instanceof Error ? error.message : String(error)) }
    }
  })

  // Handle logging call
  ipcMain.handle('log-call', async (_, callData) => {
    try {
      const callWebAppUrl = store.get('callWebAppUrl') as string
      if (!callWebAppUrl) throw new Error('Call Web App URL missing in settings.')
      
      const tabName = store.get('callTabName', 'Sheet1') as string

      // S/N Logic
      const today = new Date().toDateString()
      const lastCallDate = store.get('lastCallDate', '') as string
      
      let cumulativeSN = store.get('cumulativeSN', 0) as number
      let dailySN = store.get('dailySN', 0) as number

      if (today !== lastCallDate) {
        dailySN = 1
      } else {
        dailySN++
      }
      cumulativeSN++

      const enrichedData = {
        ...callData,
        cumulativeSN,
        dailySN,
        date: new Date().toLocaleDateString(), // Ensure server/sheet gets consistent date format if needed
        tabName
      }

      await logViaWebApp(callWebAppUrl, enrichedData)
      
      // Update counters only after successful log
      store.set('lastCallDate', today)
      store.set('cumulativeSN', cumulativeSN)
      store.set('dailySN', dailySN)

      return { success: true, sn: { cumulativeSN, dailySN } }
    } catch (error: unknown) {
      console.error('Failed to log call:', error)
      return { success: false, error: (error instanceof Error ? error.message : String(error)) }
    }
  })

  // Handle testing connection
  ipcMain.handle('test-quote', async () => {
    await fetchAndNotifyQuote()
    return { success: true }
  })

  // Handle testing connection
  ipcMain.handle('test-connection', async (_, { type, tabName, webAppUrl }) => {
    try {
      const taskData = type === 'call' ? {
        cumulativeSN: 999,
        dailySN: 999,
        date: new Date().toLocaleDateString(),
        duration: '0 mins',
        type: 'TEST',
        customer: 'TEST CUSTOMER',
        reason: 'Connection Test',
        status: 'SUCCESS',
        remark: 'Test entry from App Settings'
      } : {
        date: new Date().toLocaleDateString(),
        duration: '0 mins',
        customer: 'TEST',
        issue: 'Connection Test',
        status: 'SUCCESS',
        remark: 'Test entry from App Settings'
      }

      if (!webAppUrl) throw new Error(`${type === 'call' ? 'Call' : 'Task'} Web App URL missing.`)
      
      // We pass the tabName explicitly from settings UI to test un-saved changes if desired, 
      // or we could use the one in store. The UI passes it in `settings` object (now destructured).
      await logViaWebApp(webAppUrl, { ...taskData, tabName })
      return { success: true }
    } catch (error: unknown) {
      console.error('Connection test failed:', error)
      return { success: false, error: (error instanceof Error ? error.message : String(error)) }
    }
  })
}
