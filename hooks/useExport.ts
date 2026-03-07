'use client'

import { useState, useCallback, RefObject } from 'react'
import type { MoodboardImage, ExportResolutionKey } from './types'
import { EXPORT_RESOLUTIONS } from './types'

interface UseExportOptions {
  gridRef: RefObject<HTMLDivElement>
  imageCount: number
  images: MoodboardImage[]
  onError: (message: string) => void
}

interface UseExportReturn {
  isExporting: boolean
  selectedResolution: ExportResolutionKey
  setSelectedResolution: (resolution: ExportResolutionKey) => void
  showLabels: boolean
  setShowLabels: (show: boolean) => void
  handleExport: () => Promise<void>
}

// Calculate source rectangle for object-fit: cover behavior
// objectPositionX/Y are percentages (0-100), where 50 is center
function calculateCoverCrop(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
  objectPositionXPercent: number = 50,
  objectPositionYPercent: number = 50
): { sx: number; sy: number; sw: number; sh: number } {
  const imgRatio = imgWidth / imgHeight
  const containerRatio = containerWidth / containerHeight

  let sw: number, sh: number, sx: number, sy: number

  if (imgRatio > containerRatio) {
    // Image is wider - crop horizontally
    sh = imgHeight
    sw = imgHeight * containerRatio
    const maxOffsetX = imgWidth - sw
    // Convert object-position percentage to source x coordinate
    sx = (objectPositionXPercent / 100) * maxOffsetX
    sy = 0
  } else {
    // Image is taller - crop vertically
    sw = imgWidth
    sh = imgWidth / containerRatio
    sx = 0
    const maxOffsetY = imgHeight - sh
    // Convert object-position percentage to source y coordinate
    sy = (objectPositionYPercent / 100) * maxOffsetY
  }

  return { sx, sy, sw, sh }
}

// Calculate row and position labels for images based on grid positions
function calculatePositionLabels(images: MoodboardImage[]): Map<string, string> {
  const labels = new Map<string, string>()

  // Sort images by y (row) then x (position within row)
  const sorted = [...images].sort((a, b) => {
    // Group by approximate row (same y value means same row)
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })

  // Assign row numbers based on unique y values
  const rowMap = new Map<number, number>()
  let currentRow = 0
  let lastY = -1

  for (const img of sorted) {
    if (img.y !== lastY) {
      currentRow++
      rowMap.set(img.y, currentRow)
      lastY = img.y
    }
  }

  // Count positions within each row
  const rowPositionCount = new Map<number, number>()

  for (const img of sorted) {
    const row = rowMap.get(img.y) || 1
    const posCount = (rowPositionCount.get(img.y) || 0) + 1
    rowPositionCount.set(img.y, posCount)

    labels.set(img.i, `R${row}P${posCount}`)
  }

  return labels
}

