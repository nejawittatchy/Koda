import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import { net } from 'electron'

export async function appendTaskToSheet(
  spreadsheetId: string,
  keyFile: any, // Service account JSON
  tabName: string,
  taskData: { date: string; duration: string; customer: string; issue: string; status: string; remark: string }
): Promise<void> {
  const serviceAccountAuth = new JWT({
    email: keyFile.client_email,
    key: keyFile.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth)
  await doc.loadInfo()

  const sheet = doc.sheetsByTitle[tabName]
  if (!sheet) {
    throw new Error(`Sheet with title "${tabName}" not found.`)
  }

  await sheet.addRow(taskData as any)
}

export async function logViaWebApp(
  url: string,
  taskData: any
): Promise<void> {
  const response = await net.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Web App error: ${response.status} ${errorText}`)
  }
}
