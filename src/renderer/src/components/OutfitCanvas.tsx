import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva'
import type Konva from 'konva'
import {
  OCCASIONS,
  VIBES,
  type CanvasPlacement,
  type ClothingItem,
  type Occasion,
  type Outfit,
  type Vibe
} from '../../../shared/types'
import { itemImagePath, mediaUrl } from '../lib/media'

interface BoardItem extends CanvasPlacement {
  image: HTMLImageElement
}

interface Props {
  items: ClothingItem[]
  initial?: Outfit | null
  onClose: () => void
  onSaved: (outfit: Outfit) => void
  onToast: (message: string) => void
}

function useLoadedImage(src: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }
    const img = new window.Image()
    img.onload = () => setImage(img)
    img.onerror = () => setImage(null)
    img.src = src
  }, [src])
  return image
}

function PlacedItem({
  node,
  selected,
  onSelect,
  onChange
}: {
  node: BoardItem
  selected: boolean
  onSelect: () => void
  onChange: (next: Partial<CanvasPlacement>) => void
}): JSX.Element {
  const shapeRef = useRef<Konva.Image>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (selected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [selected])

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={node.image}
        x={node.x}
        y={node.y}
        scaleX={node.scaleX}
        scaleY={node.scaleY}
        rotation={node.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() })
        }}
        onTransformEnd={() => {
          const nodeEl = shapeRef.current
          if (!nodeEl) return
          onChange({
            x: nodeEl.x(),
            y: nodeEl.y(),
            rotation: nodeEl.rotation(),
            scaleX: nodeEl.scaleX(),
            scaleY: nodeEl.scaleY()
          })
        }}
      />
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right'
          ]}
        />
      )}
    </>
  )
}

