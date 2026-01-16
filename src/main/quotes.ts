import { BrowserWindow, screen, Notification } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import axios from 'axios'
import log from 'electron-log'

// @ts-ignore: electron-store type mismatch in some environments
const store = new (Store.default || Store)()
let quoteWindow: BrowserWindow | null = null
let quoteInterval: NodeJS.Timeout | null = null

interface Quote {
  q: string;
  a: string;
}

export function initQuotes(): void {
  const enabled = store.get('quotesEnabled', false)
  if (enabled) {
    scheduleNextQuote()
  }
}

function scheduleNextQuote(): void {
  if (quoteInterval) {
    clearInterval(quoteInterval as NodeJS.Timeout)
    clearTimeout(quoteInterval as NodeJS.Timeout)
  }
  
  const now = new Date()
  const delayUntilNextHour =
    (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds()

  log.info(`[Quotes] Scheduling first quote in ${delayUntilNextHour / 1000 / 60} minutes`)

  // Use a named function to handle the recurring logic
  const triggerAndReschedule = (): void => {
    log.info('[Quotes] Triggering scheduled quote')
    fetchAndNotifyQuote()
    quoteInterval = setInterval(() => {
      log.info('[Quotes] Triggering hourly quote')
      fetchAndNotifyQuote()
    }, 60 * 60 * 1000)
  }

  quoteInterval = setTimeout(triggerAndReschedule, delayUntilNextHour)
}

export function stopQuotes(): void {
  if (quoteInterval) clearInterval(quoteInterval)
  quoteInterval = null
}

export async function fetchAndNotifyQuote(): Promise<void> {
  try {
    const response = await axios.get('https://zenquotes.io/api/random')
    const quoteData: Quote = response.data[0]
    
    if (!quoteData) return

    const notification = new Notification({
      title: 'Koda | Quote of the Hour',
      body: `"${quoteData.q}" - ${quoteData.a}`,
      silent: false
    })

    notification.on('click', () => {
      showQuoteOverlay(quoteData)
    })

    notification.show()
  } catch (error) {
    log.error('[Quotes] Failed to fetch quote:', error)
  }
}

function showQuoteOverlay(quote: Quote): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height, x, y } = primaryDisplay.bounds

  if (quoteWindow) {
    quoteWindow.close()
  }

  quoteWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true, // Needs focus to capture click
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  quoteWindow.once('ready-to-show', () => {
    quoteWindow?.show()
  })

  // Close on click anywhere
  quoteWindow.on('blur', () => {
    quoteWindow?.close()
  })
  
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
            cursor: pointer;
          }
          .container {
            padding: 4rem; 
            border-radius: 32px; 
            border: 1px solid rgba(255,255,255,0.1); 
            text-align: center; 
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); 
            background: #1e293b; 
            max-width: 800px;
          }
          .quote-text {
            font-size: 2.5rem;
            line-height: 1.4;
            margin-bottom: 2rem;
            font-style: italic;
          }
          .author {
            font-size: 1.5rem;
            color: #94a3b8;
          }
          .hint {
            margin-top: 3rem;
            font-size: 0.9rem;
            color: #475569;
          }
        </style>
      </head>
      <body onclick="window.close()">
        <div class="container">
          <div class="quote-text">"${quote.q}"</div>
          <div class="author">&mdash; ${quote.a}</div>
          <div class="hint">Click anywhere to close</div>
        </div>
      </body>
    </html>
  `

  quoteWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(overlayHtml)}`)

  quoteWindow.on('closed', () => {
    quoteWindow = null
  })
}
