export const CATEGORIES = [
  'Top',
  'Bottom',
  'Dress',
  'Outerwear',
  'Shoes',
  'Bag',
  'Accessory',
  'Other'
] as const

export type Category = (typeof CATEGORIES)[number]

export const OCCASIONS = [
  'Daily',
  'Work',
  'Party',
  'Formal',
  'Travel',
  'Other'
] as const

export type Occasion = (typeof OCCASIONS)[number]

export const VIBES = [
  'Classic',
  'Bohemian',
  'Preppy',
  'Feminine',
  'Minimal',
  'Street',
  'Other'
] as const

export type Vibe = (typeof VIBES)[number]

export interface ClothingItem {
  id: string
  name: string
  category: Category
  colors: string[]
  brand: string
  notes: string
  tags: string[]
  originalPath: string
  cutoutPath: string | null
  createdAt: string
  updatedAt: string
}

export interface ClothingItemInput {
  name: string
  category: Category
  colors: string[]
  brand: string
  notes: string
  tags: string[]
  sourceImagePath: string
  removeBackground: boolean
}

export interface ClothingItemUpdate {
  id: string
  name: string
  category: Category
  colors: string[]
  brand: string
  notes: string
  tags: string[]
  sourceImagePath?: string
  removeBackground?: boolean
}

export interface CanvasPlacement {
  itemId: string
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  zIndex: number
}

export interface Outfit {
  id: string
  name: string
  occasion: Occasion
  vibe: Vibe
  notes: string
  placements: CanvasPlacement[]
  thumbnailPath: string | null
  createdAt: string
  updatedAt: string
}

export interface OutfitInput {
  name: string
  occasion: Occasion
  vibe: Vibe
  notes: string
  placements: CanvasPlacement[]
  thumbnailDataUrl?: string | null
}

export interface OutfitUpdate extends OutfitInput {
  id: string
}

export interface AppSettings {
  removeBgApiKey: string
  dataPath: string
}

export interface ItemFilters {
  query?: string
  category?: Category | ''
  color?: string
  brand?: string
}

export interface OutfitFilters {
  query?: string
  occasion?: Occasion | ''
  vibe?: Vibe | ''
}
