import { useEffect, useMemo, useState } from 'react'
import {
  CATEGORIES,
  type BulkDraftItem,
  type Category,
  type ClothingItem
} from '../../../shared/types'
import { mediaUrl } from '../lib/media'

interface Props {
  onClose: () => void
  onSaved: (items: ClothingItem[]) => void
  onToast: (message: string) => void
}

function draftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

export function BulkUploadModal({
  onClose,
  onSaved,
  onToast
}: Props): JSX.Element {
  const [drafts, setDrafts] = useState<BulkDraftItem[]>([])
  const [removeBgDefault, setRemoveBgDefault] = useState(true)
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'review' | 'saving'>(
    'idle'
  )
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const selectedCount = useMemo(
    () => drafts.filter((d) => d.selected && d.status === 'ready').length,
    [drafts]
  )

  useEffect(() => {
    void startPick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function patchDraft(id: string, patch: Partial<BulkDraftItem>): void {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  async function startPick(): Promise<void> {
    const paths = await window.atelier.pickImages()
    if (!paths.length) {
      onClose()
      return
    }

    const next: BulkDraftItem[] = paths.map((sourceImagePath) => ({
      id: draftId(),
      sourceImagePath,
      status: 'pending',
      selected: true,
      removeBackground: removeBgDefault,
      name: basename(sourceImagePath).replace(/\.[^.]+$/, ''),
      category: 'Other',
      colors: [],
      brand: '',
      notes: '',
      tags: []
    }))
    setDrafts(next)
    await analyzeAll(next)
  }

  async function analyzeAll(list: BulkDraftItem[]): Promise<void> {
    setPhase('analyzing')
    setProgress({ done: 0, total: list.length })

    const settings = await window.atelier.getSettings()
    if (!settings.openaiApiKey.trim()) {
      onToast('Add an OpenAI API key in Settings first')
      setPhase('review')
      setDrafts((prev) =>
        prev.map((d) => ({
          ...d,
          status: 'error',
          error: 'Missing OpenAI API key',
          selected: false
        }))
      )
      return
    }

    for (let i = 0; i < list.length; i++) {
      const draft = list[i]
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === draft.id ? { ...d, status: 'analyzing', error: undefined } : d
        )
      )
      try {
        const analysis = await window.atelier.analyzeImage(draft.sourceImagePath)
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draft.id
              ? {
                  ...d,
                  ...analysis,
                  status: 'ready',
                  selected: true,
                  error: undefined
                }
              : d
          )
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed'
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draft.id
              ? { ...d, status: 'error', error: message, selected: false }
              : d
          )
        )
      }
      setProgress({ done: i + 1, total: list.length })
    }
    setPhase('review')
  }

  async function saveSelected(): Promise<void> {
    const toSave = drafts.filter((d) => d.selected && d.status === 'ready')
    if (!toSave.length) {
      onToast('Select at least one analyzed item to save')
      return
    }

    setPhase('saving')
    setProgress({ done: 0, total: toSave.length })
    const saved: ClothingItem[] = []

    for (let i = 0; i < toSave.length; i++) {
      const draft = toSave[i]
      patchDraft(draft.id, { status: 'saving' })
      const result = await window.atelier.createItem({
        name: draft.name,
        category: draft.category,
        colors: draft.colors,
        brand: draft.brand,
        notes: draft.notes,
        tags: draft.tags,
        sourceImagePath: draft.sourceImagePath,
        removeBackground: draft.removeBackground
      })
      if (result.ok) {
        saved.push(result.item)
        patchDraft(draft.id, { status: 'saved', selected: false })
      } else if (result.item) {
        saved.push(result.item)
        patchDraft(draft.id, {
          status: 'saved',
          selected: false,
          error: result.error
        })
      } else {
        patchDraft(draft.id, { status: 'error', error: result.error })
      }
      setProgress({ done: i + 1, total: toSave.length })
    }

    if (saved.length) {
      onSaved(saved)
      onToast(
        saved.length === 1
          ? '1 item saved to wardrobe'
          : `${saved.length} items saved to wardrobe`
      )
      onClose()
    } else {
      setPhase('review')
      onToast('Nothing was saved')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal bulk-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Bulk upload</h3>
        <p className="bulk-lead">
          AI fills name, category, colors, brand, notes, and tags. Review before
          saving. Cutouts still use remove.bg when enabled.
        </p>

        {(phase === 'analyzing' || phase === 'saving') && (
          <div className="bulk-progress">
            <div className="bulk-progress-bar">
              <span
                style={{
                  width: `${
                    progress.total
                      ? Math.round((progress.done / progress.total) * 100)
                      : 0
                  }%`
                }}
              />
            </div>
            <div className="meta">
              {phase === 'analyzing' ? 'Analyzing' : 'Saving'} {progress.done} /{' '}
              {progress.total}
            </div>
          </div>
        )}

        <div className="bulk-toolbar">
          <label className="checkbox-row" style={{ marginTop: 0 }}>
            <input
              type="checkbox"
              checked={removeBgDefault}
              onChange={(e) => {
                const checked = e.target.checked
                setRemoveBgDefault(checked)
                setDrafts((prev) =>
                  prev.map((d) =>
                    d.status === 'saved' ? d : { ...d, removeBackground: checked }
                  )
                )
              }}
              disabled={phase === 'analyzing' || phase === 'saving'}
            />
            Remove backgrounds on save
          </label>
          <div className="actions">
            <button
              type="button"
              className="btn ghost"
              disabled={phase === 'analyzing' || phase === 'saving'}
              onClick={() =>
                setDrafts((prev) =>
                  prev.map((d) =>
                    d.status === 'ready' ? { ...d, selected: true } : d
                  )
                )
              }
            >
              Select ready
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={phase === 'analyzing' || phase === 'saving'}
              onClick={() =>
                setDrafts((prev) => prev.map((d) => ({ ...d, selected: false })))
              }
            >
              Clear selection
            </button>
          </div>
        </div>

        <div className="bulk-list">
          {drafts.map((draft) => (
            <article
              key={draft.id}
              className={`bulk-row ${draft.selected ? 'selected' : ''}`}
            >
              <label className="bulk-select">
                <input
                  type="checkbox"
                  checked={draft.selected}
                  disabled={draft.status !== 'ready' || phase === 'saving'}
                  onChange={(e) =>
                    patchDraft(draft.id, { selected: e.target.checked })
                  }
                />
              </label>
              <div className="bulk-thumb">
                <img src={mediaUrl(draft.sourceImagePath)} alt="" />
              </div>
              <div className="bulk-fields">
                <div className="bulk-status meta">
                  {draft.status === 'analyzing' && 'Analyzing…'}
                  {draft.status === 'pending' && 'Waiting…'}
                  {draft.status === 'ready' && 'Ready'}
                  {draft.status === 'saving' && 'Saving…'}
                  {draft.status === 'saved' && 'Saved'}
                  {draft.status === 'error' && (draft.error || 'Error')}
                </div>
                <div className="form-grid">
                  <div className="field span-2">
                    <label>Name</label>
                    <input
                      value={draft.name}
                      disabled={phase === 'analyzing' || phase === 'saving'}
                      onChange={(e) =>
                        patchDraft(draft.id, { name: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Category</label>
                    <select
                      value={draft.category}
                      disabled={phase === 'analyzing' || phase === 'saving'}
                      onChange={(e) =>
                        patchDraft(draft.id, {
                          category: e.target.value as Category
                        })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Brand</label>
                    <input
                      value={draft.brand}
                      disabled={phase === 'analyzing' || phase === 'saving'}
                      onChange={(e) =>
                        patchDraft(draft.id, { brand: e.target.value })
                      }
                    />
                  </div>
                  <div className="field span-2">
                    <label>Colors</label>
                    <input
                      value={draft.colors.join(', ')}
                      disabled={phase === 'analyzing' || phase === 'saving'}
                      onChange={(e) =>
                        patchDraft(draft.id, {
                          colors: e.target.value
                            .split(',')
                            .map((c) => c.trim())
                            .filter(Boolean)
                        })
                      }
                    />
                  </div>
                  <div className="field span-2">
                    <label>Tags</label>
                    <input
                      value={draft.tags.join(', ')}
                      disabled={phase === 'analyzing' || phase === 'saving'}
                      onChange={(e) =>
                        patchDraft(draft.id, {
                          tags: e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean)
                        })
                      }
                    />
                  </div>
                  <div className="field span-2">
                    <label>Notes</label>
                    <input
                      value={draft.notes}
                      disabled={phase === 'analyzing' || phase === 'saving'}
                      onChange={(e) =>
                        patchDraft(draft.id, { notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            disabled={phase === 'saving'}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={phase !== 'review' || selectedCount === 0}
            onClick={() => void saveSelected()}
          >
            Save {selectedCount || ''} selected
          </button>
        </div>
      </div>
    </div>
  )
}
