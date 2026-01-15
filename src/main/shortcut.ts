import { globalShortcut, BrowserWindow } from 'electron'
import Store from 'electron-store'

const store = new (Store as any).default()

export function registerShortcuts(mainWindow: BrowserWindow): void {
  const shortcut = store.get('shortcut', 'Alt+Shift+L') as string

  // Unregister first to avoids duplicates
  globalShortcut.unregisterAll()

  try {
    globalShortcut.register(shortcut, () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  } catch (error) {
    console.error('Failed to register shortcut:', error)
  }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