export function useExport({ gridRef, imageCount, images, onError }: UseExportOptions): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [selectedResolution, setSelectedResolution] = useState<ExportResolutionKey>('uhd')
  const [showLabels, setShowLabels] = useState(false)

  const handleExport = useCallback(async () => {
    if (!gridRef.current || imageCount === 0) return

    setIsExporting(true)

    try {
      const gridContainer = gridRef.current
      const gridRect = gridContainer.getBoundingClientRect()

      // Get target resolution
      const targetRes = EXPORT_RESOLUTIONS[selectedResolution]

      // Find all grid items and their positions
      const gridItems = gridContainer.querySelectorAll('.grid-item')
      const allItems = Array.from(gridItems)

      // First pass: find tight content bounding box (excludes border/padding/gap offsets)
      let minDx = Infinity, minDy = Infinity, maxRight = 0, maxBottom = 0
      for (const gridItem of allItems) {
        const imgEl = gridItem.querySelector('img') as HTMLImageElement | null
        if (!imgEl) continue
        const r = imgEl.getBoundingClientRect()
        const left = r.left - gridRect.left
        const top = r.top - gridRect.top
        if (left < minDx) minDx = left
        if (top < minDy) minDy = top
        if (left + r.width > maxRight) maxRight = left + r.width
        if (top + r.height > maxBottom) maxBottom = top + r.height
      }

      if (minDx === Infinity) return

      const contentW = maxRight - minDx
      const contentH = maxBottom - minDy

      // Scale to target resolution width; height follows content (full bleed, no transparent border)
      const scale = targetRes.width / contentW

      const canvas = document.createElement('canvas')
      canvas.width = targetRes.width
      canvas.height = Math.round(contentH * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      // Scale context to target resolution
      ctx.scale(scale, scale)

      // Process each grid item
      for (const gridItem of allItems) {
        const imageId = gridItem.getAttribute('data-grid-id')
        const imgElement = gridItem.querySelector('img') as HTMLImageElement | null

        if (!imgElement || !imageId) continue

        // Get the image data from state for offset info
        const imageData = images.find(img => img.i === imageId)

        // Get position relative to content origin (no border/padding/gap offset)
        const itemRect = imgElement.getBoundingClientRect()
        const dx = itemRect.left - gridRect.left - minDx
        const dy = itemRect.top - gridRect.top - minDy
        const dw = itemRect.width
        const dh = itemRect.height

        try {
          // Use the EXISTING img element directly - it's already loaded!
          // No need to create a new Image() and reload from blob URL

          // Convert pixel offset to object-position percentage
          // This matches the logic in useImagePan's calculateObjectPosition
          const imgRatio = imgElement.naturalWidth / imgElement.naturalHeight
          const containerRatio = dw / dh

          let objectPositionXPercent = 50
          let objectPositionYPercent = 50

          if (imageData?.offset) {
            if (imgRatio > containerRatio) {
              // Image is wider - calculate horizontal pan
              const displayScaledWidth = dh * imgRatio
              const displayMaxOffset = displayScaledWidth - dw
              if (displayMaxOffset > 0) {
                // offset.x is in pixels, convert to percentage (50 = center)
                objectPositionXPercent = 50 + (imageData.offset.x / displayMaxOffset) * 100
              }
            } else {
              // Image is taller - calculate vertical pan
              const displayScaledHeight = dw / imgRatio
              const displayMaxOffset = displayScaledHeight - dh
              if (displayMaxOffset > 0) {
                // offset.y is in pixels, convert to percentage (50 = center)
                objectPositionYPercent = 50 + (imageData.offset.y / displayMaxOffset) * 100
              }
            }
          }

          // Calculate crop for object-fit: cover using object-position percentages
          const { sx, sy, sw, sh } = calculateCoverCrop(
            imgElement.naturalWidth,
            imgElement.naturalHeight,
            dw,
            dh,
            objectPositionXPercent,
            objectPositionYPercent
          )

          // Draw the image directly from the existing DOM element
          ctx.drawImage(imgElement, sx, sy, sw, sh, dx, dy, dw, dh)
        } catch (e) {
          console.warn(`Failed to draw image ${imageId}:`, e)
          // Draw placeholder for failed images
          ctx.fillStyle = '#333'
          ctx.fillRect(dx, dy, dw, dh)
        }
      }

      // Draw position labels if enabled
      if (showLabels) {
        const positionLabels = calculatePositionLabels(images)

        for (const gridItem of allItems) {
          const imageId = gridItem.getAttribute('data-grid-id')
          const imgElement = gridItem.querySelector('img') as HTMLImageElement | null

          if (!imgElement || !imageId) continue

          const label = positionLabels.get(imageId)
          if (!label) continue

          // Get position relative to content origin (no border/padding/gap offset)
          const itemRect = imgElement.getBoundingClientRect()
          const dx = itemRect.left - gridRect.left - minDx
          const dy = itemRect.top - gridRect.top - minDy
          const dh = itemRect.height

          // Calculate font size based on image height (responsive)
          const fontSize = Math.max(12, Math.min(24, dh * 0.12))
          const padding = fontSize * 0.4
          const labelX = dx + padding
          const labelY = dy + dh - padding

          // Measure text for background
          ctx.font = `bold ${fontSize}px Arial, sans-serif`
          const textMetrics = ctx.measureText(label)
          const textWidth = textMetrics.width
          const textHeight = fontSize

          // Draw semi-transparent background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx.fillRect(
            labelX - padding * 0.5,
            labelY - textHeight,
            textWidth + padding,
            textHeight + padding * 0.5
          )

          // Draw text
          ctx.fillStyle = 'white'
          ctx.fillText(label, labelX, labelY)
        }
      }

      // Download the canvas as PNG with resolution in filename
      const link = document.createElement('a')
      link.download = `moodboard-${selectedResolution}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

    } catch (error) {
      console.error('Export failed:', error)
      onError('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [gridRef, imageCount, images, onError, selectedResolution, showLabels])

  return { isExporting, selectedResolution, setSelectedResolution, showLabels, setShowLabels, handleExport }
}
