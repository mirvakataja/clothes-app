import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  ClothingAnalysis,
  ClothingItem,
  ClothingItemInput,
  ClothingItemUpdate,
  Outfit,
  OutfitInput,
  OutfitUpdate
} from '../shared/types'

export type ItemMutationResult =
  | { ok: true; item: ClothingItem }
  | { ok: false; error: string; item: ClothingItem | null }

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (partial: {
    removeBgApiKey?: string
    openaiApiKey?: string
  }): Promise<AppSettings> => ipcRenderer.invoke('settings:save', partial),
  /** @deprecated use saveSettings */
  setApiKey: (apiKey: string): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:save', { removeBgApiKey: apiKey }),

  pickImage: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickImage'),
  pickImages: (): Promise<string[]> => ipcRenderer.invoke('dialog:pickImages'),
  pickSavePng: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:pickSavePng', defaultName),

  analyzeImage: (imagePath: string): Promise<ClothingAnalysis> =>
    ipcRenderer.invoke('ai:analyzeImage', imagePath),

  listItems: (): Promise<ClothingItem[]> => ipcRenderer.invoke('items:list'),
  getItem: (id: string): Promise<ClothingItem | null> =>
    ipcRenderer.invoke('items:get', id),
  createItem: (input: ClothingItemInput): Promise<ItemMutationResult> =>
    ipcRenderer.invoke('items:create', input),
  updateItem: (input: ClothingItemUpdate): Promise<ItemMutationResult> =>
    ipcRenderer.invoke('items:update', input),
  deleteItem: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('items:delete', id),

  listOutfits: (): Promise<Outfit[]> => ipcRenderer.invoke('outfits:list'),
  getOutfit: (id: string): Promise<Outfit | null> =>
    ipcRenderer.invoke('outfits:get', id),
  createOutfit: (input: OutfitInput): Promise<Outfit> =>
    ipcRenderer.invoke('outfits:create', input),
  updateOutfit: (input: OutfitUpdate): Promise<Outfit> =>
    ipcRenderer.invoke('outfits:update', input),
  deleteOutfit: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('outfits:delete', id),

  writeExportedPng: (filePath: string, dataUrl: string): Promise<boolean> =>
    ipcRenderer.invoke('export:writePng', filePath, dataUrl),
  openPath: (path: string): Promise<string> =>
    ipcRenderer.invoke('shell:openPath', path),

  toMediaUrl: (filePath: string): string => {
    const normalized = filePath.replace(/\\/g, '/')
    return `atelier://media/${encodeURIComponent(normalized).replace(/%2F/gi, '/')}`
  }
}

contextBridge.exposeInMainWorld('atelier', api)

export type AtelierApi = typeof api
