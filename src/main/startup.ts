import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import log from 'electron-log'
import Store from 'electron-store'

const store = new Store()
const FIRST_RUN_KEY = 'hasRunBefore'

/**
 * Registers the application to run on Windows startup by creating a shortcut
 * in the startup folder. This only runs once on the first application launch.
 */
export function registerStartup(): void {
  // Only run on Windows
  if (process.platform !== 'win32') {
    log.info('Startup registration skipped: Not on Windows platform')
    return
  }

  // Check if this is the first run
  const hasRunBefore = store.get(FIRST_RUN_KEY, false)
  if (hasRunBefore) {
    log.info('Startup registration skipped: Application has already been registered')
    return
  }

  try {
    // Get the startup folder path
    const startupFolder = path.join(
      process.env.APPDATA || '',
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    )

    // Ensure the startup folder exists
    if (!fs.existsSync(startupFolder)) {
      log.error('Startup folder does not exist:', startupFolder)
      return
    }

    // Get the path to the executable
    const exePath = app.getPath('exe')
    const shortcutPath = path.join(startupFolder, 'Koda.lnk')

    // Create the shortcut using Windows Shell
    const shell = require('electron').shell
    const success = shell.writeShortcutLink(shortcutPath, {
      target: exePath,
      description: 'Koda - Your Personal Wellbeing Companion',
      appUserModelId: 'Koda'
    })

    if (success) {
      log.info('Successfully created startup shortcut at:', shortcutPath)
      // Mark that the app has run before
      store.set(FIRST_RUN_KEY, true)
    } else {
      log.error('Failed to create startup shortcut')
    }
  } catch (error) {
    log.error('Error registering startup:', error)
  }
}

/**
 * Removes the application from Windows startup by deleting the shortcut
 * from the startup folder.
 */
export function unregisterStartup(): void {
  if (process.platform !== 'win32') {
    return
  }

  try {
    const startupFolder = path.join(
      process.env.APPDATA || '',
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    )

    const shortcutPath = path.join(startupFolder, 'Koda.lnk')

    if (fs.existsSync(shortcutPath)) {
      fs.unlinkSync(shortcutPath)
      log.info('Successfully removed startup shortcut')
    }
  } catch (error) {
    log.error('Error unregistering startup:', error)
  }
}
