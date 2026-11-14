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
npm run electron:download
npm run dev
```

`electron:download` fetches the Electron binary. Newer npm versions may skip that automatically; if `npm run dev` says **Electron uninstall**, run that command once and try again.

If npm asks you to approve install scripts:

```bat
npm install-scripts approve electron
npm install-scripts approve esbuild
npm run electron:download
npm run dev
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
