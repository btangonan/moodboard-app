export interface MoodboardImage {
  src: string
  i: string
  w: number
  h: number
  x: number
  y: number
  offset?: {
    x: number
    y: number
  }
}

export interface DragInfo {
  imageId: string
  startX: number
  startY: number
  currentOffset: { x: number; y: number }
  maxOffset: { x: number; y: number }
}

// Export resolution presets (16:9 aspect ratio)
export type ExportResolutionKey = 'hd' | 'uhd' | '6k'

export interface ExportResolution {
  key: ExportResolutionKey
  label: string
  width: number
  height: number
}

export const EXPORT_RESOLUTIONS: Record<ExportResolutionKey, ExportResolution> = {
  hd: { key: 'hd', label: 'HD (1920×1080)', width: 1920, height: 1080 },
  uhd: { key: 'uhd', label: 'Ultra HD (3840×2160)', width: 3840, height: 2160 },
  '6k': { key: '6k', label: '6K (6144×3456)', width: 6144, height: 3456 }
}

// Canvas constants (16:9 base dimensions for editing)
export const CANVAS_ASPECT_RATIO = 16 / 9
export const BASE_CANVAS_WIDTH = 1920
export const BASE_CANVAS_HEIGHT = 1080
