import { app, Tray, Menu, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { getWellnessStatus } from './wellness'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = join(__dirname, '../../resources/icon.png')
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: (): void => {
        mainWindow.show()
      }
    },
    {
      label: 'Settings',
      click: (): void => {
        mainWindow.show()
        mainWindow.webContents.send('open-settings')
      }
    },
    {
      label: 'Pause Wellness Breaks',
      type: 'checkbox',
      checked: false,
      click: (menuItem): void => {
        if (menuItem.checked) {
          ipcMain.emit('wellness-command', null, 'pause')
        } else {
          ipcMain.emit('wellness-command', null, 'resume')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: (): void => {
        app.quit()
      }
    }
  ])

  tray.setToolTip(getWellnessStatus())
  tray.setContextMenu(contextMenu)

  // Update tooltip every second
  setInterval(() => {
    if (tray) {
      tray.setToolTip(getWellnessStatus())
    }
  }, 1000)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
    }
  })

  return tray
}