export function OutfitCanvas({
  items,
  initial,
  onClose,
  onSaved,
  onToast
}: Props): JSX.Element {
  const stageRef = useRef<Konva.Stage>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 640 })
  const [name, setName] = useState(initial?.name ?? '')
  const [occasion, setOccasion] = useState<Occasion>(initial?.occasion ?? 'Daily')
  const [vibe, setVibe] = useState<Vibe>(initial?.vibe ?? 'Classic')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [placements, setPlacements] = useState<CanvasPlacement[]>(
    initial?.placements ?? []
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [trayQuery, setTrayQuery] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({
        width: el.clientWidth,
        height: Math.max(560, el.clientHeight)
      })
    })
    ro.observe(el)
    setSize({
      width: el.clientWidth,
      height: Math.max(560, el.clientHeight)
    })
    return () => ro.disconnect()
  }, [])

  const itemMap = useMemo(() => {
    const map = new Map<string, ClothingItem>()
    for (const item of items) map.set(item.id, item)
    return map
  }, [items])

  const trayItems = useMemo(() => {
    const q = trayQuery.trim().toLowerCase()
    return items.filter((item) => {
      if (!q) return true
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
      )
    })
  }, [items, trayQuery])

  function addItem(item: ClothingItem): void {
    if (placements.some((p) => p.itemId === item.id)) {
      setSelectedId(item.id)
      return
    }
    const nextZ =
      placements.reduce((max, p) => Math.max(max, p.zIndex), 0) + 1
    setPlacements((prev) => [
      ...prev,
      {
        itemId: item.id,
        x: 80 + (prev.length % 5) * 36,
        y: 80 + (prev.length % 4) * 36,
        scaleX: 0.45,
        scaleY: 0.45,
        rotation: 0,
        zIndex: nextZ
      }
    ])
    setSelectedId(item.id)
  }

  function updatePlacement(itemId: string, patch: Partial<CanvasPlacement>): void {
    setPlacements((prev) =>
      prev.map((p) => (p.itemId === itemId ? { ...p, ...patch } : p))
    )
  }

  function removeSelected(): void {
    if (!selectedId) return
    setPlacements((prev) => prev.filter((p) => p.itemId !== selectedId))
    setSelectedId(null)
  }

  function bringForward(): void {
    if (!selectedId) return
    setPlacements((prev) => {
      const max = prev.reduce((m, p) => Math.max(m, p.zIndex), 0)
      return prev.map((p) =>
        p.itemId === selectedId ? { ...p, zIndex: max + 1 } : p
      )
    })
  }

  function captureThumbnail(): string | null {
    const stage = stageRef.current
    if (!stage) return null
    const transformers = stage.find('Transformer')
    transformers.forEach((node) => node.visible(false))
    const dataUrl = stage.toDataURL({ pixelRatio: 2 })
    transformers.forEach((node) => node.visible(true))
    return dataUrl
  }

  async function saveOutfit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    try {
      const thumbnailDataUrl = captureThumbnail()
      const payload = {
        name,
        occasion,
        vibe,
        notes,
        placements,
        thumbnailDataUrl
      }
      const outfit = initial
        ? await window.atelier.updateOutfit({ id: initial.id, ...payload })
        : await window.atelier.createOutfit(payload)
      onSaved(outfit)
      onToast('Outfit saved')
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not save outfit')
    } finally {
      setBusy(false)
    }
  }

  async function exportPng(): Promise<void> {
    const dataUrl = captureThumbnail()
    if (!dataUrl) return
    const path = await window.atelier.pickSavePng(
      `${name.trim() || 'outfit'}.png`
    )
    if (!path) return
    await window.atelier.writeExportedPng(path, dataUrl)
    onToast('Outfit exported')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 'min(1200px, 100%)', maxHeight: '95vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{initial ? 'Edit outfit' : 'Plan outfit'}</h3>
        <div className="canvas-layout">
          <aside className="tray">
            <h4>Wardrobe</h4>
            <div className="field" style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="tray-q">Find</label>
              <input
                id="tray-q"
                value={trayQuery}
                onChange={(e) => setTrayQuery(e.target.value)}
                placeholder="Filter pieces"
              />
            </div>
            {trayItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tray-item ${
                  placements.some((p) => p.itemId === item.id) ? 'active' : ''
                }`}
                onClick={() => addItem(item)}
              >
                <img src={mediaUrl(itemImagePath(item))} alt="" />
                <span>
                  <strong>{item.name}</strong>
                  <div className="meta">{item.category}</div>
                </span>
              </button>
            ))}
          </aside>

          <div className="board-wrap" ref={boardRef}>
            {placements.length === 0 && (
              <div className="board-hint">Click pieces in the tray to place them</div>
            )}
            <Stage
              ref={stageRef}
              width={size.width}
              height={size.height}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null)
              }}
            >
              <Layer>
                {[...placements]
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((placement) => (
                    <BoardImage
                      key={placement.itemId}
                      placement={placement}
                      item={itemMap.get(placement.itemId)}
                      selected={selectedId === placement.itemId}
                      onSelect={() => setSelectedId(placement.itemId)}
                      onChange={(patch) =>
                        updatePlacement(placement.itemId, patch)
                      }
                    />
                  ))}
              </Layer>
            </Stage>
          </div>

          <aside className="side-panel">
            <h4>Details</h4>
            <form onSubmit={(e) => void saveOutfit(e)}>
              <div className="field">
                <label htmlFor="outfit-name">Name</label>
                <input
                  id="outfit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="occasion">Occasion</label>
                <select
                  id="occasion"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value as Occasion)}
                >
                  {OCCASIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="vibe">Vibe</label>
                <select
                  id="vibe"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value as Vibe)}
                >
                  {VIBES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="outfit-notes">Notes</label>
                <textarea
                  id="outfit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="actions" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={bringForward}
                  disabled={!selectedId}
                >
                  Bring forward
                </button>
                <button
                  type="button"
                  className="btn danger"
                  onClick={removeSelected}
                  disabled={!selectedId}
                >
                  Remove
                </button>
              </div>

              <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
                <button type="button" className="btn ghost" onClick={onClose}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void exportPng()}
                  disabled={placements.length === 0}
                >
                  Export PNG
                </button>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save outfit'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </div>
  )
}

function BoardImage({
  placement,
  item,
  selected,
  onSelect,
  onChange
}: {
  placement: CanvasPlacement
  item?: ClothingItem
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<CanvasPlacement>) => void
}): JSX.Element | null {
  const src = item ? mediaUrl(itemImagePath(item)) : ''
  const image = useLoadedImage(src)
  if (!image) return null
  return (
    <PlacedItem
      node={{ ...placement, image }}
      selected={selected}
      onSelect={onSelect}
      onChange={onChange}
    />
  )
}
