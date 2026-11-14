import { FormEvent, useEffect, useState } from 'react'
import type { AppSettings } from '../../../shared/types'

interface Props {
  onToast: (message: string) => void
}

export function SettingsView({ onToast }: Props): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [removeBgApiKey, setRemoveBgApiKey] = useState('')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.atelier.getSettings().then((s) => {
      setSettings(s)
      setRemoveBgApiKey(s.removeBgApiKey)
      setOpenaiApiKey(s.openaiApiKey)
    })
  }, [])

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    try {
      const next = await window.atelier.saveSettings({
        removeBgApiKey: removeBgApiKey.trim(),
        openaiApiKey: openaiApiKey.trim()
      })
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
          <p>API keys for cutouts and AI bulk upload, plus your library path.</p>
        </div>
      </div>

      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="settings-card">
          <h3>remove.bg</h3>
          <p>
            Background removal for single and bulk imports. Photos stay on this
            machine; only cutout requests go to the API.
          </p>
          <div className="field">
            <label htmlFor="removeBgKey">API key</label>
            <input
              id="removeBgKey"
              type="password"
              value={removeBgApiKey}
              onChange={(e) => setRemoveBgApiKey(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="settings-card" style={{ marginTop: '1rem' }}>
          <h3>OpenAI</h3>
          <p>
            Used by bulk upload to suggest name, category, colors, brand, notes,
            and tags from each photo (<code>gpt-4o-mini</code> vision).
          </p>
          <div className="field">
            <label htmlFor="openaiKey">API key</label>
            <input
              id="openaiKey"
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save keys'}
          </button>
        </div>
      </form>

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
