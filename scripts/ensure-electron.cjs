/**
 * Ensure the Electron binary is present.
 * On Node 24.16+ / 26 on Windows, extract-zip/yauzl can silently extract
 * only the first zip entry unless yauzl is overridden to 3.3.1.
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const electronRoot = path.dirname(require.resolve('electron/package.json'))
const pathTxt = path.join(electronRoot, 'path.txt')
const distDir = path.join(electronRoot, 'dist')
const installJs = path.join(electronRoot, 'install.js')

function installed() {
  try {
    const executable = fs.readFileSync(pathTxt, 'utf8').trim()
    if (!executable) return false
    return fs.existsSync(path.join(distDir, executable))
  } catch {
    return false
  }
}

function wipePartialDist() {
  for (const target of [pathTxt, path.join(distDir, 'version')]) {
    try {
      fs.unlinkSync(target)
    } catch {
      // ignore
    }
  }
  try {
    fs.rmSync(distDir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

if (installed()) {
  console.log('Electron binary OK:', fs.readFileSync(pathTxt, 'utf8').trim())
  process.exit(0)
}

console.log('Electron binary missing — downloading…')
console.log('  Node:', process.version)
console.log('  electron package:', electronRoot)

wipePartialDist()
delete process.env.ELECTRON_SKIP_BINARY_DOWNLOAD

const result = spawnSync(process.execPath, [installJs], {
  cwd: electronRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_SKIP_BINARY_DOWNLOAD: '',
    force_no_cache: 'true'
  },
  shell: false
})

if (result.status !== 0) {
  console.error('\nElectron download failed.')
  process.exit(result.status ?? 1)
}

if (!installed()) {
  console.error('\nElectron install finished but electron.exe / path.txt is still missing.')
  console.error('This is a known bug with Node 24.16+ and Node 26 on Windows.')
  console.error('Fix options:')
  console.error('  1) Install Node.js 22 LTS from https://nodejs.org/ then reinstall')
  console.error('  2) Or keep Node 26, ensure package.json has "overrides": { "yauzl": "3.3.1" },')
  console.error('     then delete node_modules + package-lock.json and run npm install again')
  process.exit(1)
}

console.log('Electron binary ready:', fs.readFileSync(pathTxt, 'utf8').trim())
