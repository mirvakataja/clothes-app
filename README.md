# Atelier

Local Windows desktop app for cataloguing clothes (with in-app background removal) and planning outfits on a free-form moodboard canvas.

## Features

- **Wardrobe** — add clothing photos, optional remove.bg cutouts, category / colors / brand / notes / tags
- **Bulk upload** — multi-select photos; OpenAI vision suggests details; review and save
- **Browse & filter** — search plus category, color, and brand filters
- **Outfit canvas** — drag, resize, rotate, and layer pieces; save with occasion + vibe
- **Export** — save the moodboard as a PNG
- **Local data** — SQLite + images under your Windows user profile (`%APPDATA%/atelier/atelier-data`)

## Requirements

- **[Node.js 22 LTS](https://nodejs.org/)** on Windows (recommended). Node 26 can fail to unpack Electron.
- Windows (primary target)
- A [remove.bg](https://www.remove.bg/api) API key for background removal
- An [OpenAI](https://platform.openai.com/api-keys) API key for bulk AI tagging (`gpt-4o-mini`)

No Visual Studio / C++ build tools are required — the database uses SQL.js (WASM).

## Develop

From the project folder that contains `package.json`:

```bat
npm install
npm run dev
```

The first run downloads the Electron binary (can take a minute).

### If you see `Error: Electron uninstall`

You are likely on Node 26. Either:

**A. Switch to Node 22 LTS (simplest)**  
Install from https://nodejs.org/, open a new terminal, then:

```bat
rmdir /s /q node_modules
del package-lock.json
npm install
npm run dev
```

**B. Stay on Node 26**  
This repo pins a `yauzl` override that fixes Electron extraction. Make sure you have the latest project files, then:

```bat
rmdir /s /q node_modules
del package-lock.json
npm install
npm run electron:download
npm run dev
```

## Build (Windows installer)

```bat
npm run dist:win
```

Installer output lands in `release/`.

## First run

1. Open **Settings** and paste your remove.bg and OpenAI API keys.
2. Go to **Wardrobe → Add clothing** for one item, or **Bulk upload** for many photos with AI-filled details.
3. Open **Outfits → Plan outfit**, place pieces on the canvas, set occasion/vibe, and save or export.

## Stack

Electron · React · TypeScript · SQLite (SQL.js) · Konva · remove.bg API
