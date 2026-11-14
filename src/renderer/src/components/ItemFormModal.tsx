import { FormEvent, useState } from 'react'
import { CATEGORIES, type Category, type ClothingItem } from '../../../shared/types'
import { mediaUrl, itemImagePath } from '../lib/media'

interface Props {
  initial?: ClothingItem | null
  onClose: () => void
  onSaved: (item: ClothingItem, warning?: string) => void
}

export function ItemFormModal({ initial, onClose, onSaved }: Props): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Top')
  const [colors, setColors] = useState((initial?.colors ?? []).join(', '))
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [removeBg, setRemoveBg] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = sourcePath
    ? mediaUrl(sourcePath)
    : initial
      ? mediaUrl(itemImagePath(initial))
      : ''

  async function pickFile(): Promise<void> {
    const path = await window.atelier.pickImage()
    if (path) setSourcePath(path)
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    if (!initial && !sourcePath) {
      setError('Choose a photo for this item.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        name,
        category,
        colors: colors
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        brand,
        notes,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        removeBackground: removeBg
      }

      const result = initial
        ? await window.atelier.updateItem({
            id: initial.id,
            ...payload,
            sourceImagePath: sourcePath ?? undefined,
            removeBackground: sourcePath ? removeBg : undefined
          })
        : await window.atelier.createItem({
            ...payload,
            sourceImagePath: sourcePath!
          })

      if (!result.ok) {
        if (result.item) {
          onSaved(result.item, result.error)
          return
        }
        setError(result.error)
        return
      }

      onSaved(result.item)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save item')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{initial ? 'Edit item' : 'Add clothing'}</h3>
        <form onSubmit={onSubmit}>
          <div className="preview-row span-2" style={{ marginBottom: '1rem' }}>
            <div className="thumb">
              {preview ? <img src={preview} alt="" /> : <span className="meta">No photo</span>}
            </div>
            <div>
              <button type="button" className="btn" onClick={() => void pickFile()}>
                {sourcePath || initial ? 'Replace photo' : 'Choose photo'}
              </button>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                />
                Remove background with remove.bg
              </label>
            </div>
          </div>

          <div className="form-grid">
            <div className="field span-2">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Linen shirt"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="brand">Brand</label>
              <input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="field span-2">
              <label htmlFor="colors">Colors</label>
              <input
                id="colors"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="Ivory, olive"
              />
            </div>
            <div className="field span-2">
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="summer, favorite"
              />
            </div>
            <div className="field span-2">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fit, fabric, care…"
              />
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
