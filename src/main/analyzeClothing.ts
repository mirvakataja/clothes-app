import { readFile } from 'fs/promises'
import { extname } from 'path'
import { CATEGORIES, type Category } from '../shared/types'

export interface ClothingAnalysis {
  name: string
  category: Category
  colors: string[]
  brand: string
  notes: string
  tags: string[]
}

function mimeForPath(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return 'image/jpeg'
  }
}

function asCategory(value: unknown): Category {
  const text = String(value ?? '')
  return (CATEGORIES as readonly string[]).includes(text)
    ? (text as Category)
    : 'Other'
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .slice(0, 8)
}

export async function analyzeClothingImage(
  apiKey: string,
  imagePath: string
): Promise<ClothingAnalysis> {
  if (!apiKey.trim()) {
    throw new Error('Add an OpenAI API key in Settings before using bulk AI upload.')
  }

  const bytes = await readFile(imagePath)
  const dataUrl = `data:${mimeForPath(imagePath)};base64,${bytes.toString('base64')}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You catalogue clothing from photos for a personal wardrobe app.
Return ONLY JSON with keys:
name (short product-style name),
category (one of: ${CATEGORIES.join(', ')}),
colors (array of 1-4 plain color names),
brand (string, empty if unknown),
notes (one short sentence about fabric/fit/pattern if visible),
tags (array of 0-5 lowercase useful tags).
Be concise and concrete. Prefer visible facts over guessing.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this clothing item and fill the wardrobe fields.'
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl, detail: 'low' }
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const errJson = (await response.json()) as {
        error?: { message?: string }
      }
      detail = errJson.error?.message || detail
    } catch {
      // keep status text
    }
    throw new Error(`AI analysis failed: ${detail}`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const raw = payload.choices?.[0]?.message?.content
  if (!raw) throw new Error('AI analysis returned an empty response.')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    throw new Error('AI analysis returned invalid JSON.')
  }

  const name = String(parsed.name ?? '').trim() || 'Untitled item'
  return {
    name,
    category: asCategory(parsed.category),
    colors: asStringArray(parsed.colors),
    brand: String(parsed.brand ?? '').trim(),
    notes: String(parsed.notes ?? '').trim(),
    tags: asStringArray(parsed.tags)
  }
}
