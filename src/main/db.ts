import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type {
  CanvasPlacement,
  Category,
  ClothingItem,
  Occasion,
  Outfit,
  Vibe
} from '../shared/types'

let db: Database.Database

export function initDb(dataDir: string): void {
  mkdirSync(dataDir, { recursive: true })
  const dbPath = join(dataDir, 'atelier.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      colors TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      original_path TEXT NOT NULL,
      cutout_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outfits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      occasion TEXT NOT NULL,
      vibe TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      placements TEXT NOT NULL,
      thumbnail_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function rowToItem(row: Record<string, unknown>): ClothingItem {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category) as Category,
    colors: parseJsonArray(String(row.colors)),
    brand: String(row.brand ?? ''),
    notes: String(row.notes ?? ''),
    tags: parseJsonArray(String(row.tags ?? '[]')),
    originalPath: String(row.original_path),
    cutoutPath: row.cutout_path ? String(row.cutout_path) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

function rowToOutfit(row: Record<string, unknown>): Outfit {
  let placements: CanvasPlacement[] = []
  try {
    const parsed = JSON.parse(String(row.placements))
    placements = Array.isArray(parsed) ? parsed : []
  } catch {
    placements = []
  }

  return {
    id: String(row.id),
    name: String(row.name),
    occasion: String(row.occasion) as Occasion,
    vibe: String(row.vibe) as Vibe,
    notes: String(row.notes ?? ''),
    placements,
    thumbnailPath: row.thumbnail_path ? String(row.thumbnail_path) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value)
}

export function insertItem(item: ClothingItem): ClothingItem {
  db.prepare(
    `INSERT INTO items (
      id, name, category, colors, brand, notes, tags,
      original_path, cutout_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    item.id,
    item.name,
    item.category,
    JSON.stringify(item.colors),
    item.brand,
    item.notes,
    JSON.stringify(item.tags),
    item.originalPath,
    item.cutoutPath,
    item.createdAt,
    item.updatedAt
  )
  return item
}

export function updateItem(item: ClothingItem): ClothingItem {
  db.prepare(
    `UPDATE items SET
      name = ?, category = ?, colors = ?, brand = ?, notes = ?, tags = ?,
      original_path = ?, cutout_path = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    item.name,
    item.category,
    JSON.stringify(item.colors),
    item.brand,
    item.notes,
    JSON.stringify(item.tags),
    item.originalPath,
    item.cutoutPath,
    item.updatedAt,
    item.id
  )
  return item
}

export function deleteItem(id: string): void {
  db.prepare('DELETE FROM items WHERE id = ?').run(id)
}

export function getItem(id: string): ClothingItem | null {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? rowToItem(row) : null
}

export function listItems(): ClothingItem[] {
  const rows = db
    .prepare('SELECT * FROM items ORDER BY updated_at DESC')
    .all() as Record<string, unknown>[]
  return rows.map(rowToItem)
}

export function insertOutfit(outfit: Outfit): Outfit {
  db.prepare(
    `INSERT INTO outfits (
      id, name, occasion, vibe, notes, placements, thumbnail_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    outfit.id,
    outfit.name,
    outfit.occasion,
    outfit.vibe,
    outfit.notes,
    JSON.stringify(outfit.placements),
    outfit.thumbnailPath,
    outfit.createdAt,
    outfit.updatedAt
  )
  return outfit
}

export function updateOutfit(outfit: Outfit): Outfit {
  db.prepare(
    `UPDATE outfits SET
      name = ?, occasion = ?, vibe = ?, notes = ?, placements = ?,
      thumbnail_path = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    outfit.name,
    outfit.occasion,
    outfit.vibe,
    outfit.notes,
    JSON.stringify(outfit.placements),
    outfit.thumbnailPath,
    outfit.updatedAt,
    outfit.id
  )
  return outfit
}

export function deleteOutfit(id: string): void {
  db.prepare('DELETE FROM outfits WHERE id = ?').run(id)
}

export function getOutfit(id: string): Outfit | null {
  const row = db.prepare('SELECT * FROM outfits WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? rowToOutfit(row) : null
}

export function listOutfits(): Outfit[] {
  const rows = db
    .prepare('SELECT * FROM outfits ORDER BY updated_at DESC')
    .all() as Record<string, unknown>[]
  return rows.map(rowToOutfit)
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}
