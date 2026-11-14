import { readFile, writeFile } from 'fs/promises'

export async function removeBackground(
  apiKey: string,
  sourcePath: string,
  destPath: string
): Promise<void> {
  if (!apiKey.trim()) {
    throw new Error('Add a remove.bg API key in Settings before cutting out backgrounds.')
  }

  const imageBuffer = await readFile(sourcePath)
  const form = new FormData()
  form.append('size', 'auto')
  form.append('format', 'png')
  form.append(
    'image_file',
    new Blob([new Uint8Array(imageBuffer)]),
    sourcePath.split(/[\\/]/).pop() ?? 'image.jpg'
  )

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey
    },
    body: form
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const errJson = (await response.json()) as {
        errors?: Array<{ title?: string; detail?: string }>
      }
      detail =
        errJson.errors?.[0]?.detail ||
        errJson.errors?.[0]?.title ||
        detail
    } catch {
      // keep status text
    }
    throw new Error(`Background removal failed: ${detail}`)
  }

  const result = Buffer.from(await response.arrayBuffer())
  await writeFile(destPath, result)
}
