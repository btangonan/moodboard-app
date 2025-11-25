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
