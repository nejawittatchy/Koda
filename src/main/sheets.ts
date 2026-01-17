import { net } from 'electron'

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
