import { useMemo, useState } from 'react'
import { CATEGORIES, type Category, type ClothingItem } from '../../../shared/types'
import { itemImagePath, mediaUrl } from '../lib/media'
import { ItemFormModal } from './ItemFormModal'

interface Props {
  items: ClothingItem[]
  onChange: (items: ClothingItem[]) => void
  onToast: (message: string) => void
}

export function WardrobeView({ items, onChange, onToast }: Props): JSX.Element {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [color, setColor] = useState('')
  const [brand, setBrand] = useState('')
  const [editing, setEditing] = useState<ClothingItem | null | undefined>(undefined)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const colorQ = color.trim().toLowerCase()
    const brandQ = brand.trim().toLowerCase()
    return items.filter((item) => {
      if (category && item.category !== category) return false
      if (brandQ && !item.brand.toLowerCase().includes(brandQ)) return false
      if (
        colorQ &&
        !item.colors.some((c) => c.toLowerCase().includes(colorQ))
      ) {
        return false
      }
      if (!q) return true
      const hay = [
        item.name,
        item.brand,
        item.notes,
        item.category,
        ...item.colors,
        ...item.tags
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [items, query, category, color, brand])

  async function handleDelete(item: ClothingItem): Promise<void> {
    if (!confirm(`Delete “${item.name}”?`)) return
    await window.atelier.deleteItem(item.id)
    onChange(items.filter((i) => i.id !== item.id))
    onToast('Item deleted')
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Wardrobe</h2>
          <p>Catalogue pieces with cutouts, colors, brand, and notes.</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setEditing(null)}>
            Add clothing
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="q">Search</label>
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, tag, note…"
          />
        </div>
        <div className="field">
          <label htmlFor="cat">Category</label>
          <select
            id="cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | '')}
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="color">Color</label>
          <input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Any"
          />
        </div>
        <div className="field">
          <label htmlFor="brand">Brand</label>
          <input
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Any"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">No pieces yet — add your first item.</div>
      ) : (
        <div className="item-grid">
          {filtered.map((item) => (
            <article key={item.id} className="item-tile">
              <button
                type="button"
                className="thumb"
                onClick={() => setEditing(item)}
                aria-label={`Edit ${item.name}`}
              >
                <img src={mediaUrl(itemImagePath(item))} alt="" />
              </button>
              <div>
                <h3>{item.name}</h3>
                <div className="meta">
                  {item.category}
                  {item.brand ? ` · ${item.brand}` : ''}
                  {item.colors.length ? ` · ${item.colors.join(', ')}` : ''}
                </div>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => setEditing(item)}>
                  Edit
                </button>
                <button
                  className="btn danger"
                  onClick={() => void handleDelete(item)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <ItemFormModal
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(item, warning) => {
            const exists = items.some((i) => i.id === item.id)
            onChange(
              exists
                ? items.map((i) => (i.id === item.id ? item : i))
                : [item, ...items]
            )
            setEditing(undefined)
            onToast(warning ? `Saved without cutout: ${warning}` : 'Item saved')
          }}
        />
      )}
    </section>
  )
}
