import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import { createRequire } from 'module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type {
  CanvasPlacement,
  Category,
  ClothingItem,
  Occasion,
  Outfit,
  Vibe
} from '../shared/types'

const require = createRequire(__filename)

let db: Database
let dbPath = ''

function persist(): void {
  if (!db || !dbPath) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

function run(sql: string, params: SqlValue[] = []): void {
  db.run(sql, params)
  persist()
}

function getRow(
  sql: string,
  params: SqlValue[] = []
): Record<string, unknown> | undefined {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (!stmt.step()) {
    stmt.free()
    return undefined
  }
  const row = stmt.getAsObject() as Record<string, unknown>
  stmt.free()
  return row
}

function allRows(
  sql: string,
  params: SqlValue[] = []
): Record<string, unknown>[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>)
  }
  stmt.free()
  return rows
}

export async function initDb(dataDir: string): Promise<void> {
  mkdirSync(dataDir, { recursive: true })
  dbPath = join(dataDir, 'atelier.db')

  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
  const wasmFile = readFileSync(wasmPath)
  const SQL = await initSqlJs({
    wasmBinary: wasmFile.buffer.slice(
      wasmFile.byteOffset,
      wasmFile.byteOffset + wasmFile.byteLength
    ) as ArrayBuffer
  })

  if (existsSync(dbPath)) {
    db = new SQL.Database(new Uint8Array(readFileSync(dbPath)))
  } else {
    db = new SQL.Database()
  }

  db.run(`
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
  persist()
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
  const row = getRow('SELECT value FROM settings WHERE key = ?', [key])
  return row?.value != null ? String(row.value) : null
}

export function setSetting(key: string, value: string): void {
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  )
}

export function insertItem(item: ClothingItem): ClothingItem {
  run(
    `INSERT INTO items (
      id, name, category, colors, brand, notes, tags,
      original_path, cutout_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ]
  )
  return item
}

export function updateItem(item: ClothingItem): ClothingItem {
  run(
    `UPDATE items SET
      name = ?, category = ?, colors = ?, brand = ?, notes = ?, tags = ?,
      original_path = ?, cutout_path = ?, updated_at = ?
     WHERE id = ?`,
    [
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
    ]
  )
  return item
}

export function deleteItem(id: string): void {
  run('DELETE FROM items WHERE id = ?', [id])
}

export function getItem(id: string): ClothingItem | null {
  const row = getRow('SELECT * FROM items WHERE id = ?', [id])
  return row ? rowToItem(row) : null
}

export function listItems(): ClothingItem[] {
  return allRows('SELECT * FROM items ORDER BY updated_at DESC').map(rowToItem)
}

export function insertOutfit(outfit: Outfit): Outfit {
  run(
    `INSERT INTO outfits (
      id, name, occasion, vibe, notes, placements, thumbnail_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      outfit.id,
      outfit.name,
      outfit.occasion,
      outfit.vibe,
      outfit.notes,
      JSON.stringify(outfit.placements),
      outfit.thumbnailPath,
      outfit.createdAt,
      outfit.updatedAt
    ]
  )
  return outfit
}

export function updateOutfit(outfit: Outfit): Outfit {
  run(
    `UPDATE outfits SET
      name = ?, occasion = ?, vibe = ?, notes = ?, placements = ?,
      thumbnail_path = ?, updated_at = ?
     WHERE id = ?`,
    [
      outfit.name,
      outfit.occasion,
      outfit.vibe,
      outfit.notes,
      JSON.stringify(outfit.placements),
      outfit.thumbnailPath,
      outfit.updatedAt,
      outfit.id
    ]
  )
  return outfit
}

export function deleteOutfit(id: string): void {
  run('DELETE FROM outfits WHERE id = ?', [id])
}

export function getOutfit(id: string): Outfit | null {
  const row = getRow('SELECT * FROM outfits WHERE id = ?', [id])
  return row ? rowToOutfit(row) : null
}

export function listOutfits(): Outfit[] {
  return allRows('SELECT * FROM outfits ORDER BY updated_at DESC').map(
    rowToOutfit
  )
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}
