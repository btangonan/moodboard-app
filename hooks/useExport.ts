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

export function useExport({ gridRef, imageCount, images, onError }: UseExportOptions): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [selectedResolution, setSelectedResolution] = useState<ExportResolutionKey>('uhd')

  const handleExport = useCallback(async () => {
    if (!gridRef.current || imageCount === 0) return

    setIsExporting(true)

    try {
      const gridContainer = gridRef.current
      const gridRect = gridContainer.getBoundingClientRect()

      // Get target resolution
      const targetRes = EXPORT_RESOLUTIONS[selectedResolution]

      // Calculate scale factor to reach target resolution
      // Scale based on width to maintain aspect ratio
      const scale = targetRes.width / gridRect.width

      const canvas = document.createElement('canvas')
      canvas.width = targetRes.width
      canvas.height = targetRes.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      // Scale context to target resolution
      ctx.scale(scale, scale)

      // Find all grid items and their positions
      const gridItems = gridContainer.querySelectorAll('.grid-item')

      // Process each grid item
      for (const gridItem of Array.from(gridItems)) {
        const imageId = gridItem.getAttribute('data-grid-id')
        const imgElement = gridItem.querySelector('img') as HTMLImageElement | null

        if (!imgElement || !imageId) continue

        // Get the image data from state for offset info
        const imageData = images.find(img => img.i === imageId)

        // Get position relative to grid container
        const itemRect = imgElement.getBoundingClientRect()
        const dx = itemRect.left - gridRect.left
        const dy = itemRect.top - gridRect.top
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
  }, [gridRef, imageCount, images, onError, selectedResolution])

  return { isExporting, selectedResolution, setSelectedResolution, handleExport }
}
