import { useEffect, useState } from 'react'
import type { ClothingItem, Outfit } from '../../shared/types'
import { WardrobeView } from './components/WardrobeView'
import { OutfitsView } from './components/OutfitsView'
import { SettingsView } from './components/SettingsView'
import { Toast } from './components/Toast'

type Tab = 'wardrobe' | 'outfits' | 'settings'

export default function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('wardrobe')
  const [items, setItems] = useState<ClothingItem[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const [nextItems, nextOutfits] = await Promise.all([
        window.atelier.listItems(),
        window.atelier.listOutfits()
      ])
      setItems(nextItems)
      setOutfits(nextOutfits)
    })()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  return (
    <div className="app-shell">
      <aside className="brand-panel">
        <div className="brand-mark">
          <h1>Atelier</h1>
          <p>Wardrobe & outfits</p>
        </div>
        <nav className="nav">
          <button
            className={tab === 'wardrobe' ? 'active' : ''}
            onClick={() => setTab('wardrobe')}
          >
            Wardrobe
          </button>
          <button
            className={tab === 'outfits' ? 'active' : ''}
            onClick={() => setTab('outfits')}
          >
            Outfits
          </button>
          <button
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            Settings
          </button>
        </nav>
      </aside>

      <main className="main-panel">
        {tab === 'wardrobe' && (
          <WardrobeView
            items={items}
            onChange={setItems}
            onToast={setToast}
          />
        )}
        {tab === 'outfits' && (
          <OutfitsView
            items={items}
            outfits={outfits}
            onChange={setOutfits}
            onToast={setToast}
          />
        )}
        {tab === 'settings' && <SettingsView onToast={setToast} />}
      </main>

      <Toast message={toast} />
    </div>
  )
}
