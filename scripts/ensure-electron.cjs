/**
 * Ensure the Electron binary is present. npm may skip electron's postinstall
 * (allowScripts) or ELECTRON_SKIP_BINARY_DOWNLOAD may leave path.txt missing.
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

if (installed()) {
  console.log('Electron binary OK:', fs.readFileSync(pathTxt, 'utf8').trim())
  process.exit(0)
}

console.log('Electron binary missing — downloading…')
console.log('  electron package:', electronRoot)

// Clear a half-installed tree so install.js does not exit early.
for (const target of [pathTxt, path.join(distDir, 'version')]) {
  try {
    fs.unlinkSync(target)
  } catch {
    // ignore
  }
}

delete process.env.ELECTRON_SKIP_BINARY_DOWNLOAD

const result = spawnSync(process.execPath, [installJs], {
  cwd: electronRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_SKIP_BINARY_DOWNLOAD: '',
    force_no_cache: process.env.force_no_cache || 'false'
  },
  shell: false
})

if (result.status !== 0) {
  console.error('\nElectron download failed.')
  console.error('Check your network, or unset ELECTRON_SKIP_BINARY_DOWNLOAD if it is set.')
  process.exit(result.status ?? 1)
}

if (!installed()) {
  console.error('\nElectron install finished but path.txt / dist executable is still missing.')
  console.error('Expected:', pathTxt)
  console.error('Contents of electron folder:')
  try {
    console.error(fs.readdirSync(electronRoot).join(', '))
  } catch (err) {
    console.error(err)
  }
  process.exit(1)
}

console.log('Electron binary ready:', fs.readFileSync(pathTxt, 'utf8').trim())
