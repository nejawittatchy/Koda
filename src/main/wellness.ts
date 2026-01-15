import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'

// @ts-ignore: electron-store type mismatch in some environments
const store = new (Store.default || Store)()
let wellnessWindow: BrowserWindow | null = null
let intervalTimer: NodeJS.Timeout | null = null
let breakTimer: NodeJS.Timeout | null = null
let nextBlurTime: number | null = null
let isPaused = false

export function initWellness(_mainWindow: BrowserWindow): void {
  console.log('Initializing Wellness module...')
  startInterval()

  ipcMain.on('pause-wellness', () => {
    console.log('IPC: pause-wellness received')
    isPaused = true
    stopAllTimers()
  })
  ipcMain.on('resume-wellness', () => {
    console.log('IPC: resume-wellness received')
    isPaused = false
    startInterval()
  })

  // Handle internal command from tray
  ipcMain.on('wellness-command', (_event, command) => {
    console.log(`IPC: wellness-command received: ${command}`)
    if (command === 'pause') {
      isPaused = true
      stopAllTimers()
    }
    if (command === 'resume') {
      isPaused = false
      startInterval()
    }
  })
}

function startInterval(): void {
  stopAllTimers()
  const enabled = store.get('wellnessEnabled', true)
  if (!enabled) {
    console.log('Wellness breaks are disabled in settings.')
    isPaused = true
    nextBlurTime = null
    return
  }

  isPaused = false
  const intervalMins = store.get('wellnessInterval', 1) as number
  const delayMs = intervalMins * 60 * 1000
  nextBlurTime = Date.now() + delayMs
  console.log(`Starting wellness interval: ${intervalMins} minutes. Next blur at: ${new Date(nextBlurTime).toLocaleTimeString()}`)
  
  intervalTimer = setTimeout(async () => {
    console.log('Wellness timer expired, checking meeting status...')
    const isInMeeting = await checkMeetingStatus()
    if (isInMeeting) {
      console.log('User is in a meeting, delaying break by 5 minutes.')
      const meetingDelayMs = 5 * 60 * 1000
      nextBlurTime = Date.now() + meetingDelayMs
      // Delay for 5 minutes if in a meeting
      intervalTimer = setTimeout(() => showWellnessOverlay(), meetingDelayMs)
    } else {
      showWellnessOverlay()
    }
  }, delayMs)
}

async function checkMeetingStatus(): Promise<boolean> {
  const { exec } = await import('child_process')
  return new Promise((resolve) => {
    try {
      exec('tasklist /v', (error, stdout) => {
        if (error) {
          console.error('Error checking meeting status:', error)
          resolve(false)
          return
        }
        const output = stdout.toLowerCase()
        const meetingKeywords = ['zoom', 'teams', 'meet.google.com', 'skype', 'webex', 'huddle']
        const found = meetingKeywords.some((kw) => output.includes(kw))
        console.log(`Meeting status check: ${found}`)
        resolve(found)
      })
    } catch (err) {
      console.error('Exception in checkMeetingStatus:', err)
      resolve(false)
    }
  })
}

function showWellnessOverlay(): void {
  console.log('Initiating showWellnessOverlay...')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height, x, y } = primaryDisplay.bounds
  console.log(`Display bounds: ${width}x${height} at ${x},${y}`)

  if (wellnessWindow) {
    console.log('Overlay window already exists, closing it first.')
    wellnessWindow.close()
  }

  wellnessWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false, // Don't show until ready
    resizable: false,
    movable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  wellnessWindow.once('ready-to-show', () => {
    console.log('Overlay window ready-to-show. Calling show()...')
    wellnessWindow?.show()
    wellnessWindow?.setIgnoreMouseEvents(true)
  })

  wellnessWindow.webContents.on('did-finish-load', () => {
    console.log('Overlay content finished loading.')
  })

  wellnessWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`Overlay failed to load: ${errorCode} - ${errorDescription}`)
  })

  // Ensure it's truly on top
  wellnessWindow.setAlwaysOnTop(true, 'screen-saver')
  wellnessWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Load a simplified overlay
  const overlayHtml = `
    <html>
      <head>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            overflow: hidden; 
            background: rgba(15, 23, 42, 0.95); 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            color: white; 
            font-family: sans-serif; 
            width: 100vw; 
            height: 100vh;
          }
          .container {
            padding: 4rem; 
            border-radius: 32px; 
            border: 1px solid rgba(255,255,255,0.1); 
            text-align: center; 
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); 
            background: #1e293b; 
            min-width: 500px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="font-size: 4rem; margin: 0 0 1rem 0;">Hi, I'm Koda!</h1>
          <h2 style="font-size: 2rem; font-weight: 300; margin: 0 0 2rem 0; color: #cbd5e1;">Time for a quick eye break.</h2>
          <p style="font-size: 1.5rem; color: #94a3b8; margin: 0 0 2rem 0;">Look at something 20 feet away for 20 seconds.</p>
          <div id="counter" style="font-size: 8rem; font-weight: 800; color: #4ade80;">20</div>
        </div>
        <audio id="ting" src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vTN6"></audio>
        <script>
          const audio = document.getElementById('ting');
          try { audio.play().catch(e => console.error('Audio play failed:', e)); } catch(e) {}
          let count = 20;
          const el = document.getElementById('counter');
          const timer = setInterval(() => {
            count--;
            if (el) el.innerText = count;
            if (count === 3) try { audio.play(); } catch(e) {}
            if (count <= 0) {
              clearInterval(timer);
              try { audio.play(); } catch(e) {}
            }
          }, 1000);
        </script>
      </body>
    </html>
  `

  wellnessWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(overlayHtml)}`)

  const breakSecs = store.get('wellnessBreak', 20) as number
  
  breakTimer = setTimeout(() => {
    console.log('Break duration ended. Closing overlay...')
    if (wellnessWindow) {
      wellnessWindow.close()
      wellnessWindow = null
    }
    startInterval()
  }, breakSecs * 1000)
}

function stopAllTimers(): void {
  console.log('Stopping all wellness timers and closing overlay...')
  if (intervalTimer) clearTimeout(intervalTimer)
  if (breakTimer) clearTimeout(breakTimer)
  nextBlurTime = null
  if (wellnessWindow) {
    wellnessWindow.close()
    wellnessWindow = null
  }
}

export function getWellnessStatus(): string {
  if (isPaused) return 'Koda | Paused'
  if (!nextBlurTime) return 'Koda'

  const remainingMs = nextBlurTime - Date.now()
  if (remainingMs <= 0) return 'Koda | Blur in progress'

  const remainingSecs = Math.floor(remainingMs / 1000)
  const mins = Math.floor(remainingSecs / 60)
  const secs = remainingSecs % 60

  const mm = mins.toString().padStart(2, '0')
  const ss = secs.toString().padStart(2, '0')

  return `Koda | ${mm}:${ss}`
}
