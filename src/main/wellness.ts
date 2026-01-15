import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'

const store = new Store()
let wellnessWindow: BrowserWindow | null = null
let intervalTimer: NodeJS.Timeout | null = null
let breakTimer: NodeJS.Timeout | null = null

export function initWellness(mainWindow: BrowserWindow): void {
  startInterval()

  ipcMain.on('pause-wellness', () => stopAllTimers())
  ipcMain.on('resume-wellness', () => startInterval())

  // Handle internal command from tray
  ipcMain.on('wellness-command', (_event, command) => {
    if (command === 'pause') stopAllTimers()
    if (command === 'resume') startInterval()
  })
}

function startInterval(): void {
  stopAllTimers()
  const intervalMins = store.get('wellnessInterval', 20) as number
  
  intervalTimer = setTimeout(async () => {
    const isInMeeting = await checkMeetingStatus()
    if (isInMeeting) {
      // Delay for 5 minutes if in a meeting
      intervalTimer = setTimeout(() => showWellnessOverlay(), 5 * 60 * 1000)
    } else {
      showWellnessOverlay()
    }
  }, intervalMins * 60 * 1000)
}

async function checkMeetingStatus(): Promise<boolean> {
  const { execSync } = await import('child_process')
  try {
    // Check for common meeting processes and window titles
    const output = execSync('tasklist /v').toString().toLowerCase()
    const meetingKeywords = ['zoom', 'teams', 'meet.google.com', 'skype', 'webex', 'huddle']
    return meetingKeywords.some((kw) => output.includes(kw))
  } catch {
    return false
  }
}

function showWellnessOverlay(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  wellnessWindow = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Load a simple blur overlay with sound
  wellnessWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <body style="margin:0; padding:0; overflow:hidden; background:rgba(0,0,0,0.4); backdrop-filter:blur(15px); display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; font-family:sans-serif; -webkit-app-region: drag;">
        <div style="background:rgba(255,255,255,0.1); padding:3rem; border-radius:24px; border:1px solid rgba(255,255,255,0.2); text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.3);">
          <h1 style="font-size:3.5rem; margin-bottom:0.5rem; background:linear-gradient(45deg, #fff, #aaa); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Hi, I'm Koda!</h1>
          <h2 style="font-size:2rem; font-weight:300; margin-bottom:2rem; opacity:0.9;">Time for a quick eye break.</h2>
          <p style="font-size:1.2rem; opacity:0.7; margin-bottom:2rem;">Look at something 20 feet away for 20 seconds.</p>
          <div id="counter" style="font-size:5rem; font-weight:bold; color:#4ade80;">20</div>
        </div>
        <audio id="ting" src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vTN6"></audio>
        <script>
          const audio = document.getElementById('ting');
          audio.play();
          let count = 20;
          const el = document.getElementById('counter');
          const timer = setInterval(() => {
            count--;
            el.innerText = count;
            if (count === 3) audio.play(); // Warning sound before end
            if (count <= 0) {
              clearInterval(timer);
              audio.play(); // Final sound
            }
          }, 1000);
        </script>
      </body>
    </html>
  `)

  wellnessWindow.setIgnoreMouseEvents(true)

  const breakSecs = store.get('wellnessBreak', 20) as number
  
  // Audio "ting" would go here (using shell.beep or similar, or webview audio)
  
  breakTimer = setTimeout(() => {
    if (wellnessWindow) {
      wellnessWindow.close()
      wellnessWindow = null
    }
    startInterval()
  }, breakSecs * 1000)
}

function stopAllTimers(): void {
  if (intervalTimer) clearTimeout(intervalTimer)
  if (breakTimer) clearTimeout(breakTimer)
  if (wellnessWindow) {
    wellnessWindow.close()
    wellnessWindow = null
  }
}
