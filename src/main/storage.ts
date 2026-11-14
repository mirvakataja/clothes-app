import { app, dialog, BrowserWindow } from 'electron'
import { copyFile, mkdir, unlink, writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { extname, join } from 'path'
import { v4 as uuid } from 'uuid'
import {
  deleteItem,
  deleteOutfit,
  getItem,
  getOutfit,
  getSetting,
  initDb,
  insertItem,
  insertOutfit,
  listItems,
  listOutfits,
  setSetting,
  updateItem,
  updateOutfit
} from './db'
import { removeBackground } from './removeBg'
import type {
  AppSettings,
  ClothingItem,
  ClothingItemInput,
  ClothingItemUpdate,
  Outfit,
  OutfitInput,
  OutfitUpdate
} from '../shared/types'

let dataRoot = ''

export function getDataRoot(): string {
  return dataRoot
}

export function initStorage(): string {
  dataRoot = join(app.getPath('userData'), 'atelier-data')
  mkdirSyncSafe(dataRoot)
  mkdirSyncSafe(join(dataRoot, 'images'))
  mkdirSyncSafe(join(dataRoot, 'thumbnails'))
  initDb(dataRoot)
  return dataRoot
}

function mkdirSyncSafe(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

function nowIso(): string {
  return new Date().toISOString()
}

function imageDisplayPath(relativeOrAbsolute: string | null): string | null {
  if (!relativeOrAbsolute) return null
  if (
    relativeOrAbsolute.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(relativeOrAbsolute)
  ) {
    return relativeOrAbsolute
  }
  return join(dataRoot, relativeOrAbsolute)
}

function toPublicItem(item: ClothingItem): ClothingItem {
  return {
    ...item,
    originalPath: imageDisplayPath(item.originalPath)!,
    cutoutPath: imageDisplayPath(item.cutoutPath)
  }
}

function toPublicOutfit(outfit: Outfit): Outfit {
  return {
    ...outfit,
    thumbnailPath: imageDisplayPath(outfit.thumbnailPath)
  }
}

export function getSettings(): AppSettings {
  return {
    removeBgApiKey: getSetting('removeBgApiKey') ?? '',
    dataPath: dataRoot
  }
}

export function saveApiKey(apiKey: string): AppSettings {
  setSetting('removeBgApiKey', apiKey)
  return getSettings()
}

export async function pickImageFile(
  win: BrowserWindow | null
): Promise<string | null> {
  const options = {
    title: 'Choose a clothing photo',
    properties: ['openFile' as const],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
    ]
  }
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
}

export async function pickSavePng(
  win: BrowserWindow | null,
  defaultName: string
): Promise<string | null> {
  const options = {
    title: 'Export outfit',
    defaultPath: defaultName.endsWith('.png') ? defaultName : `${defaultName}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }]
  }
  const result = win
    ? await dialog.showSaveDialog(win, options)
    : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return null
  return result.filePath
}

async function storeImage(
  sourcePath: string,
  id: string,
  kind: 'original' | 'cutout'
): Promise<string> {
  const ext = kind === 'cutout' ? '.png' : extname(sourcePath) || '.jpg'
  const relative = join('images', `${id}-${kind}${ext}`)
  const dest = join(dataRoot, relative)
  await mkdir(join(dataRoot, 'images'), { recursive: true })
  await copyFile(sourcePath, dest)
  return relative
}

async function maybeCutout(
  sourcePath: string,
  id: string,
  enabled: boolean
): Promise<string | null> {
  if (!enabled) return null
  const apiKey = getSetting('removeBgApiKey') ?? ''
  const relative = join('images', `${id}-cutout.png`)
  const dest = join(dataRoot, relative)
  await removeBackground(apiKey, sourcePath, dest)
  return relative
}

export async function createItem(input: ClothingItemInput): Promise<ClothingItem> {
  const id = uuid()
  const stamp = nowIso()
  const originalPath = await storeImage(input.sourceImagePath, id, 'original')
  let cutoutPath: string | null = null
  try {
    cutoutPath = await maybeCutout(
      input.sourceImagePath,
      id,
      input.removeBackground
    )
  } catch (err) {
    // Keep original if cutout fails; surface error to caller after save attempt
    if (input.removeBackground) {
      const item = insertItem({
        id,
        name: input.name.trim() || 'Untitled item',
        category: input.category,
        colors: input.colors,
        brand: input.brand.trim(),
        notes: input.notes.trim(),
        tags: input.tags,
        originalPath,
        cutoutPath: null,
        createdAt: stamp,
        updatedAt: stamp
      })
      const message = err instanceof Error ? err.message : 'Cutout failed'
      const error = new Error(message) as Error & { item: ClothingItem }
      error.item = toPublicItem(item)
      throw error
    }
  }

  const item = insertItem({
    id,
    name: input.name.trim() || 'Untitled item',
    category: input.category,
    colors: input.colors,
    brand: input.brand.trim(),
    notes: input.notes.trim(),
    tags: input.tags,
    originalPath,
    cutoutPath,
    createdAt: stamp,
    updatedAt: stamp
  })
  return toPublicItem(item)
}

export async function editItem(input: ClothingItemUpdate): Promise<ClothingItem> {
  const existing = getItem(input.id)
  if (!existing) throw new Error('Item not found')

  let originalPath = existing.originalPath
  let cutoutPath = existing.cutoutPath

  if (input.sourceImagePath) {
    originalPath = await storeImage(input.sourceImagePath, input.id, 'original')
    if (input.removeBackground) {
      try {
        cutoutPath = await maybeCutout(input.sourceImagePath, input.id, true)
      } catch (err) {
        const updated = updateItem({
          ...existing,
          name: input.name.trim() || existing.name,
          category: input.category,
          colors: input.colors,
          brand: input.brand.trim(),
          notes: input.notes.trim(),
          tags: input.tags,
          originalPath,
          cutoutPath: null,
          updatedAt: nowIso()
        })
        const message = err instanceof Error ? err.message : 'Cutout failed'
        const error = new Error(message) as Error & { item: ClothingItem }
        error.item = toPublicItem(updated)
        throw error
      }
    } else {
      cutoutPath = null
    }
  }

  const updated = updateItem({
    ...existing,
    name: input.name.trim() || existing.name,
    category: input.category,
    colors: input.colors,
    brand: input.brand.trim(),
    notes: input.notes.trim(),
    tags: input.tags,
    originalPath,
    cutoutPath,
    updatedAt: nowIso()
  })
  return toPublicItem(updated)
}

export function removeItem(id: string): void {
  const item = getItem(id)
  if (!item) return
  for (const rel of [item.originalPath, item.cutoutPath]) {
    if (!rel) continue
    const full = join(dataRoot, rel)
    if (existsSync(full)) {
      void unlink(full).catch(() => undefined)
    }
  }
  deleteItem(id)
}

export function getAllItems(): ClothingItem[] {
  return listItems().map(toPublicItem)
}

export function getOneItem(id: string): ClothingItem | null {
  const item = getItem(id)
  return item ? toPublicItem(item) : null
}

async function saveThumbnail(
  id: string,
  dataUrl?: string | null
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null
  const base64 = dataUrl.split(',')[1]
  if (!base64) return null
  const relative = join('thumbnails', `${id}.png`)
  const dest = join(dataRoot, relative)
  await mkdir(join(dataRoot, 'thumbnails'), { recursive: true })
  await writeFile(dest, Buffer.from(base64, 'base64'))
  return relative
}

export async function createOutfit(input: OutfitInput): Promise<Outfit> {
  const id = uuid()
  const stamp = nowIso()
  const thumbnailPath = await saveThumbnail(id, input.thumbnailDataUrl)
  const outfit = insertOutfit({
    id,
    name: input.name.trim() || 'Untitled outfit',
    occasion: input.occasion,
    vibe: input.vibe,
    notes: input.notes.trim(),
    placements: input.placements,
    thumbnailPath,
    createdAt: stamp,
    updatedAt: stamp
  })
  return toPublicOutfit(outfit)
}

export async function editOutfit(input: OutfitUpdate): Promise<Outfit> {
  const existing = getOutfit(input.id)
  if (!existing) throw new Error('Outfit not found')
  const thumbnailPath =
    (await saveThumbnail(input.id, input.thumbnailDataUrl)) ??
    existing.thumbnailPath
  const outfit = updateOutfit({
    ...existing,
    name: input.name.trim() || existing.name,
    occasion: input.occasion,
    vibe: input.vibe,
    notes: input.notes.trim(),
    placements: input.placements,
    thumbnailPath,
    updatedAt: nowIso()
  })
  return toPublicOutfit(outfit)
}

export function removeOutfit(id: string): void {
  const outfit = getOutfit(id)
  if (!outfit) return
  if (outfit.thumbnailPath) {
    const full = join(dataRoot, outfit.thumbnailPath)
    if (existsSync(full)) void unlink(full).catch(() => undefined)
  }
  deleteOutfit(id)
}

export function getAllOutfits(): Outfit[] {
  return listOutfits().map(toPublicOutfit)
}

export function getOneOutfit(id: string): Outfit | null {
  const outfit = getOutfit(id)
  return outfit ? toPublicOutfit(outfit) : null
}

export async function writeExportedPng(
  filePath: string,
  dataUrl: string
): Promise<void> {
  const base64 = dataUrl.split(',')[1]
  if (!base64) throw new Error('Invalid image data')
  await writeFile(filePath, Buffer.from(base64, 'base64'))
}
