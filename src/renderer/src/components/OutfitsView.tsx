import { useMemo, useState } from 'react'
import {
  OCCASIONS,
  VIBES,
  type ClothingItem,
  type Occasion,
  type Outfit,
  type Vibe
} from '../../../shared/types'
import { mediaUrl } from '../lib/media'
import { OutfitCanvas } from './OutfitCanvas'

interface Props {
  items: ClothingItem[]
  outfits: Outfit[]
  onChange: (outfits: Outfit[]) => void
  onToast: (message: string) => void
}

export function OutfitsView({
  items,
  outfits,
  onChange,
  onToast
}: Props): JSX.Element {
  const [query, setQuery] = useState('')
  const [occasion, setOccasion] = useState<Occasion | ''>('')
  const [vibe, setVibe] = useState<Vibe | ''>('')
  const [editing, setEditing] = useState<Outfit | null | undefined>(undefined)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return outfits.filter((outfit) => {
      if (occasion && outfit.occasion !== occasion) return false
      if (vibe && outfit.vibe !== vibe) return false
      if (!q) return true
      const hay = `${outfit.name} ${outfit.notes} ${outfit.occasion} ${outfit.vibe}`.toLowerCase()
      return hay.includes(q)
    })
  }, [outfits, query, occasion, vibe])

  async function handleDelete(outfit: Outfit): Promise<void> {
    if (!confirm(`Delete outfit “${outfit.name}”?`)) return
    await window.atelier.deleteOutfit(outfit.id)
    onChange(outfits.filter((o) => o.id !== outfit.id))
    onToast('Outfit deleted')
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Outfits</h2>
          <p>Compose moodboards, then save by occasion and vibe.</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setEditing(null)}>
            Plan outfit
          </button>
        </div>
      </div>

      <div className="filters" style={{ gridTemplateColumns: '1.4fr 1fr 1fr' }}>
        <div className="field">
          <label htmlFor="oq">Search</label>
          <input
            id="oq"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or notes…"
          />
        </div>
        <div className="field">
          <label htmlFor="occ">Occasion</label>
          <select
            id="occ"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value as Occasion | '')}
          >
            <option value="">All</option>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="vb">Vibe</label>
          <select
            id="vb"
            value={vibe}
            onChange={(e) => setVibe(e.target.value as Vibe | '')}
          >
            <option value="">All</option>
            {VIBES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">No outfits saved yet.</div>
      ) : (
        <div className="outfit-grid">
          {filtered.map((outfit) => (
            <article key={outfit.id} className="outfit-tile">
              <button
                type="button"
                className="thumb"
                onClick={() => setEditing(outfit)}
                aria-label={`Open ${outfit.name}`}
              >
                {outfit.thumbnailPath ? (
                  <img src={mediaUrl(outfit.thumbnailPath)} alt="" />
                ) : (
                  <span className="meta">No preview</span>
                )}
              </button>
              <div>
                <h3>{outfit.name}</h3>
                <div className="meta">
                  {outfit.occasion} · {outfit.vibe}
                </div>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => setEditing(outfit)}>
                  Edit
                </button>
                <button
                  className="btn danger"
                  onClick={() => void handleDelete(outfit)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <OutfitCanvas
          items={items}
          initial={editing}
          onClose={() => setEditing(undefined)}
          onToast={onToast}
          onSaved={(outfit) => {
            const exists = outfits.some((o) => o.id === outfit.id)
            onChange(
              exists
                ? outfits.map((o) => (o.id === outfit.id ? outfit : o))
                : [outfit, ...outfits]
            )
            setEditing(undefined)
          }}
        />
      )}
    </section>
  )
}
