# Atelier

Local Windows desktop app for cataloguing clothes (with in-app background removal) and planning outfits on a free-form moodboard canvas.

## Features

- **Wardrobe** — add clothing photos, optional remove.bg cutouts, category / colors / brand / notes / tags
- **Browse & filter** — search plus category, color, and brand filters
- **Outfit canvas** — drag, resize, rotate, and layer pieces; save with occasion + vibe
- **Export** — save the moodboard as a PNG
- **Local data** — SQLite + images under your Windows user profile (`%APPDATA%/atelier/atelier-data`)

## Requirements

- [Node.js 20 or 22 LTS](https://nodejs.org/) (avoid odd/bleeding-edge majors if possible)
- Windows (primary target)
- A [remove.bg](https://www.remove.bg/api) API key for background removal

No Visual Studio / C++ build tools are required — the database uses SQL.js (WASM).

## Develop

From the project folder that contains `package.json`:

```bat
npm install
npm run dev
```

The first `npm run dev` downloads the Electron binary (can take a minute). You should see `Electron binary missing — downloading…` once.

If that fails, run these diagnostics and paste the output:

```bat
echo ELECTRON_SKIP_BINARY_DOWNLOAD=%ELECTRON_SKIP_BINARY_DOWNLOAD%
dir node_modules\electron
dir node_modules\electron\dist
node scripts\ensure-electron.cjs
```

## Build (Windows installer)

```bat
npm run dist:win
```

Installer output lands in `release/`.

## First run

1. Open **Settings** and paste your remove.bg API key.
2. Go to **Wardrobe → Add clothing**, choose a photo, and save.
3. Open **Outfits → Plan outfit**, place pieces on the canvas, set occasion/vibe, and save or export.

## Stack

Electron · React · TypeScript · SQLite (SQL.js) · Konva · remove.bg API
