export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('data:') || path.startsWith('atelier://')) return path
  if (typeof window !== 'undefined' && window.atelier?.toMediaUrl) {
    return window.atelier.toMediaUrl(path)
  }
  return path
}

export function itemImagePath(item: {
  cutoutPath: string | null
  originalPath: string
}): string {
  return item.cutoutPath || item.originalPath
}
