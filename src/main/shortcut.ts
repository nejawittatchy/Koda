import { globalShortcut, BrowserWindow } from 'electron'
import Store from 'electron-store'

// @ts-ignore: electron-store type mismatch in some environments
// @ts-ignore: electron-store type mismatch in some environments
const store = new (Store.default || Store)()

export function registerShortcuts(mainWindow: BrowserWindow): void {
  const shortcut = store.get('shortcut', 'Alt+Shift+L') as string
  const callShortcut = store.get('callShortcut', 'Alt+Shift+K') as string

  // Unregister first to avoids duplicates
  globalShortcut.unregisterAll()

  try {
    globalShortcut.register(shortcut, () => {
      // If already visible and focused, we could cycle or just show. 
      // But the requirement is to open. We send an event to renderer to switch mode?
      // Actually per plan: "Sends switch-mode -> 'task' to renderer."
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      mainWindow.focus()
      mainWindow.webContents.send('switch-mode', 'task')
    })
    
    globalShortcut.register(callShortcut, () => {
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      mainWindow.focus()
      mainWindow.webContents.send('switch-mode', 'call')
    })
  } catch (error) {
    console.error('Failed to register shortcut:', error)
  }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
