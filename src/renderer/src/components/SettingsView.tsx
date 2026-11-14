import { FormEvent, useEffect, useState } from 'react'
import type { AppSettings } from '../../../shared/types'

interface Props {
  onToast: (message: string) => void
}

export function SettingsView({ onToast }: Props): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.atelier.getSettings().then((s) => {
      setSettings(s)
      setApiKey(s.removeBgApiKey)
    })
  }, [])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    try {
      const next = await window.atelier.setApiKey(apiKey.trim())
      setSettings(next)
      onToast('Settings saved')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>API key for cutouts and where Atelier keeps your library.</p>
        </div>
      </div>

      <div className="settings-card">
        <h3>remove.bg</h3>
        <p>
          Background removal runs through remove.bg. Create a key at remove.bg,
          then paste it here. Photos stay on this machine; only cutout requests
          go to the API.
        </p>
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="apiKey">API key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
            />
          </div>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save key'}
            </button>
          </div>
        </form>
      </div>

      <div className="settings-card" style={{ marginTop: '1rem' }}>
        <h3>Local library</h3>
        <p>SQLite database and images live under your Windows user profile.</p>
        <div className="path-box">{settings?.dataPath ?? 'Loading…'}</div>
        {settings?.dataPath && (
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button
              type="button"
              className="btn"
              onClick={() => void window.atelier.openPath(settings.dataPath)}
            >
              Open folder
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
