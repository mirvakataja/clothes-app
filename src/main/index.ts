import { app, BrowserWindow, ipcMain, protocol, net, shell } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import {
  createItem,
  createOutfit,
  editItem,
  editOutfit,
  getAllItems,
  getAllOutfits,
  getOneItem,
  getOneOutfit,
  getSettings,
  initStorage,
  pickImageFile,
  pickSavePng,
  removeItem,
  removeOutfit,
  saveApiKey,
  writeExportedPng
} from './storage'
import type {
  ClothingItemInput,
  ClothingItemUpdate,
  OutfitInput,
  OutfitUpdate
} from '../shared/types'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'atelier',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true
    }
  }
])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'Atelier',
    backgroundColor: '#f7f3ee',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpc(): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:setApiKey', (_e, apiKey: string) => saveApiKey(apiKey))

  ipcMain.handle('dialog:pickImage', () => pickImageFile(mainWindow))
  ipcMain.handle('dialog:pickSavePng', (_e, defaultName: string) =>
    pickSavePng(mainWindow, defaultName)
  )

  ipcMain.handle('items:list', () => getAllItems())
  ipcMain.handle('items:get', (_e, id: string) => getOneItem(id))
  ipcMain.handle('items:create', async (_e, input: ClothingItemInput) => {
    try {
      return { ok: true as const, item: await createItem(input) }
    } catch (err) {
      const error = err as Error & { item?: ReturnType<typeof getOneItem> }
      return {
        ok: false as const,
        error: error.message,
        item: error.item ?? null
      }
    }
  })
  ipcMain.handle('items:update', async (_e, input: ClothingItemUpdate) => {
    try {
      return { ok: true as const, item: await editItem(input) }
    } catch (err) {
      const error = err as Error & { item?: ReturnType<typeof getOneItem> }
      return {
        ok: false as const,
        error: error.message,
        item: error.item ?? null
      }
    }
  })
  ipcMain.handle('items:delete', (_e, id: string) => {
    removeItem(id)
    return true
  })

  ipcMain.handle('outfits:list', () => getAllOutfits())
  ipcMain.handle('outfits:get', (_e, id: string) => getOneOutfit(id))
  ipcMain.handle('outfits:create', async (_e, input: OutfitInput) =>
    createOutfit(input)
  )
  ipcMain.handle('outfits:update', async (_e, input: OutfitUpdate) =>
    editOutfit(input)
  )
  ipcMain.handle('outfits:delete', (_e, id: string) => {
    removeOutfit(id)
    return true
  })

  ipcMain.handle(
    'export:writePng',
    async (_e, filePath: string, dataUrl: string) => {
      await writeExportedPng(filePath, dataUrl)
      return true
    }
  )

  ipcMain.handle('shell:openPath', (_e, path: string) => shell.openPath(path))
}

app.whenReady().then(async () => {
  await initStorage()

  protocol.handle('atelier', (request) => {
    // atelier://media/<absolute-path-with-slashes>
    const withoutScheme = request.url.replace(/^atelier:\/\/media\//i, '')
    const filePath = decodeURIComponent(withoutScheme)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
